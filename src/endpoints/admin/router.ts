import { Hono } from "hono";
import { fromHono } from "chanfana";
import { AdminUsersList, AdminUsersCreate, AdminUsersUpdate, AdminUsersDelete } from "./users";
import { AdminActivityLog } from "./activity";
import { AdminChatActivity } from "./chatActivity";
import { AdminDashboard } from "./dashboard";
import { AdminLoginPage } from "./loginPage";
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
import { MaintenanceUpdate } from "../maintenance/maintenanceUpdate";

const adminRouter = fromHono(new Hono());

// Authentication middleware for protected routes
async function requireAuth(c: any, next: any) {
	const authHeader = c.req.header('Authorization');
	const sessionToken = authHeader?.replace('Bearer ', '');

	if (!sessionToken) {
		return c.html(`
			<!DOCTYPE html>
			<html>
			<head><meta http-equiv="refresh" content="0; url=/admin/login"></head>
			<body>Redirecting to login...</body>
			</html>
		`);
	}

	// Verify session token
	const session = await c.env.DB.prepare(
		"SELECT s.*, u.role FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = ? AND s.expires_at > datetime('now') AND u.is_active = 1"
	).bind(sessionToken).first();

	if (!session || session.role !== 'admin') {
		return c.html(`
			<!DOCTYPE html>
			<html>
			<head><meta http-equiv="refresh" content="0; url=/admin/login"></head>
			<body>Redirecting to login...</body>
			</html>
		`);
	}

	c.set('user', session);
	await next();
}

// Login page (no auth required)
adminRouter.get("/login", AdminLoginPage);

// Dashboard UI (client-side auth check)
adminRouter.get("/dashboard", AdminDashboard);

// User management
adminRouter.get("/users", AdminUsersList);
adminRouter.post("/users", AdminUsersCreate);
adminRouter.put("/users/:id", AdminUsersUpdate);
adminRouter.delete("/users/:id", AdminUsersDelete);

// Activity log
adminRouter.get("/activity", AdminActivityLog);

// Chat activity tracking
adminRouter.get("/chat-activity", AdminChatActivity);

// Knowledge base management
adminRouter.get("/knowledge", AdminKnowledgeList);
adminRouter.post("/knowledge", AdminKnowledgeCreate);
adminRouter.put("/knowledge/:id", AdminKnowledgeUpdate);
adminRouter.delete("/knowledge/:id", AdminKnowledgeDelete);

// Maintenance task assignment
adminRouter.put("/maintenance/:id/assign", MaintenanceUpdate);

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
