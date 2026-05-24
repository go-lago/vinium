package task

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Status string
type Priority string

const (
	StatusInbox      Status = "inbox"
	StatusTodo       Status = "todo"
	StatusInProgress Status = "in_progress"
	StatusDone       Status = "done"
	StatusCancelled  Status = "cancelled"

	PriorityNone   Priority = "none"
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
)

type Task struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Title       string         `gorm:"not null;default:''" json:"title"`
	Description string         `gorm:"type:text;not null;default:''" json:"description"`
	Status      Status         `gorm:"not null;default:'todo'" json:"status"`
	Priority    Priority       `gorm:"not null;default:'none'" json:"priority"`
	DueDate     *time.Time     `json:"due_date"`
	NoteID      *uuid.UUID     `gorm:"type:uuid" json:"note_id"`
	ContextID   *uuid.UUID     `gorm:"type:uuid" json:"context_id"`
	ProjectID   *uuid.UUID     `gorm:"type:uuid" json:"project_id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
