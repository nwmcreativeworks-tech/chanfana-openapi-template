import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { studioServices } from "../data";
import { AppContext } from "../../../types";

export class NwmServicesEndpoint extends OpenAPIRoute {
  public schema = {
    tags: ["NWM"],
    summary: "List service pillars",
    operationId: "list-nwm-services",
    responses: {
      "200": {
        description: "Service offerings grouped by focus area",
        ...contentJson(
          z.object({
            success: z.literal(true),
            services: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                description: z.string(),
                deliverables: z.array(z.string()),
              }),
            ),
          }),
        ),
      },
    },
  } as const;

  public async handle(c: AppContext) {
    c.header("Cache-Control", "public, max-age=600");

    return { success: true, services: studioServices } as const;
  }
}
