package auth_test

import (
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nkrus/vinium/internal/auth"
	"github.com/nkrus/vinium/internal/user"
	"gorm.io/gorm"
)

// ── Mock user.Repository ─────────────────────────────────────────────────────

type mockUserRepo struct {
	mu            sync.Mutex
	users         map[uuid.UUID]*user.User
	refreshToken  *user.RefreshToken // single active token for testing
	claimed       bool
	createdTokens []*user.RefreshToken
}

func newMockUserRepo(u *user.User, rt *user.RefreshToken) *mockUserRepo {
	return &mockUserRepo{
		users:        map[uuid.UUID]*user.User{u.ID: u},
		refreshToken: rt,
	}
}

func (m *mockUserRepo) Create(u *user.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	m.users[u.ID] = u
	return nil
}

func (m *mockUserRepo) FindByID(id uuid.UUID) (*user.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.users[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return u, nil
}

func (m *mockUserRepo) FindByEmail(_ string) (*user.User, error) { return nil, gorm.ErrRecordNotFound }
func (m *mockUserRepo) FindByGoogleID(_ string) (*user.User, error) {
	return nil, gorm.ErrRecordNotFound
}
func (m *mockUserRepo) Update(u *user.User) error { return nil }

// ClaimRefreshToken atomically claims the token — first call succeeds, rest fail.
// This mirrors the DB transaction behaviour enforced by ClaimRefreshToken in production.
func (m *mockUserRepo) ClaimRefreshToken(token string) (*user.RefreshToken, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.claimed || m.refreshToken == nil || m.refreshToken.Token != token {
		return nil, gorm.ErrRecordNotFound
	}
	m.claimed = true
	return m.refreshToken, nil
}

func (m *mockUserRepo) FindRefreshToken(_ string) (*user.RefreshToken, error) {
	return nil, gorm.ErrRecordNotFound
}

func (m *mockUserRepo) CreateRefreshToken(t *user.RefreshToken) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.createdTokens = append(m.createdTokens, t)
	return nil
}

func (m *mockUserRepo) DeleteRefreshToken(_ string) error           { return nil }
func (m *mockUserRepo) DeleteExpiredRefreshTokens(_ uuid.UUID) error { return nil }

// ── Concurrent refresh rotation ──────────────────────────────────────────────

// TestRefresh_ConcurrentRotation verifies that when N goroutines simultaneously
// try to refresh the same token, exactly one succeeds and the rest get an error.
// This guards against the double-spend race condition fixed by ClaimRefreshToken.
func TestRefresh_ConcurrentRotation(t *testing.T) {
	const N = 20
	const refreshToken = "shared-refresh-token"

	userID := uuid.New()
	u := &user.User{ID: userID, Email: "test@example.com"}
	rt := &user.RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(time.Hour),
	}

	repo := newMockUserRepo(u, rt)
	tokenSvc := auth.NewTokenService("test-secret-key-min-32-chars-long", 15*time.Minute)
	svc := auth.NewService(repo, tokenSvc, 7*24*time.Hour)

	var wg sync.WaitGroup
	errs := make([]error, N)

	for i := range N {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := svc.Refresh(refreshToken)
			errs[i] = err
		}(i)
	}
	wg.Wait()

	successes := 0
	for _, err := range errs {
		if err == nil {
			successes++
		}
	}

	if successes != 1 {
		t.Errorf("concurrent refresh: expected exactly 1 success, got %d", successes)
	}
}
