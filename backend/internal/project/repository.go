package project

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrProjectNotFound = errors.New("project not found")

type Repository interface {
	Create(p *Project) error
	FindByID(id uuid.UUID) (*Project, error)
	FindByContextID(contextID uuid.UUID) ([]Project, error)
	Update(p *Project) error
	Delete(id uuid.UUID, userID uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(p *Project) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return r.db.Create(p).Error
}

func (r *repository) FindByID(id uuid.UUID) (*Project, error) {
	var p Project
	err := r.db.First(&p, "id = ?", id).Error
	return &p, err
}

func (r *repository) FindByContextID(contextID uuid.UUID) ([]Project, error) {
	var out []Project
	err := r.db.Where("context_id = ?", contextID).Order("sort_order ASC, created_at ASC").Find(&out).Error
	return out, err
}

func (r *repository) Update(p *Project) error {
	return r.db.Save(p).Error
}

func (r *repository) Delete(id uuid.UUID, userID uuid.UUID) error {
	result := r.db.Delete(&Project{}, "id = ? AND user_id = ?", id, userID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrProjectNotFound
	}
	return nil
}
