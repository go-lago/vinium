package note

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	Create(n *Note) error
	FindByID(id uuid.UUID) (*Note, error)
	FindByUserID(userID uuid.UUID) ([]Note, error)
	Update(n *Note) error
	Delete(id uuid.UUID, userID uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(n *Note) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return r.db.Create(n).Error
}

func (r *repository) FindByID(id uuid.UUID) (*Note, error) {
	var n Note
	err := r.db.First(&n, "id = ?", id).Error
	return &n, err
}

func (r *repository) FindByUserID(userID uuid.UUID) ([]Note, error) {
	var notes []Note
	err := r.db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&notes).Error
	return notes, err
}

func (r *repository) Update(n *Note) error {
	return r.db.Save(n).Error
}

func (r *repository) Delete(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Delete(&Note{}, "id = ? AND user_id = ?", id, userID).Error
}
