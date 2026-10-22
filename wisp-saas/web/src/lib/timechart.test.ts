import { describe, expect, it } from "vitest";
import { nearestIndex, niceTop, timeArea, timeLine, xOf, yOf, type Scale } from "./timechart";

const s: Scale = { t0: 0, t1: 100, x0: 0, x1: 200, yTop: 0, yBase: 100, max: 50 };

describe("scales", () => {
  it("maps time to x", () => {
    expect(xOf(0, s)).toBe(0);
    expect(xOf(50, s)).toBe(100);
    expect(xOf(100, s)).toBe(200);
  });
  it("maps value to y and clamps", () => {
    expect(yOf(0, s)).toBe(100);
    expect(yOf(25, s)).toBe(50);
    expect(yOf(80, s)).toBe(0);
    expect(yOf(-5, s)).toBe(100);
  });
});

describe("timeLine", () => {
  it("draws a continuous line", () => {
    expect(timeLine([0, 10, 20], [0, 25, 50], s, 15)).toBe("M0.0,100.0L20.0,50.0L40.0,0.0");
  });
  it("lifts the pen over a gap", () => {
    expect(timeLine([0, 10, 60], [0, 0, 0], s, 15)).toBe("M0.0,100.0L20.0,100.0M120.0,100.0");
  });
});

describe("timeArea", () => {
  it("closes each run to the baseline and skips lone points", () => {
    const d = timeArea([0, 10, 60], [50, 50, 50], s, 15);
    expect(d).toBe("M0.0,0.0L20.0,0.0L20.0,100L0.0,100Z");
  });
});

describe("nearestIndex", () => {
  it("finds the closest time", () => {
    expect(nearestIndex([0, 10, 20, 30], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20, 30], 16)).toBe(2);
    expect(nearestIndex([0, 10, 20, 30], -5)).toBe(0);
    expect(nearestIndex([0, 10, 20, 30], 99)).toBe(3);
    expect(nearestIndex([], 5)).toBe(-1);
  });
});

describe("niceTop", () => {
  it("rounds up to a clean step", () => {
    expect(niceTop(0)).toBe(1);
    expect(niceTop(37)).toBe(50);
    expect(niceTop(120)).toBe(200);
    expect(niceTop(23_000_000)).toBe(25_000_000);
  });
});
