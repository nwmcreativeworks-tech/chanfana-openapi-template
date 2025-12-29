import { fromHono } from "chanfana";
import { Hono } from "hono";
import { SearchTroubleshooting, GetDevices, RecordUsage } from "./search";
import { EscalateTroubleshooting, GetEscalations } from "./escalate";

const troubleshootingRouter = new Hono<{ Bindings: Env }>();

const troubleshootingApi = fromHono(troubleshootingRouter, {
	docs_url: null,
});

// Search and browse
troubleshootingApi.get("/search", SearchTroubleshooting);
troubleshootingApi.get("/devices", GetDevices);
troubleshootingApi.post("/usage", RecordUsage);

// Escalations
troubleshootingApi.post("/escalate", EscalateTroubleshooting);
troubleshootingApi.get("/escalations", GetEscalations);

export default troubleshootingRouter;
