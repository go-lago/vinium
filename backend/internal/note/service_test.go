package note_test

import (
	"errors"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/nkrus/vinium/internal/note"
	"gorm.io/gorm"
)

// ── Mock repository ──────────────────────────────────────────────────────────

type mockRepo struct {
	mu    sync.Mutex
	notes map[uuid.UUID]*note.Note
}

func newMockRepo() *mockRepo {
	return &mockRepo{notes: make(map[uuid.UUID]*note.Note)}
}

func (m *mockRepo) Create(n *note.Note) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	cp := *n
	m.notes[n.ID] = &cp
	return nil
}

func (m *mockRepo) FindByID(id uuid.UUID) (*note.Note, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n, ok := m.notes[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	cp := *n
	return &cp, nil
}

func (m *mockRepo) FindSummaryByUserID(userID uuid.UUID, _, _ int, _ note.ListFilter) ([]note.NoteSummary, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []note.NoteSummary
	for _, n := range m.notes {
		if n.UserID == userID {
			out = append(out, note.NoteSummary{ID: n.ID, UserID: n.UserID, Title: n.Title})
		}
	}
	return out, nil
}

func (m *mockRepo) Search(userID uuid.UUID, _ string, page, perPage int, filter note.ListFilter) ([]note.NoteSummary, error) {
	return m.FindSummaryByUserID(userID, page, perPage, filter)
}

func (m *mockRepo) Update(n *note.Note) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.notes[n.ID]; !ok {
		return gorm.ErrRecordNotFound
	}
	cp := *n
	m.notes[n.ID] = &cp
	return nil
}

func (m *mockRepo) Delete(id uuid.UUID, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	n, ok := m.notes[id]
	if !ok || n.UserID != userID {
		return note.ErrNoteNotFound
	}
	delete(m.notes, id)
	return nil
}

// ── Cross-user isolation ─────────────────────────────────────────────────────

func TestGetByID_CrossUserDenied(t *testing.T) {
	svc := note.NewService(newMockRepo())
	userA, userB := uuid.New(), uuid.New()

	n, err := svc.Create(note.CreateInput{UserID: userA, Title: "secret"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	// userB must not see userA's note
	if _, err := svc.GetByID(n.ID, userB); !errors.Is(err, note.ErrNoteNotFound) {
		t.Errorf("expected ErrNoteNotFound for cross-user GetByID, got %v", err)
	}

	// userA sees their own note
	got, err := svc.GetByID(n.ID, userA)
	if err != nil {
		t.Fatalf("userA.GetByID: %v", err)
	}
	if got.ID != n.ID {
		t.Errorf("returned wrong note")
	}
}

// ── Delete ───────────────────────────────────────────────────────────────────

func TestDelete_NotFound(t *testing.T) {
	svc := note.NewService(newMockRepo())

	err := svc.Delete(uuid.New(), uuid.New())
	if !errors.Is(err, note.ErrNoteNotFound) {
		t.Errorf("expected ErrNoteNotFound, got %v", err)
	}
}

func TestDelete_CrossUserDenied(t *testing.T) {
	svc := note.NewService(newMockRepo())
	userA, userB := uuid.New(), uuid.New()

	n, _ := svc.Create(note.CreateInput{UserID: userA, Title: "private"})

	// userB cannot delete userA's note
	if err := svc.Delete(n.ID, userB); !errors.Is(err, note.ErrNoteNotFound) {
		t.Errorf("expected ErrNoteNotFound for cross-user delete, got %v", err)
	}

	// note still exists for userA
	if _, err := svc.GetByID(n.ID, userA); err != nil {
		t.Errorf("note should survive cross-user delete attempt: %v", err)
	}
}

// ── List isolation ───────────────────────────────────────────────────────────

func TestList_OnlyOwnerNotes(t *testing.T) {
	svc := note.NewService(newMockRepo())
	userA, userB := uuid.New(), uuid.New()

	svc.Create(note.CreateInput{UserID: userA, Title: "A1"}) //nolint:errcheck
	svc.Create(note.CreateInput{UserID: userA, Title: "A2"}) //nolint:errcheck
	svc.Create(note.CreateInput{UserID: userB, Title: "B1"}) //nolint:errcheck

	listA, err := svc.List(note.ListInput{UserID: userA, Page: 1, PerPage: 50})
	if err != nil {
		t.Fatalf("List userA: %v", err)
	}
	if len(listA) != 2 {
		t.Errorf("userA: want 2 notes, got %d", len(listA))
	}
	for _, s := range listA {
		if s.UserID != userA {
			t.Errorf("userA list contains note owned by %s", s.UserID)
		}
	}

	listB, err := svc.List(note.ListInput{UserID: userB, Page: 1, PerPage: 50})
	if err != nil {
		t.Fatalf("List userB: %v", err)
	}
	if len(listB) != 1 {
		t.Errorf("userB: want 1 note, got %d", len(listB))
	}
}
