import { Hono } from "hono";
import { fromHono } from "chanfana";
import { Login } from "./login";
import { TenantLogin, TenantLogout, VerifySession } from "./tenantAuth";

const authRouter = fromHono(new Hono());

authRouter.post("/login", Login);
authRouter.post("/tenant/login", TenantLogin);
authRouter.post("/tenant/logout", TenantLogout);
authRouter.get("/tenant/verify", VerifySession);

export default authRouter;
