import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("NWM Creative Works Experience API", () => {
  describe("GET /nwm/overview", () => {
    it("returns the studio overview payload", async () => {
      const response = await SELF.fetch("http://local.test/nwm/overview");
      const body = await response.json<{
        success: boolean;
        overview: {
          name: string;
          tagline: string;
          specialties: string[];
        };
      }>();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.overview.name).toMatch(/NWM Creative Works/i);
      expect(body.overview.tagline.length).toBeGreaterThan(10);
      expect(body.overview.specialties.length).toBeGreaterThan(0);
    });
  });

  describe("GET /nwm/services", () => {
    it("lists the primary service pillars", async () => {
      const response = await SELF.fetch("http://local.test/nwm/services");
      const body = await response.json<{
        success: boolean;
        services: { id: string; deliverables: string[] }[];
      }>();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.services)).toBe(true);
      expect(body.services.length).toBeGreaterThanOrEqual(3);
      for (const service of body.services) {
        expect(service.id).toMatch(/^[a-z-]+$/);
        expect(service.deliverables.length).toBeGreaterThan(0);
      }
    });
  });

  describe("GET /nwm/projects", () => {
    it("returns case study style project summaries", async () => {
      const response = await SELF.fetch("http://local.test/nwm/projects");
      const body = await response.json<{
        success: boolean;
        projects: { slug: string; outcomes: string[] }[];
      }>();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.projects.length).toBeGreaterThanOrEqual(3);
      for (const project of body.projects) {
        expect(project.slug.length).toBeGreaterThan(0);
        expect(project.outcomes.length).toBeGreaterThan(0);
      }
    });
  });
});
