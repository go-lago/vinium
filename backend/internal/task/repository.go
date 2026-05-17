package task

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrTaskNotFound = errors.New("task not found")

type Repository interface {
	Create(t *Task) error
	FindByID(id uuid.UUID) (*Task, error)
	FindByUserID(userID uuid.UUID, filter ListFilter) ([]Task, error)
	Update(t *Task) error
	Delete(id uuid.UUID, userID uuid.UUID) error
}

type ListFilter struct {
	Status   string
	Priority string
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(t *Task) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return r.db.Create(t).Error
}

func (r *repository) FindByID(id uuid.UUID) (*Task, error) {
	var t Task
	err := r.db.First(&t, "id = ?", id).Error
	return &t, err
}

func (r *repository) FindByUserID(userID uuid.UUID, filter ListFilter) ([]Task, error) {
	tasks := make([]Task, 0)
	q := r.db.Where("user_id = ?", userID)
	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.Priority != "" {
		q = q.Where("priority = ?", filter.Priority)
	}
	err := q.Order("created_at DESC").Find(&tasks).Error
	return tasks, err
}

func (r *repository) Update(t *Task) error {
	return r.db.Save(t).Error
}

func (r *repository) Delete(id uuid.UUID, userID uuid.UUID) error {
	result := r.db.Delete(&Task{}, "id = ? AND user_id = ?", id, userID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrTaskNotFound
	}
	return nil
}
