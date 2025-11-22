import { Hono } from "hono";
import { fromHono } from "chanfana";
import { ThermostatRead } from "./thermostatRead";
import { ThermostatUpdate } from "./thermostatUpdate";

const thermostatRouter = fromHono(new Hono());

thermostatRouter.get("/", ThermostatRead);
thermostatRouter.put("/", ThermostatUpdate);

export default thermostatRouter;
