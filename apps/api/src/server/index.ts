import { serve } from "@hono/node-server";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

serve({ fetch: createApp().fetch, port, hostname }, (info) => {
  console.info(`API server listening on http://${info.address}:${info.port}`);
});
