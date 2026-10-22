import { describe, expect, it } from "vitest";
import { columnsFor, layout, linkPath, NODE } from "./topology";
import type { MapRouter, MapSite } from "./types";

const router = (id: string, neighbors: MapRouter["neighbors"] = []): MapRouter => ({
  id, name: id, status: "online", board: "hAP", users: 1, cpu: 5, neighbors,
});
const dev = (identity: string, routerId: string | null = null) => ({ mac: identity, identity, address: "", platform: "", board: "", interface: "ether1", routerId });

const sites: MapSite[] = [
  { id: "a", name: "A", routers: [router("r1", [dev("r2", "r2"), dev("LiteBeam")]), router("r3")] },
  { id: "b", name: "B", routers: [router("r2", [dev("r1", "r1")])] },
  { id: "empty", name: "Empty", routers: [] },
];

describe("columnsFor", () => {
  it("fits columns into the width", () => {
    expect(columnsFor(300)).toBe(1);
    expect(columnsFor(24 * 2 + 236 * 2 + 48)).toBe(2);
    expect(columnsFor(0)).toBe(1);
  });
});

describe("layout", () => {
  it("places sites side by side and skips empty ones", () => {
    const l = layout(sites, 4);
    expect(l.sites.map((s) => s.name)).toEqual(["A", "B"]);
    const r1 = l.routers.find((p) => p.router.id === "r1")!;
    const r2 = l.routers.find((p) => p.router.id === "r2")!;
    expect(r2.x).toBeGreaterThan(r1.x);
    expect(r2.y).toBe(r1.y);
  });

  it("lists foreign devices under their router and pushes the next router down", () => {
    const l = layout(sites, 4);
    const r1 = l.routers.find((p) => p.router.id === "r1")!;
    const r3 = l.routers.find((p) => p.router.id === "r3")!;
    expect(l.devices).toHaveLength(1);
    expect(l.devices[0]!.device.identity).toBe("LiteBeam");
    expect(l.devices[0]!.y).toBeGreaterThan(r1.y + NODE.h);
    expect(r3.y).toBeGreaterThan(l.devices[0]!.y);
  });

  it("draws one link per pair of own routers", () => {
    const l = layout(sites, 4);
    expect(l.links).toHaveLength(1);
    expect([l.links[0]!.a.router.id, l.links[0]!.b.router.id].sort()).toEqual(["r1", "r2"]);
  });

  it("wraps into rows on narrow screens", () => {
    const wide = layout(sites, 4);
    const narrow = layout(sites, 1);
    expect(narrow.width).toBeLessThan(wide.width);
    const r2 = narrow.routers.find((p) => p.router.id === "r2")!;
    const r3 = narrow.routers.find((p) => p.router.id === "r3")!;
    expect(r2.x).toBe(r3.x);
    expect(r2.y).toBeGreaterThan(r3.y);
  });
});

describe("linkPath", () => {
  it("connects card edges", () => {
    const a = { router: router("a"), site: "s", x: 0, y: 0, w: 100, h: 50 };
    const b = { router: router("b"), site: "s", x: 200, y: 100, w: 100, h: 50 };
    expect(linkPath(a, b)).toBe("M100,25 C150,25 150,125 200,125");
    const c = { ...b, x: 0 };
    expect(linkPath(a, c)).toBe("M100,25 C134,25 134,125 100,125");
  });
});
