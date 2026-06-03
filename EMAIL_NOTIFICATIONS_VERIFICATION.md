# Email Notifications Verification

Apply `supabase/migrations/037_email_notification_system.sql` before testing. In addition to the normal Supabase app envs, email delivery uses SMTP env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`), `NEXT_PUBLIC_API_BASE_URL` for links, and `CRON_SECRET` for cron routes.

The only supported `email_type` values are:

1. `welcome_early_interest`
2. `broker_verification_success`
3. `manual_review_pending`
4. `listing_submitted`
5. `listing_approved`
6. `new_deal_alert`
7. `new_message_received`
8. `requirement_match_found`
9. `weekly_deal_digest`
10. `profile_completion_reminder`
11. `broker_email_verification_otp`
12. `broker_public_enquiry_notification`
13. `enquiry_reply_email`

## Template Design Screenshot Checklist

Capture a desktop-width and mobile-width preview for each supported email type. Confirm every screenshot shows the shared DXB Deal Flow design system:

- White/light luxury card on `#F2F4F7`
- Dark navy `#0B1D3A` header bar with rounded top card corners
- DXB Deal Flow `Logo-White.png` image on the left, loaded from an absolute app/base URL, or the `DXB Deal Flow` alt/text fallback
- Lock/private-network block on the right with `PRIVATE NETWORK / For Verified Brokers Only`
- Gold `#F5A623` primary CTA styling
- Rounded content cards, safe spacing, and no broken tags
- Light `#F7F8FA` footer section across all 13 templates
- Footer social text: `Stay ahead. Stay connected.`, `Follow us on Instagram for insights and updates.`, and `@dxbdealflow`
- Footer private note: `DXB Deal Flow is a private platform for verified real estate professionals only.`
- Footer social fallbacks/icons for Instagram, LinkedIn, and YouTube render without broken image paths
- Plain-text fallback is populated

For all 13 templates, specifically verify the shared header/footer/logo/social-icon treatment before checking template-specific content.

Template-specific screenshot/content checks:

1. `welcome_early_interest` - title `Welcome to DXB Deal Flow!` and CTA `View Platform Overview`.
2. `broker_verification_success` - title `Your Account Has Been Approved!` and CTA `Complete Your Profile`.
3. `manual_review_pending` - title `Your Broker Account Is Under Review` and CTA `View Application Status`.
4. `listing_submitted` - title `Your Listing Is Pending Approval` and CTA `View Listing Submission`.
5. `listing_approved` - listing image, listing title, price, `View Listing`, WhatsApp share CTA, Instagram Story card, and copy-link card.
6. `new_deal_alert` - hero image, deal title, price, ROI, below-market percent, limited stock warning, and CTA `View Deal`.
7. `new_message_received` - title `You Have a New Message`, exact line `Reply now before the lead goes cold.`, and CTA `View Message`.
8. `requirement_match_found` - requirement summary, number of matches, top matching listings, and CTA `View Matches`.
9. `weekly_deal_digest` - Top 5 deals, Highest ROI, Biggest discount, Distressed stock, New launches, and CTA `View All Deals`.
10. `profile_completion_reminder` - title `Complete Your Profile`, text `Profiles with photo + bio get more enquiries.`, and CTA `Complete Profile`.
11. `broker_email_verification_otp` - title `Verify Your Email`, premium OTP card, and expiry text.
12. `broker_public_enquiry_notification` - enquirer name, email/phone when available, listing title, message preview, and CTA `View Enquiry`.
13. `enquiry_reply_email` - broker/listing context, reply message, and `View Listing` or `Reply` CTA.

## Manual Checks

1. Interest registration email
   - Submit `/coming-soon` or `/api/early-access-leads`.
   - Confirm one `email_logs` row with `email_type = welcome_early_interest`.

2. Broker verification success email
   - Submit `/api/apply` with RERA details that return `auto_approved`, or approve a pending broker from admin.
   - Confirm `broker_verification_success` is sent or pending.

3. Manual review pending email
   - Submit `/api/apply` with RERA details that do not auto-match.
   - Confirm `manual_review_pending` is sent or pending.

4. Listing submitted email
   - Create a broker listing from `/post-listing`.
   - Confirm `listing_submitted` is logged for the broker.

5. Listing approved email
   - Approve the listing from admin.
   - Confirm `listing_approved` is logged and includes listing metadata.

6. New deal alert email
   - POST as admin to `/api/admin/email/deal-alerts` with `{ "listingId": "<active-listing-id>" }`.
   - Confirm `new_deal_alert` logs for active eligible brokers.

7. New message email
   - Send a broker chat message.
   - Confirm only the receiver gets `new_message_received`.
   - Send another message in the same conversation within 15 minutes; confirm the duplicate event is logged as `skipped`.

8. Requirement match email
   - Create a buyer requirement that matches active listings, or submit a matching listing to a requirement.
   - Confirm `requirement_match_found` is logged.

9. Weekly digest cron
   - Call `GET /api/cron/weekly-deal-digest` with `Authorization: Bearer <CRON_SECRET>`.
   - Confirm `weekly_deal_digest` logs for active eligible brokers.

10. Profile reminder cron
    - Use an active broker older than 3 days with missing `profile_photo` or `bio`.
    - Call `GET /api/cron/profile-completion-reminders` with `Authorization: Bearer <CRON_SECRET>`.
    - Confirm one `profile_completion_reminder` log; repeat call should be `skipped`.

11. Broker email verification OTP
    - Sign in as an approved broker whose broker email is not verified.
    - POST to `/api/brokers/email-verification/send-otp`.
    - Confirm `broker_email_verification_otp` is logged and the response includes `expiresAt`.

12. Broker public enquiry notification
    - Submit the public enquiry form on an active listing page.
    - Confirm the listing owner gets `broker_public_enquiry_notification`.

13. Enquiry reply email
    - From the broker dashboard, reply to a public enquiry.
    - Confirm `enquiry_reply_email` is logged and the `enquiry_replies` row is marked `sent`.

14. Failed email logging
    - Temporarily set an invalid SMTP password in a safe environment.
    - Trigger any email and confirm `email_logs.status = failed` or `skipped` with `failure_reason`.
