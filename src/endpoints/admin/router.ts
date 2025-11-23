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
import { AlexaSetupStart, AlexaSetupCallback } from "./alexaSetup";
import {
	AdminKnowledgeList,
	AdminKnowledgeCreate,
	AdminKnowledgeUpdate,
	AdminKnowledgeDelete,
} from "./knowledge";

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

// Knowledge base management
adminRouter.get("/knowledge", AdminKnowledgeList);
adminRouter.post("/knowledge", AdminKnowledgeCreate);
adminRouter.put("/knowledge/:id", AdminKnowledgeUpdate);
adminRouter.delete("/knowledge/:id", AdminKnowledgeDelete);

// Thermostat device management
adminRouter.get("/devices", AdminDevicesList);
adminRouter.get("/devices/discover", AdminDevicesDiscover);
adminRouter.post("/devices", AdminDevicesAdd);
adminRouter.put("/devices/:id", AdminDevicesUpdate);
adminRouter.delete("/devices/:id", AdminDevicesDelete);
adminRouter.post("/devices/:id/sync", AdminDevicesSync);

// Alexa OAuth setup
adminRouter.get("/alexa/setup", async (c) => {
	const setup = new AlexaSetupStart();
	return setup.handle(c);
});
adminRouter.get("/alexa/callback", async (c) => {
	const callback = new AlexaSetupCallback();
	return callback.handle(c);
});

export default adminRouter;
