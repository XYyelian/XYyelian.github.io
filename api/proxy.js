// Vercel Serverless Function（Node.js runtime，不是 Edge）
// 必须用 Node runtime：Edge Runtime 的 fetch 不支持 http:// 明文源站，会报 "internal error"。
// 访问地址：https://<你的项目>.vercel.app/api/proxy?url=http://dl.cii-tech.com/...
const ALLOWED_PREFIX = "http://dl.cii-tech.com/"; // 只允许代理自家源站

export default async function handler(req, res) {
  // 统一带上 CORS 头（对成功、失败响应都生效）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, Content-Length");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const target =
    (req.query && req.query.url) ||
    new URL(req.url, "http://localhost").searchParams.get("url");

  if (!target || typeof target !== "string" || !target.startsWith(ALLOWED_PREFIX)) {
    res.status(403).send("Forbidden");
    return;
  }

  try {
    const upstream = await fetch(target, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FirmwareProxy/1.0)" },
    });

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/octet-stream"
    );
    res.status(upstream.status).send(buffer);
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
}
