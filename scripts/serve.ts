import { serveDir } from "https://deno.land/std@0.212.0/http/file_server.ts";

Deno.serve({ port: 8081 }, async (req) => {
  const res = await serveDir(req, {
    fsRoot: ".",
    showIndex: true,
  });
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  return res;
});
