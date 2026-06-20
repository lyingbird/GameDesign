// Server bootstrap: Fastify (REST) + ws gateway on the same HTTP server.
import Fastify from "fastify";
import cors from "@fastify/cors";
import { Store } from "./store.js";
import { Engine } from "./engine.js";
import { registerRoutes } from "./http.js";
import { registerChat } from "./chat.js";
import { attachWs } from "./ws.js";

const PORT = Number(process.env.PORT ?? 8787);

async function main() {
  const store = new Store();
  const engine = new Engine(store);

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true, exposedHeaders: ["*"] });
  registerRoutes(app, store);
  registerChat(app);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  attachWs(app.server, store, engine);
  app.log.info(`GameDesignFlow server on http://localhost:${PORT}  (REST + ws at /api/v2/ws)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
