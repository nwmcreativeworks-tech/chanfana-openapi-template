import { Hono } from "hono";
import { fromHono } from "chanfana";
import { Login } from "./login";

const authRouter = fromHono(new Hono());

authRouter.post("/login", Login);

export default authRouter;
