package ratelimit

import (
	"sync"
	"time"
)

type entry struct {
	minuteWindow []time.Time
	dayCount     int
	dayReset     time.Time
	lastSeen     time.Time
}

// Limiter is an in-memory per-key rate limiter.
// minuteLimit: max requests per 60-second sliding window.
// dayLimit: max requests per UTC day (0 = no daily cap).
type Limiter struct {
	mu          sync.Mutex
	entries     map[string]*entry
	minuteLimit int
	dayLimit    int
	stopCh      chan struct{}
}

func New(minuteLimit, dayLimit int) *Limiter {
	l := &Limiter{
		entries:     make(map[string]*entry),
		minuteLimit: minuteLimit,
		dayLimit:    dayLimit,
		stopCh:      make(chan struct{}),
	}
	go l.sweep()
	return l
}

// Stop terminates the background sweep goroutine.
func (l *Limiter) Stop() {
	close(l.stopCh)
}

// Allow returns true if the key is within rate limits and records the request.
func (l *Limiter) Allow(key string) bool {
	now := time.Now().UTC()
	l.mu.Lock()
	defer l.mu.Unlock()

	e := l.entries[key]
	if e == nil {
		e = &entry{dayReset: nextMidnight(now)}
		l.entries[key] = e
	}
	e.lastSeen = now

	if now.After(e.dayReset) {
		e.dayCount = 0
		e.dayReset = nextMidnight(now)
	}

	// Evict timestamps outside the 1-minute window.
	cutoff := now.Add(-time.Minute)
	i := 0
	for i < len(e.minuteWindow) && e.minuteWindow[i].Before(cutoff) {
		i++
	}
	e.minuteWindow = e.minuteWindow[i:]

	if len(e.minuteWindow) >= l.minuteLimit {
		return false
	}
	if l.dayLimit > 0 && e.dayCount >= l.dayLimit {
		return false
	}

	e.minuteWindow = append(e.minuteWindow, now)
	e.dayCount++
	return true
}

func (l *Limiter) sweep() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			l.mu.Lock()
			cutoff := time.Now().UTC().Add(-24 * time.Hour)
			for k, e := range l.entries {
				if e.lastSeen.Before(cutoff) {
					delete(l.entries, k)
				}
			}
			l.mu.Unlock()
		case <-l.stopCh:
			return
		}
	}
}

func nextMidnight(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d+1, 0, 0, 0, 0, time.UTC)
}
