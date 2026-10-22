// Layout for the network map: sites in a wrapping grid, each site a column of
// router cards with the other devices they see listed underneath. Pure and
// unit-tested; the component only draws what this returns.
import type { MapNeighbor, MapRouter, MapSite } from "./types";

export const NODE = { w: 208, h: 60 };
export const COL = { w: 236, gap: 48 };
const ROW_H = 30; // one neighbour row
const PAD = 24;
const SITE_LABEL_H = 30;
const NODE_GAP = 22;
const ROW_GAP = 44;

export type PlacedRouter = { router: MapRouter; site: string; x: number; y: number; w: number; h: number };
export type PlacedDevice = { device: MapNeighbor; owner: string; x: number; y: number };
export type Link = { a: PlacedRouter; b: PlacedRouter };

export type Layout = {
  width: number;
  height: number;
  sites: { name: string; x: number; y: number }[];
  routers: PlacedRouter[];
  devices: PlacedDevice[];
  links: Link[];
};

/** Columns that fit in the available width (at least one). */
export function columnsFor(width: number): number {
  return Math.max(1, Math.floor((width - PAD * 2 + COL.gap) / (COL.w + COL.gap)));
}

export function layout(sites: MapSite[], perRow: number): Layout {
  const used = sites.filter((s) => s.routers.length > 0);
  const cols = Math.max(1, Math.min(perRow, used.length || 1));
  const routers: PlacedRouter[] = [];
  const devices: PlacedDevice[] = [];
  const labels: Layout["sites"] = [];

  let rowTop = PAD;
  for (let start = 0; start < used.length; start += cols) {
    const row = used.slice(start, start + cols);
    let rowBottom = rowTop;
    row.forEach((site, c) => {
      const x = PAD + c * (COL.w + COL.gap);
      labels.push({ name: site.name, x, y: rowTop });
      let y = rowTop + SITE_LABEL_H;
      for (const r of site.routers) {
        const placed = { router: r, site: site.id, x, y, w: NODE.w, h: NODE.h };
        routers.push(placed);
        y += NODE.h;
        for (const d of r.neighbors.filter((n) => !n.routerId)) {
          devices.push({ device: d, owner: r.id, x: x + 22, y: y + ROW_H / 2 + 4 });
          y += ROW_H;
        }
        y += NODE_GAP;
      }
      rowBottom = Math.max(rowBottom, y);
    });
    rowTop = rowBottom + ROW_GAP;
  }

  const byId = new Map(routers.map((p) => [p.router.id, p]));
  const seen = new Set<string>();
  const links: Link[] = [];
  for (const p of routers) {
    for (const n of p.router.neighbors) {
      const other = n.routerId ? byId.get(n.routerId) : undefined;
      if (!other) continue;
      const key = [p.router.id, other.router.id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ a: p, b: other });
    }
  }

  const width = PAD * 2 + cols * COL.w + (cols - 1) * COL.gap;
  const height = used.length ? rowTop - ROW_GAP + PAD : PAD * 2;
  return { width, height, sites: labels, routers, devices, links };
}

/** Curve between two router cards: across columns edge to edge, or a bulge to the right within one column. */
export function linkPath(a: PlacedRouter, b: PlacedRouter): string {
  const [l, r] = a.x <= b.x ? [a, b] : [b, a];
  const ly = l.y + l.h / 2;
  const ry = r.y + r.h / 2;
  if (l.x === r.x) {
    const x = l.x + l.w;
    const bulge = 34;
    return `M${x},${ly} C${x + bulge},${ly} ${x + bulge},${ry} ${x},${ry}`;
  }
  const x1 = l.x + l.w;
  const x2 = r.x;
  const mid = (x1 + x2) / 2;
  return `M${x1},${ly} C${mid},${ly} ${mid},${ry} ${x2},${ry}`;
}
