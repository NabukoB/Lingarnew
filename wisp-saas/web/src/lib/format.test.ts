import { describe, expect, it } from "vitest";
import {
  chartTime,
  formatBps,
  formatCountdown,
  formatDelta,
  formatKsh,
  formatKshShort,
  isMpesaReceipt,
  normalizeKenyanPhone,
  percentChange,
} from "./format";

describe("formatKsh", () => {
  it("adds thousands separators", () => expect(formatKsh(18420)).toBe("KSh 18,420"));
  it("rounds", () => expect(formatKsh(59.6)).toBe("KSh 60"));
});

describe("formatKshShort", () => {
  it("uses K for thousands", () => expect(formatKshShort(542200)).toBe("KSh 542.2K"));
  it("uses M for millions", () => expect(formatKshShort(1_250_000)).toBe("KSh 1.3M"));
  it("keeps small amounts whole", () => expect(formatKshShort(60)).toBe("KSh 60"));
});

describe("percentChange / formatDelta", () => {
  it("computes growth", () => expect(percentChange(18420, 17200)).toBeCloseTo(7.093, 2));
  it("guards divide by zero", () => expect(percentChange(5, 0)).toBe(0));
  it("formats up and down", () => {
    expect(formatDelta(7.09)).toBe("▲ 7.1%");
    expect(formatDelta(-3.31)).toBe("▼ 3.3%");
  });
});

describe("normalizeKenyanPhone", () => {
  it.each([
    ["0712 345 678", "254712345678"],
    ["+254712345678", "254712345678"],
    ["254112345678", "254112345678"],
    ["712345678", "254712345678"],
    ["0112-345-678", "254112345678"],
  ])("%s → %s", (input, want) => expect(normalizeKenyanPhone(input)).toBe(want));

  it.each(["0812345678", "12345", "2547123456789", "abc"])("rejects %s", (input) =>
    expect(normalizeKenyanPhone(input)).toBeNull(),
  );
});

describe("isMpesaReceipt", () => {
  it("accepts 10 letters and digits", () => expect(isMpesaReceipt("RKT8765432")).toBe(true));
  it("is case-insensitive", () => expect(isMpesaReceipt("rkt8765432")).toBe(true));
  it("rejects wrong length", () => expect(isMpesaReceipt("RKT876543")).toBe(false));
});

describe("formatCountdown", () => {
  it("shows h:mm above an hour", () => expect(formatCountdown(86280)).toBe("23:58"));
  it("shows m:ss below an hour", () => expect(formatCountdown(24)).toBe("0:24"));
  it("never goes negative", () => expect(formatCountdown(-5)).toBe("0:00"));
});

describe("formatBps", () => {
  it("picks the unit", () => {
    expect(formatBps(850_000)).toBe("850 kbps");
    expect(formatBps(12_400_000)).toBe("12.4 Mbps");
    expect(formatBps(20_000_000)).toBe("20 Mbps");
    expect(formatBps(1_230_000_000)).toBe("1.2 Gbps");
    expect(formatBps(300)).toBe("300 bps");
  });
});

describe("chartTime", () => {
  const iso = "2026-10-12T11:05:00Z"; // 14:05 in Nairobi
  it("shows the time for day views", () => expect(chartTime(iso, false)).toBe("14:05"));
  it("shows the date for longer views", () => expect(chartTime(iso, true)).toBe("12 Oct"));
  it("can show both", () => expect(chartTime(iso, true, true)).toBe("12 Oct, 14:05"));
});
