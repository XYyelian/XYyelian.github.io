// Vercel Serverless Function（Node.js runtime，Web Response 风格 + 流式转发）
// 必须用 Node runtime：Edge Runtime 的 fetch 不支持 http:// 明文源站，会报 "internal error"。
// 流式转发：upstream.body 直接交给客户端，不在函数里读全部字节，支持几十 MB 的固件包。
// 访问地址：https://<你的项目>.vercel.app/api/proxy?url=http://dl.cii-tech.com/...
export const config = { maxDuration: 60 }; // 固件包较大，免费 Hobby 计划最大可设 60s

const ALLOWED_PREFIX = "http://dl.cii-tech.com/";

export default async function handler(req) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Expose-Headers": "Content-Type, Content-Length, Content-Disposition",
    "Cache-Control": "no-store",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const target =
    (req.query && req.query.url) ||
    new URL(req.url, "http://localhost").searchParams.get("url");

  if (!target || typeof target !== "string" || !target.startsWith(ALLOWED_PREFIX)) {
    return new Response("Forbidden", { status: 403, headers: cors });
  }

  try {
    const upstream = await fetch(target, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FirmwareProxy/1.0)" },
    });

    // 透传上游响应头，再覆盖 CORS / Cache-Control
    const headers = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);

    // 流式：把 ReadableStream 直接交给浏览器，不在函数里缓存整个文件
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
