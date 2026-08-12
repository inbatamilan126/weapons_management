import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "BEEahOKscIhnVsZ2i6TKSIUK1Qb4uxd4Uaama7gXZi9BA64YMTjxEGSOUowqMgNAUOduKuLGkL3fmGLcAt4A89k";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "bTGtRKjTn0O2U-FQtDTbKFMLZ30ohQGIxngrUkel8bM";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:gurukkal@kalari.com";

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const bodyText = await req.text();
    let bodyJson: any = {};
    if (bodyText) {
      try {
        bodyJson = JSON.parse(bodyText);
      } catch (e) {
        bodyJson = {};
      }
    }

    const { user_id, title, body, url } = bodyJson;

    let query = supabase.from("push_subscriptions").select("*");
    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: subscriptions, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const payload = JSON.stringify({
      title: title || "Kalaripayattu Weapons Alert ⚔️",
      body: body || "You have a new Kalari notification.",
      url: url || "/notifications",
      icon: "/pwa-192x192.png",
      badge: "/icon.svg",
    });

    const sendResults = await Promise.allSettled(
      (subscriptions || []).map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        return webpush.sendNotification(pushSubscription, payload);
      })
    );

    return new Response(
      JSON.stringify({
        message: "Push notifications delivered",
        total_devices: subscriptions?.length || 0,
        results: sendResults,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
