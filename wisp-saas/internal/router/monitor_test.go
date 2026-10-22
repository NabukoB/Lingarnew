package router

import (
	"testing"
	"time"
)

func TestBitsPerSecond(t *testing.T) {
	if got := BitsPerSecond(1000, 1000+125_000, time.Second); got == nil || *got != 1_000_000 {
		t.Fatalf("1 Mbit/s: got %v", got)
	}
	if got := BitsPerSecond(0, 7_500_000, time.Minute); got == nil || *got != 1_000_000 {
		t.Fatalf("over a minute: got %v", got)
	}
	for _, c := range []struct {
		prev, cur int64
		gap       time.Duration
	}{{500, 100, time.Minute}, {0, 10, 0}, {0, 10, 11 * time.Minute}} {
		if got := BitsPerSecond(c.prev, c.cur, c.gap); got != nil {
			t.Errorf("BitsPerSecond(%d,%d,%s) = %d, want nil", c.prev, c.cur, c.gap, *got)
		}
	}
}

func TestMemUsedPercent(t *testing.T) {
	if got := MemUsedPercent(256, 1024); got != 75 {
		t.Fatalf("got %d", got)
	}
	if MemUsedPercent(1, 0) != 0 || MemUsedPercent(2048, 1024) != 0 {
		t.Fatal("bad totals must give 0")
	}
}

func TestHighCPUStarted(t *testing.T) {
	run := func(n int, v int16) []int16 {
		out := make([]int16, n)
		for i := range out {
			out[i] = v
		}
		return out
	}
	if HighCPUStarted(run(HighCPUSamples-1, 99)) {
		t.Fatal("too few samples")
	}
	if !HighCPUStarted(run(HighCPUSamples, 95)) {
		t.Fatal("exactly the threshold on a new router should fire")
	}
	if !HighCPUStarted(append(run(HighCPUSamples, 95), 20)) {
		t.Fatal("first time over the threshold should fire")
	}
	if HighCPUStarted(run(HighCPUSamples+1, 95)) {
		t.Fatal("an ongoing episode must not fire again")
	}
	mixed := append(run(HighCPUSamples, 95), 20)
	mixed[3] = 40
	if HighCPUStarted(mixed) {
		t.Fatal("a dip breaks the run")
	}
}
