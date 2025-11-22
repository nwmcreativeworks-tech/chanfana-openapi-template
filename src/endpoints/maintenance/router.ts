import { Hono } from "hono";
import { fromHono } from "chanfana";
import { MaintenanceList } from "./maintenanceList";
import { MaintenanceRead } from "./maintenanceRead";
import { MaintenanceUpdate } from "./maintenanceUpdate";

const maintenanceRouter = fromHono(new Hono());

maintenanceRouter.get("/", MaintenanceList);
maintenanceRouter.get("/:id", MaintenanceRead);
maintenanceRouter.put("/:id", MaintenanceUpdate);

export default maintenanceRouter;
