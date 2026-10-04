import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationSettings {
  id: string;
  user_id: string;
  checkin_enabled: boolean;
  checkin_time: string;
  last_notification_date: string | null;
}

interface AppConfig {
  key: string;
  value: string;
}

// ── Base64 helpers ──

function base64UrlToBytes(b64url: string): Uint8Array {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ── VAPID JWT ──

function pkcs8DerFromRawPrivate(raw: Uint8Array): ArrayBuffer {
  // PKCS#8 DER for a P-256 EC private key:
  // SEQUENCE { INTEGER 1, OCTET STRING(32 bytes), [0] { OID ecPublicKey, OID P-256 } }
  const der = new Uint8Array(2 + 2 + 1 + 2 + raw.length + 2 + 12);
  let i = 0;
  der[i++] = 0x30; der[i++] = der.length - 2;       // SEQUENCE
  der[i++] = 0x02; der[i++] = 0x01; der[i++] = 0x01; // INTEGER 1
  der[i++] = 0x04; der[i++] = raw.length;             // OCTET STRING
  der.set(raw, i); i += raw.length;
  der[i++] = 0xa0; der[i++] = 0x0a;                   // [0] tag
  der[i++] = 0x06; der[i++] = 0x08;                   // OID
  der[i++] = 0x2a; der[i++] = 0x86; der[i++] = 0x48;
  der[i++] = 0xce; der[i++] = 0x3d; der[i++] = 0x03; der[i++] = 0x01; der[i++] = 0x07;
  return der.buffer;
}

async function createVapidJwt(
  audience: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: expiry, sub: subject };

  const headerB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8DerFromRawPrivate(base64UrlToBytes(vapidPrivateKey)),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

// ── RFC 8291 payload encryption (aes128gcm) ──

async function encryptPayload(
  payload: string,
  p256dhB64: string,
  authB64: string
): Promise<ArrayBuffer> {
  const recipientPubKey = base64UrlToBytes(p256dhB64);
  const authSecret = base64UrlToBytes(authB64);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Server ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const recipientKey = await crypto.subtle.importKey(
    "raw",
    recipientPubKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: recipientKey },
    serverKeyPair.privateKey,
    256
  );

  const serverPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey)
  );

  // IKM = HKDF(sharedSecret, salt=authSecret, info="WebPush: info\0" || ua_public || server_public)
  const webPushInfo = new TextEncoder().encode("WebPush: info\u0000");
  const ikmInfo = new Uint8Array(webPushInfo.length + recipientPubKey.length + serverPublicKey.length);
  ikmInfo.set(webPushInfo, 0);
  ikmInfo.set(recipientPubKey, webPushInfo.length);
  ikmInfo.set(serverPublicKey, webPushInfo.length + recipientPubKey.length);

  const ikmKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);
  const ikm = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: ikmInfo },
    ikmKey,
    256
  );

  // CEK = HKDF(ikm, salt, "Content-Encoding: aes128gcm\0", 128 bits)
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\u0000");
  const cekKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const cek = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt, info: cekInfo },
    cekKey,
    128
  );

  // Nonce = HKDF(ikm, salt, "Content-Encoding: nonce\0", 96 bits)
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\u0000");
  const nonceKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: salt, info: nonceInfo },
      nonceKey,
      96
    )
  );

  const contentEncryptionKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);

  // Encrypt plaintext + padding (single zero byte = last record)
  const plaintext = new TextEncoder().encode(payload);
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext, 0);
  // padded[plaintext.length] = 0 (already zero)

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    contentEncryptionKey,
    padded
  );

  // Build aes128gcm content-coding header:
  // salt(16) | rs(4, big-endian 4096) | idlen(1) | keyid(serverPublicKey)
  const header = new Uint8Array(16 + 4 + 1 + serverPublicKey.length);
  header.set(salt, 0);
  header[16] = 0x00; header[17] = 0x00; header[18] = 0x10; header[19] = 0x00; // rs = 4096
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);

  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header, 0);
  result.set(new Uint8Array(encrypted), header.length);
  return result.buffer;
}

