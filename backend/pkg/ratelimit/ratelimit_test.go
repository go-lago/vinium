package ratelimit_test

import (
	"sync"
	"sync/atomic"
	"testing"

	"github.com/nkrus/vinium/pkg/ratelimit"
)

func TestSlidingWindow(t *testing.T) {
	l := ratelimit.New(5, 0) // 5/min, no daily cap
	defer l.Stop()

	for i := range 5 {
		if !l.Allow("user1") {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	if l.Allow("user1") {
		t.Fatal("6th request should be denied")
	}
}

func TestDailyCap(t *testing.T) {
	l := ratelimit.New(1000, 3) // high per-minute, 3/day cap
	defer l.Stop()

	for i := range 3 {
		if !l.Allow("user1") {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	if l.Allow("user1") {
		t.Fatal("4th request should be denied by daily cap")
	}
}

func TestPerKeyIsolation(t *testing.T) {
	l := ratelimit.New(2, 0)
	defer l.Stop()

	l.Allow("a")
	l.Allow("a")
	if l.Allow("a") {
		t.Fatal("3rd request for 'a' should be denied")
	}
	// 'b' has its own bucket
	if !l.Allow("b") {
		t.Fatal("first request for 'b' should be allowed")
	}
}

func TestConcurrent(t *testing.T) {
	const workers = 20
	const limit = 5

	l := ratelimit.New(limit, 0)
	defer l.Stop()

	var allowed atomic.Int32
	var wg sync.WaitGroup
	wg.Add(workers)
	for range workers {
		go func() {
			defer wg.Done()
			if l.Allow("shared") {
				allowed.Add(1)
			}
		}()
	}
	wg.Wait()

	if got := allowed.Load(); got != limit {
		t.Errorf("concurrent: %d allowed, want exactly %d", got, limit)
	}
}
