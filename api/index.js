// Vercel adapter for the TanStack Start build.
//
// TanStack Start's Vite plugin (this project's version) has no built-in
// Vercel preset — it only emits a Node "fetch handler" (dist/server/server.js,
// exporting `{ fetch(request: Request): Promise<Response> }`) and a client
// asset bundle (dist/client/assets/*), with no static index.html anywhere
// (the HTML shell is rendered per-request server-side). Vercel's zero-config
// Vite detection expects a static dist/index.html and has no way to run this
// handler on its own, which is why every route 404s with no adapter — this
// file is that adapter: a Node serverless function that bridges Vercel's
// classic (req, res) handler shape to the Fetch Request/Response the built
// handler expects.
import handler from "../dist/server/server.js";

function toFetchRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
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

export default async function (req, res) {
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
}
