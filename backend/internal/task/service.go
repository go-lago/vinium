package task

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

type CreateInput struct {
	UserID      uuid.UUID
	Title       string
	Description string
	Status      Status
	Priority    Priority
	DueDate     *time.Time
	NoteID      *uuid.UUID
}

type UpdateInput struct {
	Title       string
	Description string
	Status      Status
	Priority    Priority
	DueDate     *time.Time
	NoteID      *uuid.UUID
}

func (s *Service) Create(in CreateInput) (*Task, error) {
	status := in.Status
	if status == "" {
		status = StatusTodo
	}
	priority := in.Priority
	if priority == "" {
		priority = PriorityNone
	}
	t := &Task{
		UserID:      in.UserID,
		Title:       in.Title,
		Description: in.Description,
		Status:      status,
		Priority:    priority,
		DueDate:     in.DueDate,
		NoteID:      in.NoteID,
	}
	if err := s.repo.Create(t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *Service) GetByID(id, userID uuid.UUID) (*Task, error) {
	t, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTaskNotFound
		}
		return nil, err
	}
	if t.UserID != userID {
		return nil, ErrTaskNotFound
	}
	return t, nil
}

func (s *Service) List(userID uuid.UUID, filter ListFilter) ([]Task, error) {
	return s.repo.FindByUserID(userID, filter)
}

func (s *Service) Update(id, userID uuid.UUID, in UpdateInput) (*Task, error) {
	t, err := s.GetByID(id, userID)
	if err != nil {
		return nil, err
	}
	t.Title = in.Title
	t.Description = in.Description
	t.Status = in.Status
	t.Priority = in.Priority
	t.DueDate = in.DueDate
	t.NoteID = in.NoteID
	if err := s.repo.Update(t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *Service) Delete(id, userID uuid.UUID) error {
	return s.repo.Delete(id, userID)
}
