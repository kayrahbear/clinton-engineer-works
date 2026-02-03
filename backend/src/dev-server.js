const http = require("http");
const { handler } = require("./index");

const PORT = process.env.PORT || 4000;

const MAX_BODY_SIZE = 1024 * 1024;

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;
    req.on("data", (chunk) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () =>
      resolve(chunks.length > 0 ? Buffer.concat(chunks).toString() : null)
    );
  });

const parseQueryString = (url) => {
  const qIndex = url.indexOf("?");
  if (qIndex === -1) {
    return null;
  }
  const qs = url.slice(qIndex + 1);
  const params = {};
  for (const pair of qs.split("&")) {
    const [key, value] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : "";
    }
  }
  return params;
};

const server = http.createServer(async (req, res) => {
  try {
    const body = await readBody(req);
    const queryStringParameters = parseQueryString(req.url);

    const event = {
      httpMethod: req.method,
      path: req.url,
      headers: req.headers,
      body,
      queryStringParameters,
    };

    const response = await handler(event);
    res.writeHead(response.statusCode, response.headers);
    res.end(response.body);
  } catch (error) {
    console.error("Local server error", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Internal Server Error" }));
  }
});

server.listen(PORT, () => {
  console.log(`Backend dev server listening on http://localhost:${PORT}`);
});