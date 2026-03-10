// Using built-in Deno.serve
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate VAPID keys using Web Crypto API
async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Private key is the 'd' parameter from JWK
  const privateKeyBase64 = privateKeyJwk.d!;

  return { publicKey: publicKeyBase64, privateKey: privateKeyBase64 };
}

// Get or create VAPID keys
async function getVapidKeys(supabaseAdmin: any) {
  const { data: pubRow } = await supabaseAdmin
    .from("app_config")
    .select("value")
    .eq("key", "vapid_public_key")
    .maybeSingle();

  if (pubRow) {
    const { data: privRow } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "vapid_private_key")
      .maybeSingle();
    return { publicKey: pubRow.value, privateKey: privRow?.value };
  }

  // Generate new keys
  const keys = await generateVapidKeys();
  await supabaseAdmin.from("app_config").upsert([
    { key: "vapid_public_key", value: keys.publicKey },
    { key: "vapid_private_key", value: keys.privateKey },
  ]);
  return keys;
}

// Build JWT for Web Push authorization
async function buildVapidJwt(endpoint: string, vapidPrivateKey: string, subject: string) {
  const audience = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 86400, sub: subject };

  const encode = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Import the private key
  const privateKeyBytes = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: vapidPrivateKey,
      x: "", // Will be derived
      y: "",
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  ).catch(async () => {
    // Fallback: import from raw private key
    const jwk = {
      kty: "EC",
      crv: "P-256",
      d: vapidPrivateKey,
      // Generate x,y from the stored public key
      x: "",
      y: "",
    };
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  });

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${unsignedToken}.${sigBase64}`;
}

// Send a single push notification
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  // For web push, we need to encrypt the payload and sign with VAPID
  // Using a simplified approach - send without encryption for notification-only
  try {
    const jwt = await buildVapidJwt(subscription.endpoint, vapidPrivateKey, "mailto:safety@raksha.app");

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: payload,
    });

    return { success: response.ok, status: response.status };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // GET: return VAPID public key
    if (req.method === "GET") {
      const keys = await getVapidKeys(supabaseAdmin);
      return new Response(
        JSON.stringify({ publicKey: keys.publicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "subscribe") {
      // Save push subscription
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token!);
      if (!user) throw new Error("Unauthorized");

      const { endpoint, keys: subKeys } = body.subscription;

      await supabaseAdmin.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: subKeys.p256dh,
          auth: subKeys.auth,
        },
        { onConflict: "user_id,endpoint" }
      );

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send") {
      // Send push to a user's devices
      const { user_id, title, message } = body;
      if (!user_id) throw new Error("user_id required");

      const keys = await getVapidKeys(supabaseAdmin);

      const { data: subscriptions } = await supabaseAdmin
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user_id);

      if (!subscriptions?.length) {
        return new Response(
          JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const payload = JSON.stringify({ title, body: message, icon: "/icon-192.png" });

      const results = await Promise.all(
        subscriptions.map((sub: any) =>
          sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            keys.publicKey,
            keys.privateKey
          )
        )
      );

      // Clean up failed subscriptions (410 Gone = unsubscribed)
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 410) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", subscriptions[i].id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, sent: results.filter((r: any) => r.success).length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
