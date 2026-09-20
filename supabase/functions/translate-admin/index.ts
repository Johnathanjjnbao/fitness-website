const allowedOrigins = new Set([
  "https://johnathanjjnbao.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://johnathanjjnbao.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request),
  });
}

function publishableKey(request) {
  const requestKey = request.headers.get("apikey");
  if (requestKey) return requestKey;

  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    return typeof keys.default === "string" ? keys.default : "";
  } catch {
    return "";
  }
}

async function requireAdmin(request) {
  const authorization = request.headers.get("authorization") || "";
  const apiKey = publishableKey(request);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  if (!authorization.startsWith("Bearer ") || !apiKey || !supabaseUrl) return false;

  const authHeaders = {
    "Authorization": authorization,
    "apikey": apiKey,
  };
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: authHeaders });
  if (!userResponse.ok) return false;

  const user = await userResponse.json();
  if (typeof user?.id !== "string") return false;

  const adminUrl = new URL(`${supabaseUrl}/rest/v1/admin_users`);
  adminUrl.searchParams.set("select", "user_id");
  adminUrl.searchParams.set("user_id", `eq.${user.id}`);
  adminUrl.searchParams.set("limit", "1");
  const adminResponse = await fetch(adminUrl, { headers: authHeaders });
  if (!adminResponse.ok) return false;

  const adminRows = await adminResponse.json();
  return Array.isArray(adminRows) && adminRows.length === 1;
}

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

async function translateText(text) {
  if (!text.trim()) return text;

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", "vi|ko");
  url.searchParams.set("mt", "1");
  const optionalApiKey = Deno.env.get("MYMEMORY_API_KEY");
  if (optionalApiKey) url.searchParams.set("key", optionalApiKey);

  const response = await fetch(url, {
    headers: { "User-Agent": "FORGEFIT-admin-translation/1.0" },
  });
  if (!response.ok) throw new Error(`Translation provider returned ${response.status}.`);

  const result = await response.json();
  const translatedText = result?.responseData?.translatedText;
  if (Number(result?.responseStatus) !== 200 || typeof translatedText !== "string") {
    throw new Error("Translation provider returned an invalid response.");
  }
  return decodeEntities(translatedText);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed." }, 405);

  try {
    if (!(await requireAdmin(request))) {
      return jsonResponse(request, { error: "Administrator access required." }, 403);
    }

    const body = await request.json();
    if (body?.sourceLanguage !== "vi" || body?.targetLanguage !== "ko") {
      return jsonResponse(request, { error: "Only Vietnamese to Korean translation is supported." }, 400);
    }
    if (!Array.isArray(body.texts) || body.texts.length < 1 || body.texts.length > 30) {
      return jsonResponse(request, { error: "Translate between 1 and 30 text segments per request." }, 400);
    }

    const encoder = new TextEncoder();
    const texts = body.texts.map((value) => typeof value === "string" ? value : "");
    if (texts.some((text) => encoder.encode(text).length > 500)) {
      return jsonResponse(request, { error: "Each text segment must be at most 500 UTF-8 bytes." }, 400);
    }
    if (texts.reduce((total, text) => total + encoder.encode(text).length, 0) > 5000) {
      return jsonResponse(request, { error: "Translation request is too large." }, 400);
    }

    const translations = await Promise.all(texts.map(translateText));
    return jsonResponse(request, { translations });
  } catch (error) {
    console.error("FORGEFIT translate-admin failed.", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse(request, { error: "Translation is temporarily unavailable." }, 502);
  }
});
