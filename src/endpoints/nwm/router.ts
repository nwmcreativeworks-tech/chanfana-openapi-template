import { fromHono } from "chanfana";
import { Hono } from "hono";
import { NwmOverviewEndpoint } from "./routes/overview";
import { NwmServicesEndpoint } from "./routes/services";
import { NwmProjectsEndpoint } from "./routes/projects";
import { NwmPreviewEndpoint } from "./routes/preview";

export const nwmRouter = fromHono(new Hono());

nwmRouter.get("/overview", NwmOverviewEndpoint);
nwmRouter.get("/services", NwmServicesEndpoint);
nwmRouter.get("/projects", NwmProjectsEndpoint);
nwmRouter.get("/preview", NwmPreviewEndpoint);
