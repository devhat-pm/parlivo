// Collects reports from a web or desktop build made with NEXT_PUBLIC_DIAGNOSTICS_URL.
// Each POST body is appended as one JSON line. Local evidence only; never deploy this.
//   node scripts/diagnostics-receiver.mjs [out.jsonl=diagnostics.jsonl] [port=8765]
import { appendFileSync } from "node:fs";
import { createServer } from "node:http";

const [out = "diagnostics.jsonl", port = "8765"] = process.argv.slice(2);
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

createServer((request, response) => {
  if (request.method === "POST") {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      appendFileSync(out, `${body.replaceAll("\n", " ")}\n`);
      response.writeHead(204, cors).end();
    });
    return;
  }
  response.writeHead(request.method === "OPTIONS" ? 204 : 405, cors).end();
}).listen(Number(port), "127.0.0.1", () => {
  process.stdout.write(`diagnostics receiver on http://localhost:${port}/report -> ${out}\n`);
});
