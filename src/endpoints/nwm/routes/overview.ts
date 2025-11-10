import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { studioOverview } from "../data";
import { AppContext } from "../../../types";

export class NwmOverviewEndpoint extends OpenAPIRoute {
  public schema = {
    tags: ["NWM"],
    summary: "Get studio overview",
    operationId: "get-nwm-overview",
    responses: {
      "200": {
        description: "Overview of NWM Creative Works",
        ...contentJson(
          z.object({
            success: z.literal(true),
            overview: z.object({
              name: z.string(),
              tagline: z.string(),
              summary: z.string(),
              location: z.string(),
              specialties: z.array(z.string()),
              contact: z.object({
                email: z.string(),
                bookingUrl: z.string().url(),
                instagram: z.string().url(),
                linkedin: z.string().url(),
              }),
            }),
          }),
        ),
      },
    },
  } as const;

  public async handle(c: AppContext) {
    c.header("Cache-Control", "public, max-age=600");

    return { success: true, overview: studioOverview } as const;
  }
}
