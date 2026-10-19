// Vercel Edge Function：专属 CORS 代理
// 访问地址：https://<你的项目>.vercel.app/api/proxy?url=http://dl.cii-tech.com/...
export const config = { runtime: "edge" };

const ALLOWED_PREFIX = "http://dl.cii-tech.com/"; // 只允许代理自家源站

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const target = new URL(req.url).searchParams.get("url");
  if (!target || !target.startsWith(ALLOWED_PREFIX)) {
    return new Response("Forbidden", { status: 403, headers: corsHeaders() });
  }

  try {
    const upstream = await fetch(target, { redirect: "follow" });
    const headers = new Headers(upstream.headers);
    headers.set("Cache-Control", "no-store");
    for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Type, Content-Length",
  };
}
