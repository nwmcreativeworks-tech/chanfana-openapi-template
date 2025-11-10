import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { signatureProjects } from "../data";
import { AppContext } from "../../../types";

export class NwmProjectsEndpoint extends OpenAPIRoute {
  public schema = {
    tags: ["NWM"],
    summary: "Highlight signature projects",
    operationId: "list-nwm-projects",
    responses: {
      "200": {
        description: "Signature client collaborations led by NWM Creative Works",
        ...contentJson(
          z.object({
            success: z.literal(true),
            projects: z.array(
              z.object({
                slug: z.string(),
                client: z.string(),
                sector: z.string(),
                summary: z.string(),
                outcomes: z.array(z.string()),
              }),
            ),
          }),
        ),
      },
    },
  } as const;

  public async handle(c: AppContext) {
    c.header("Cache-Control", "public, max-age=600");

    return { success: true, projects: signatureProjects } as const;
  }
}
