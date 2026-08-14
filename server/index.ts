import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app";
import { FileVault } from "./store";

const port = Number(process.env.PORT ?? 8787);
const dataDir = process.env.DATA_DIR ?? join(process.cwd(), "data");
const vault = new FileVault(dataDir);
const app = createApp(vault);

const dist = join(process.cwd(), "dist");
if (existsSync(join(dist, "index.html"))) {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", (c) => {
    if (c.req.path.startsWith("/api")) {
      return c.json({ error: "Not found." }, 404);
    }
    return c.html(readFileSync(join(dist, "index.html"), "utf8"));
  });
}

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`DiceMaster API listening on http://127.0.0.1:${info.port}`);
});
