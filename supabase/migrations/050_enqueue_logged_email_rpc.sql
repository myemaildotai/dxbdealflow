-- Migration: 050_enqueue_logged_email_rpc.sql
-- Goal: Create enqueue_logged_email RPC for single-roundtrip enqueuing

CREATE OR REPLACE FUNCTION public.enqueue_logged_email(
  p_email_type TEXT,
  p_recipient_email TEXT,
  p_recipient_user_id UUID,
  p_related_entity_type TEXT,
  p_related_entity_id TEXT,
  p_template_subject TEXT,
  p_template_html TEXT,
  p_template_text TEXT,
  p_reply_to TEXT,
  p_metadata JSONB,
  p_event_key TEXT,
  p_enqueue BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_event_status TEXT;
  v_log_id UUID;
  v_metadata JSONB;
  v_cast_related_entity_id UUID;
BEGIN
  -- Normalize inputs
  v_metadata := COALESCE(p_metadata, '{}'::jsonb);

  -- Cast related_entity_id to UUID if valid
  IF p_related_entity_id IS NOT NULL AND p_related_entity_id <> '' THEN
    BEGIN
      v_cast_related_entity_id := p_related_entity_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'ok', false,
        'status', 'failed',
        'error', 'Invalid related entity ID format: ' || p_related_entity_id
      );
    END;
  ELSE
    v_cast_related_entity_id := NULL;
  END IF;

  -- 1. Validate email event key
  IF p_event_key IS NULL OR TRIM(p_event_key) = '' THEN
    INSERT INTO public.email_logs (
      email_type,
      recipient_email,
      recipient_user_id,
      related_entity_type,
      related_entity_id,
      status,
      failure_reason,
      metadata
    ) VALUES (
      p_email_type,
      p_recipient_email,
      p_recipient_user_id,
      p_related_entity_type,
      v_cast_related_entity_id,
      'failed',
      'Email event key is required.',
      v_metadata
    ) RETURNING id INTO v_log_id;

    RETURN jsonb_build_object(
      'ok', false,
      'status', 'failed',
      'log_id', v_log_id,
      'error', 'Email event key is required.'
    );
  END IF;

  -- 2. Deduplicate check on email_events using p_event_key
  BEGIN
    INSERT INTO public.email_events (
      event_key,
      email_type,
      recipient_email,
      recipient_user_id,
      related_entity_type,
      related_entity_id,
      status,
      metadata
    ) VALUES (
      p_event_key,
      p_email_type,
      p_recipient_email,
      p_recipient_user_id,
      p_related_entity_type,
      v_cast_related_entity_id,
      'pending',
      v_metadata
    ) RETURNING id, status INTO v_event_id, v_event_status;
  EXCEPTION WHEN unique_violation THEN
    -- Get existing event
    SELECT id, status INTO v_event_id, v_event_status
    FROM public.email_events
    WHERE event_key = p_event_key;

    IF v_event_status = 'sent' THEN
      RETURN jsonb_build_object(
        'ok', true,
        'status', 'sent',
        'event_id', v_event_id,
        'skipped', true
      );
    ELSIF v_event_status = 'failed' OR v_event_status = 'skipped' THEN
      -- Delete failed or skipped event reservation to retry
      DELETE FROM public.email_events
      WHERE id = v_event_id AND status <> 'sent';

      -- Try inserting again
      BEGIN
        INSERT INTO public.email_events (
          event_key,
          email_type,
          recipient_email,
          recipient_user_id,
          related_entity_type,
          related_entity_id,
          status,
          metadata
        ) VALUES (
          p_event_key,
          p_email_type,
          p_recipient_email,
          p_recipient_user_id,
          p_related_entity_type,
          v_cast_related_entity_id,
          'pending',
          v_metadata
        ) RETURNING id, status INTO v_event_id, v_event_status;
      EXCEPTION WHEN unique_violation THEN
        -- If still blocked, check status again
        SELECT id, status INTO v_event_id, v_event_status
        FROM public.email_events
        WHERE event_key = p_event_key;

        INSERT INTO public.email_logs (
          email_type,
          recipient_email,
          recipient_user_id,
          related_entity_type,
          related_entity_id,
          status,
          failure_reason,
          metadata
        ) VALUES (
          p_email_type,
          p_recipient_email,
          p_recipient_user_id,
          p_related_entity_type,
          v_cast_related_entity_id,
          'skipped',
          'Email event is already reserved.',
          v_metadata || jsonb_build_object('event_key', p_event_key)
        ) RETURNING id INTO v_log_id;

        RETURN jsonb_build_object(
          'ok', false,
          'status', 'skipped',
          'log_id', v_log_id,
          'event_id', v_event_id,
          'skipped', true,
          'error', 'Email event is already reserved.'
        );
      END;
    ELSE
      -- v_event_status IS 'pending' or 'processing'
      INSERT INTO public.email_logs (
        email_type,
        recipient_email,
        recipient_user_id,
        related_entity_type,
        related_entity_id,
        status,
        failure_reason,
        metadata
      ) VALUES (
        p_email_type,
        p_recipient_email,
        p_recipient_user_id,
        p_related_entity_type,
        v_cast_related_entity_id,
        'skipped',
        'Email event is already reserved.',
        v_metadata || jsonb_build_object('event_key', p_event_key)
      ) RETURNING id INTO v_log_id;

      RETURN jsonb_build_object(
        'ok', false,
        'status', 'skipped',
        'log_id', v_log_id,
        'event_id', v_event_id,
        'skipped', true,
        'error', 'Email event is already reserved.'
      );
    END IF;
  END;

  -- 3. Create the email_logs record in 'pending' status
  INSERT INTO public.email_logs (
    email_type,
    recipient_email,
    recipient_user_id,
    related_entity_type,
    related_entity_id,
    status,
    metadata
  ) VALUES (
    p_email_type,
    p_recipient_email,
    p_recipient_user_id,
    p_related_entity_type,
    v_cast_related_entity_id,
    'pending',
    v_metadata || jsonb_build_object('event_key', p_event_key)
  ) RETURNING id INTO v_log_id;

  -- 4. Update the event record to 'pending' (and link the log)
  UPDATE public.email_events
  SET status = 'pending',
      email_log_id = v_log_id,
      metadata = metadata || v_metadata
  WHERE id = v_event_id;

  -- 5. If p_enqueue is true, insert the payload into email_queue
  IF p_enqueue IS TRUE THEN
    INSERT INTO public.email_queue (
      to_email,
      subject,
      html_body,
      text_body,
      reply_to,
      metadata,
      status,
      attempts,
      max_attempts
    ) VALUES (
      p_recipient_email,
      p_template_subject,
      p_template_html,
      p_template_text,
      p_reply_to,
      jsonb_build_object(
        'email_log_id', v_log_id,
        'email_event_id', v_event_id,
        'email_type', p_email_type,
        'recipient_user_id', p_recipient_user_id,
        'related_entity_type', p_related_entity_type,
        'related_entity_id', p_related_entity_id,
        'event_key', p_event_key
      ) || v_metadata,
      'pending',
      0,
      3
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'pending',
    'log_id', v_log_id,
    'event_id', v_event_id
  );
END;
$$;
