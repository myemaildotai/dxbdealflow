// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  const appBaseUrl = Deno.env.get("APP_BASE_URL");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!appBaseUrl || !cronSecret) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Missing required environment variables APP_BASE_URL or CRON_SECRET on Edge Function."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const targetUrl = `${appBaseUrl.replace(/\/$/, "")}/api/cron/process-email-queue`;

  // Create an AbortController for a 30-second timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cronSecret}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const status = response.status;
    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Next.js API route returned status ${status}`,
          details: data
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        data
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout ? "Request timed out after 30 seconds" : err.message || String(err)
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});
