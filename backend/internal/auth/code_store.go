package auth

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type codeEntry struct {
	value     string
	expiresAt time.Time
}

type codeStore struct {
	mu    sync.Mutex
	codes map[string]codeEntry
}

func newCodeStore() *codeStore {
	return &codeStore{codes: make(map[string]codeEntry)}
}

func (s *codeStore) store(value string, ttl time.Duration) (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	code := hex.EncodeToString(b)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.codes[code] = codeEntry{value: value, expiresAt: time.Now().Add(ttl)}
	return code, nil
}

// consume finds and deletes the code atomically; returns false if missing or expired.
func (s *codeStore) consume(code string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.codes[code]
	delete(s.codes, code)
	if !ok || time.Now().After(entry.expiresAt) {
		return "", false
	}
	return entry.value, true
}
