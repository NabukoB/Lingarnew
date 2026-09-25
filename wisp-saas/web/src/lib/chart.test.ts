import { describe, expect, it } from "vitest";
import { areaPath, linePath, niceMax, pointAt } from "./chart";

const box = { x0: 0, x1: 100, y0: 100, height: 100, max: 10 };

describe("pointAt", () => {
  it("spreads points across the width", () => {
    expect(pointAt([0, 5, 10], 0, box)).toEqual({ x: 0, y: 100 });
    expect(pointAt([0, 5, 10], 1, box)).toEqual({ x: 50, y: 50 });
    expect(pointAt([0, 5, 10], 2, box)).toEqual({ x: 100, y: 0 });
  });
  it("clamps values above max", () => expect(pointAt([20], 0, box).y).toBe(0));
});

describe("linePath / areaPath", () => {
  it("draws M then L segments", () => expect(linePath([0, 10], box)).toBe("M0.0,100.0 L100.0,0.0"));
  it("closes the area to the baseline", () =>
    expect(areaPath([0, 10], box)).toBe("M0.0,100.0 L100.0,0.0 L100,100 L0,100 Z"));
  it("returns empty for no data", () => expect(areaPath([], box)).toBe(""));
});

describe("niceMax", () => {
  it.each([
    [[24600], 25000],
    [[1600], 2000],
    [[0], 1],
    [[7], 10],
  ])("%j → %d", (values, want) => expect(niceMax(values)).toBe(want));
});
