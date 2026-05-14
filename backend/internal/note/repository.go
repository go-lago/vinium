package note

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrNoteNotFound = errors.New("note not found")

type Repository interface {
	Create(n *Note) error
	FindByID(id uuid.UUID) (*Note, error)
	FindSummaryByUserID(userID uuid.UUID, page, perPage int) ([]NoteSummary, error)
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

func (r *repository) FindSummaryByUserID(userID uuid.UUID, page, perPage int) ([]NoteSummary, error) {
	if perPage < 1 {
		perPage = 50
	}
	if perPage > 100 {
		perPage = 100
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * perPage

	var summaries []NoteSummary
	err := r.db.Model(&Note{}).
		Select("id, user_id, title, content_plain, content_version, type, tags, is_pinned, created_at, updated_at").
		Where("user_id = ?", userID).
		Order("is_pinned DESC, updated_at DESC").
		Limit(perPage).
		Offset(offset).
		Scan(&summaries).Error
	return summaries, err
}

func (r *repository) Update(n *Note) error {
	return r.db.Save(n).Error
}

func (r *repository) Delete(id uuid.UUID, userID uuid.UUID) error {
	result := r.db.Delete(&Note{}, "id = ? AND user_id = ?", id, userID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNoteNotFound
	}
	return nil
}
