package task_test

import (
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nkrus/vinium/internal/task"
	"gorm.io/gorm"
)

// ── Mock repository ──────────────────────────────────────────────────────────

type mockRepo struct {
	mu    sync.Mutex
	tasks map[uuid.UUID]*task.Task
}

func newMockRepo() *mockRepo {
	return &mockRepo{tasks: make(map[uuid.UUID]*task.Task)}
}

func (m *mockRepo) Create(t *task.Task) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	cp := *t
	m.tasks[t.ID] = &cp
	return nil
}

func (m *mockRepo) FindByID(id uuid.UUID) (*task.Task, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	t, ok := m.tasks[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	cp := *t
	return &cp, nil
}

func (m *mockRepo) FindByUserID(userID uuid.UUID, filter task.ListFilter) ([]task.Task, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []task.Task
	for _, t := range m.tasks {
		if t.UserID != userID {
			continue
		}
		if filter.Status != "" && string(t.Status) != filter.Status {
			continue
		}
		if filter.Priority != "" && string(t.Priority) != filter.Priority {
			continue
		}
		out = append(out, *t)
	}
	return out, nil
}

func (m *mockRepo) Update(t *task.Task) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.tasks[t.ID]; !ok {
		return gorm.ErrRecordNotFound
	}
	cp := *t
	m.tasks[t.ID] = &cp
	return nil
}

func (m *mockRepo) Delete(id uuid.UUID, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	t, ok := m.tasks[id]
	if !ok || t.UserID != userID {
		return task.ErrTaskNotFound
	}
	delete(m.tasks, id)
	return nil
}

// ── Cross-user isolation ─────────────────────────────────────────────────────

