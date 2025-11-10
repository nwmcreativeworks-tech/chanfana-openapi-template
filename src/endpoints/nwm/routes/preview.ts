import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { signatureProjects, studioOverview, studioServices } from "../data";
import { AppContext } from "../../../types";

export class NwmPreviewEndpoint extends OpenAPIRoute {
  public schema = {
    tags: ["NWM"],
    summary: "Get a condensed studio preview",
    operationId: "get-nwm-preview",
    responses: {
      "200": {
        description: "Hero-style preview content for NWM Creative Works",
        ...contentJson(
          z.object({
            success: z.literal(true),
            preview: z.object({
              name: z.string(),
              tagline: z.string(),
              specialties: z.array(z.string()).min(1),
              featuredServices: z
                .array(
                  z.object({
                    id: z.string(),
                    name: z.string(),
                    description: z.string(),
                  }),
                )
                .min(1),
              highlightProject: z.object({
                slug: z.string(),
                client: z.string(),
                summary: z.string(),
              }),
            }),
          }),
        ),
      },
    },
  } as const;

  public async handle(c: AppContext) {
    c.header("Cache-Control", "public, max-age=300");

    const highlightProject = signatureProjects[0] ?? signatureProjects.at(-1);

    return {
      success: true,
      preview: {
        name: studioOverview.name,
        tagline: studioOverview.tagline,
        specialties: studioOverview.specialties.slice(0, 3),
        featuredServices: studioServices.slice(0, 3).map(({ id, name, description }) => ({
          id,
          name,
          description,
        })),
        highlightProject: highlightProject
          ? {
              slug: highlightProject.slug,
              client: highlightProject.client,
              summary: highlightProject.summary,
            }
          : {
              slug: "", // gracefully degrade if no projects are defined
              client: "",
              summary: "",
            },
      },
    } as const;
  }
}
