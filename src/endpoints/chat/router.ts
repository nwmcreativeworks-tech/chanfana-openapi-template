import { Hono } from "hono";
import { fromHono } from "chanfana";
import { ChatMessage } from "./chatMessage";
import { ChatHistory } from "./chatHistory";

const chatRouter = fromHono(new Hono());

chatRouter.post("/", ChatMessage);
chatRouter.get("/history", ChatHistory);

export default chatRouter;
