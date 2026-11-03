import "server-only";
import type { PortalApi } from "./contract";
import { mockApi } from "./mock";
import { createHttpApi } from "./http";

export type { PortalApi } from "./contract";
export * from "./types";

let instance: PortalApi | null = null;

/**
 * Server-side access to the portal API. GDX_API_MODE=mock (default) serves the in-memory demo;
 * GDX_API_MODE=http + GDX_API_URL calls the real backend with the same interface.
 */
export function api(): PortalApi {
  if (instance) return instance;
  const mode = process.env.GDX_API_MODE ?? "mock";
  if (mode === "http") {
    const url = process.env.GDX_API_URL;
    if (!url) throw new Error("GDX_API_MODE=http requires GDX_API_URL");
    instance = createHttpApi(url);
  } else {
    instance = mockApi;
  }
  return instance;
}

export const isMockApi = () => (process.env.GDX_API_MODE ?? "mock") === "mock";
