import { Hono } from "hono";
import { fromHono } from "chanfana";
import { AdminUsersList, AdminUsersCreate, AdminUsersDelete } from "./users";
import { AdminActivityLog } from "./activity";
import { AdminDashboard } from "./dashboard";

const adminRouter = fromHono(new Hono());

// Dashboard UI
adminRouter.get("/dashboard", async (c) => {
	const dashboard = new AdminDashboard();
	return dashboard.handle(c);
});

// API endpoints
adminRouter.get("/users", AdminUsersList);
adminRouter.post("/users", AdminUsersCreate);
adminRouter.delete("/users/:id", AdminUsersDelete);
adminRouter.get("/activity", AdminActivityLog);

export default adminRouter;
