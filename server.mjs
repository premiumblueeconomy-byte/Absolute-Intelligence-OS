// Standalone production server for local/self-hosting (e.g. behind a
// Cloudflare Tunnel). Bridges Node's classic (req, res) handler shape to the
// Fetch Request/Response that the TanStack Start build emits
// (dist/server/server.js exports { fetch(request): Promise<Response> }) —
// the same bridging logic as api/index.js (Vercel's adapter), just served
// directly instead of as a serverless function.
//
// Usage: npm run build && npm run start
import http from "node:http";
import handler from "./dist/server/server.js";

function toFetchRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = `${protocol}://${host}${req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  const method = (req.method || "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  return new Request(url, {
    method,
    headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

const port = Number(process.env.PORT) || 3000;

const server = http.createServer(async (req, res) => {
  try {
    const request = toFetchRequest(req);
    const response = await handler.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (!response.body) {
      res.end();
      return;
    }

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error) {
    console.error("Request failed:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(port, () => {
  console.log(`AIOS listening on http://localhost:${port}`);
});