// ── Send one push message ──

async function sendPush(
  subscription: PushSubscription,
  payload: Record<string, string>,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<boolean> {
  try {
    const endpoint = new URL(subscription.endpoint);
    const audience = `${endpoint.protocol}//${endpoint.host}`;
    const jwt = await createVapidJwt(audience, vapidPublicKey, vapidPrivateKey, vapidSubject);
    const authHeader = `vapid t=${jwt},k=${vapidPublicKey}`;

    const encryptedBody = await encryptPayload(
      JSON.stringify(payload),
      subscription.p256dh,
      subscription.auth
    );

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Authorization": authHeader,
      },
      body: encryptedBody,
    });

    if (response.status === 410 || response.status === 404) {
      return false; // subscription expired
    }

    if (!response.ok) {
      console.error(`Push failed (${response.status}) for ${subscription.endpoint}`);
    }

    return response.ok;
  } catch (err) {
    console.error(`Push error for ${subscription.endpoint}:`, err.message);
    return true; // keep subscription on transient errors
  }
}

// ── Main handler ──

const MESSAGES = [
  "How was today? 🌙",
  "Quick check-in? ✨",
  "Before the day ends — anything to log?",
  "How did today go?",
  "Any wins to record today? ⭐",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load VAPID keys from app_config table
    const { data: configData } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", ["vapid_public_key", "vapid_private_key", "vapid_subject"]);

    const config = (configData ?? []) as AppConfig[];
    const vapidPublicKey = config.find((c) => c.key === "vapid_public_key")?.value;
    const vapidPrivateKey = config.find((c) => c.key === "vapid_private_key")?.value;
    const vapidSubject = config.find((c) => c.key === "vapid_subject")?.value ?? "mailto:noreply@myrhythm.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional: accept a specific user_id for manual triggers
    let targetUserId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetUserId = body.user_id ?? null;
      } catch {
        // empty body — process all users
      }
    }

    // Fetch all enabled notification settings
    let settingsQuery = supabase
      .from("notification_settings")
      .select("*")
      .eq("checkin_enabled", true);

    if (targetUserId) {
      settingsQuery = settingsQuery.eq("user_id", targetUserId);
    }

    const { data: settingsData, error: settingsError } = await settingsQuery;

    if (settingsError) {
      return new Response(
        JSON.stringify({ error: settingsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const settings = (settingsData ?? []) as NotificationSettings[];
    const today = new Date().toISOString().split("T")[0];
    let sent = 0;
    let skipped = 0;
    let expired = 0;

    for (const setting of settings) {
      if (setting.last_notification_date === today) {
        skipped++;
        continue;
      }

      // Check if current UTC time >= user's target time
      const nowUtc = new Date();
      const utcHourMin = `${String(nowUtc.getUTCHours()).padStart(2, "0")}:${String(nowUtc.getUTCMinutes()).padStart(2, "0")}`;
      if (utcHourMin < setting.checkin_time) {
        continue;
      }

      // Get this user's push subscriptions
      const { data: subsData } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", setting.user_id);

      const subscriptions = (subsData ?? []) as PushSubscription[];
      if (subscriptions.length === 0) {
        skipped++;
        continue;
      }

      const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      const payload = {
        title: "My Rhythm",
        body: message,
        tag: "rhythm-checkin",
        url: "/?action=checkin",
      };

      let anySent = false;
      const expiredSubIds: string[] = [];

      for (const sub of subscriptions) {
        const ok = await sendPush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);
        if (ok) {
          anySent = true;
        } else {
          expiredSubIds.push(sub.id);
        }
      }

      // Clean up expired subscriptions
      for (const subId of expiredSubIds) {
        await supabase.from("push_subscriptions").delete().eq("id", subId);
        expired++;
      }

      if (anySent) {
        await supabase
          .from("notification_settings")
          .update({ last_notification_date: today, updated_at: new Date().toISOString() })
          .eq("id", setting.id);
        sent++;
      }
    }

    return new Response(
      JSON.stringify({ sent, skipped, expired, processed: settings.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
