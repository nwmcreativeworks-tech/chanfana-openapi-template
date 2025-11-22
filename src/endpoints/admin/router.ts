import { Hono } from "hono";
import { fromHono } from "chanfana";
import { AdminUsersList, AdminUsersCreate, AdminUsersDelete } from "./users";
import { AdminActivityLog } from "./activity";
import { AdminDashboard } from "./dashboard";
import {
	AdminDevicesList,
	AdminDevicesDiscover,
	AdminDevicesAdd,
	AdminDevicesUpdate,
	AdminDevicesDelete,
	AdminDevicesSync,
} from "./devices";

const adminRouter = fromHono(new Hono());

// Dashboard UI
adminRouter.get("/dashboard", async (c) => {
	const dashboard = new AdminDashboard();
	return dashboard.handle(c);
});

// User management
adminRouter.get("/users", AdminUsersList);
adminRouter.post("/users", AdminUsersCreate);
adminRouter.delete("/users/:id", AdminUsersDelete);

// Activity log
adminRouter.get("/activity", AdminActivityLog);

// Thermostat device management
adminRouter.get("/devices", AdminDevicesList);
adminRouter.get("/devices/discover", AdminDevicesDiscover);
adminRouter.post("/devices", AdminDevicesAdd);
adminRouter.put("/devices/:id", AdminDevicesUpdate);
adminRouter.delete("/devices/:id", AdminDevicesDelete);
adminRouter.post("/devices/:id/sync", AdminDevicesSync);

export default adminRouter;
