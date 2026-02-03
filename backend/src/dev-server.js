const http = require("http");
const { handler } = require("./index");

const PORT = process.env.PORT || 4000;

const server = http.createServer(async (req, res) => {
  try {
    const event = {
      httpMethod: req.method,
      path: req.url,
      headers: req.headers,
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