func TestGetByID_CrossUserDenied(t *testing.T) {
	svc := task.NewService(newMockRepo())
	userA, userB := uuid.New(), uuid.New()

	tk, err := svc.Create(task.CreateInput{UserID: userA, Title: "secret"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if _, err := svc.GetByID(tk.ID, userB); !errors.Is(err, task.ErrTaskNotFound) {
		t.Errorf("expected ErrTaskNotFound for cross-user GetByID, got %v", err)
	}

	got, err := svc.GetByID(tk.ID, userA)
	if err != nil {
		t.Fatalf("userA.GetByID: %v", err)
	}
	if got.ID != tk.ID {
		t.Errorf("returned wrong task")
	}
}

// ── Delete ───────────────────────────────────────────────────────────────────

func TestDelete_NotFound(t *testing.T) {
	svc := task.NewService(newMockRepo())

	err := svc.Delete(uuid.New(), uuid.New())
	if !errors.Is(err, task.ErrTaskNotFound) {
		t.Errorf("expected ErrTaskNotFound, got %v", err)
	}
}

func TestDelete_CrossUserDenied(t *testing.T) {
	svc := task.NewService(newMockRepo())
	userA, userB := uuid.New(), uuid.New()

	tk, _ := svc.Create(task.CreateInput{UserID: userA, Title: "private"})

	if err := svc.Delete(tk.ID, userB); !errors.Is(err, task.ErrTaskNotFound) {
		t.Errorf("expected ErrTaskNotFound for cross-user delete, got %v", err)
	}

	if _, err := svc.GetByID(tk.ID, userA); err != nil {
		t.Errorf("task should survive cross-user delete attempt: %v", err)
	}
}

// ── List isolation ───────────────────────────────────────────────────────────

func TestList_OnlyOwnerTasks(t *testing.T) {
	svc := task.NewService(newMockRepo())
	userA, userB := uuid.New(), uuid.New()

	svc.Create(task.CreateInput{UserID: userA, Title: "A1"}) //nolint:errcheck
	svc.Create(task.CreateInput{UserID: userA, Title: "A2"}) //nolint:errcheck
	svc.Create(task.CreateInput{UserID: userB, Title: "B1"}) //nolint:errcheck

	listA, err := svc.List(userA, task.ListFilter{})
	if err != nil {
		t.Fatalf("List userA: %v", err)
	}
	if len(listA) != 2 {
		t.Errorf("userA: want 2 tasks, got %d", len(listA))
	}

	listB, err := svc.List(userB, task.ListFilter{})
	if err != nil {
		t.Fatalf("List userB: %v", err)
	}
	if len(listB) != 1 {
		t.Errorf("userB: want 1 task, got %d", len(listB))
	}
}

// ── Status filter ─────────────────────────────────────────────────────────────

func TestList_FilterByStatus(t *testing.T) {
	svc := task.NewService(newMockRepo())
	uid := uuid.New()

	svc.Create(task.CreateInput{UserID: uid, Title: "T1", Status: task.StatusTodo})       //nolint:errcheck
	svc.Create(task.CreateInput{UserID: uid, Title: "T2", Status: task.StatusTodo})       //nolint:errcheck
	svc.Create(task.CreateInput{UserID: uid, Title: "T3", Status: task.StatusInProgress}) //nolint:errcheck
	svc.Create(task.CreateInput{UserID: uid, Title: "T4", Status: task.StatusDone})       //nolint:errcheck

	todos, _ := svc.List(uid, task.ListFilter{Status: "todo"})
	if len(todos) != 2 {
		t.Errorf("want 2 todo tasks, got %d", len(todos))
	}

	inProgress, _ := svc.List(uid, task.ListFilter{Status: "in_progress"})
	if len(inProgress) != 1 {
		t.Errorf("want 1 in_progress task, got %d", len(inProgress))
	}
}

// ── Priority filter ───────────────────────────────────────────────────────────

func TestList_FilterByPriority(t *testing.T) {
	svc := task.NewService(newMockRepo())
	uid := uuid.New()

	svc.Create(task.CreateInput{UserID: uid, Title: "H1", Priority: task.PriorityHigh})   //nolint:errcheck
	svc.Create(task.CreateInput{UserID: uid, Title: "H2", Priority: task.PriorityHigh})   //nolint:errcheck
	svc.Create(task.CreateInput{UserID: uid, Title: "L1", Priority: task.PriorityLow})    //nolint:errcheck

	highs, _ := svc.List(uid, task.ListFilter{Priority: "high"})
	if len(highs) != 2 {
		t.Errorf("want 2 high priority tasks, got %d", len(highs))
	}
}

// ── Status transition ─────────────────────────────────────────────────────────

func TestUpdate_StatusTransition(t *testing.T) {
	svc := task.NewService(newMockRepo())
	uid := uuid.New()

	tk, _ := svc.Create(task.CreateInput{UserID: uid, Title: "Do it"})
	if tk.Status != task.StatusTodo {
		t.Errorf("new task should be todo, got %s", tk.Status)
	}

	updated, err := svc.Update(tk.ID, uid, task.UpdateInput{
		Title:    tk.Title,
		Status:   task.StatusInProgress,
		Priority: tk.Priority,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Status != task.StatusInProgress {
		t.Errorf("want in_progress, got %s", updated.Status)
	}

	done, _ := svc.Update(tk.ID, uid, task.UpdateInput{
		Title:    tk.Title,
		Status:   task.StatusDone,
		Priority: tk.Priority,
	})
	if done.Status != task.StatusDone {
		t.Errorf("want done, got %s", done.Status)
	}
}

// ── Due date ──────────────────────────────────────────────────────────────────

func TestCreate_WithDueDate(t *testing.T) {
	svc := task.NewService(newMockRepo())
	uid := uuid.New()

	due := time.Now().Add(24 * time.Hour)
	tk, err := svc.Create(task.CreateInput{
		UserID:  uid,
		Title:   "Urgent",
		DueDate: &due,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if tk.DueDate == nil {
		t.Error("due_date should be set")
	}
	if !tk.DueDate.Equal(due) {
		t.Errorf("due_date mismatch: want %v, got %v", due, *tk.DueDate)
	}
}
