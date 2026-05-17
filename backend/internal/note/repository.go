package note

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrNoteNotFound = errors.New("note not found")

type ListFilter struct {
	ContextID string
	ProjectID string
}

type Repository interface {
	Create(n *Note) error
	FindByID(id uuid.UUID) (*Note, error)
	FindSummaryByUserID(userID uuid.UUID, page, perPage int, filter ListFilter) ([]NoteSummary, error)
	Search(userID uuid.UUID, query string, page, perPage int, filter ListFilter) ([]NoteSummary, error)
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

func (r *repository) FindSummaryByUserID(userID uuid.UUID, page, perPage int, filter ListFilter) ([]NoteSummary, error) {
	page, perPage = clampPage(page, perPage)
	summaries := make([]NoteSummary, 0)
	q := r.db.Model(&Note{}).
		Select("id, user_id, title, content_plain, content_version, type, tags, is_pinned, created_at, updated_at").
		Where("user_id = ?", userID)
	q = applyNoteFilter(q, filter)
	err := q.Order("is_pinned DESC, updated_at DESC").
		Limit(perPage).
		Offset((page - 1) * perPage).
		Scan(&summaries).Error
	return summaries, err
}

func (r *repository) Search(userID uuid.UUID, query string, page, perPage int, filter ListFilter) ([]NoteSummary, error) {
	page, perPage = clampPage(page, perPage)
	summaries := make([]NoteSummary, 0)
	q := r.db.Model(&Note{}).
		Select("id, user_id, title, content_plain, content_version, type, tags, is_pinned, created_at, updated_at").
		Where("user_id = ?", userID).
		Where(
			"to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_plain,'')) @@ plainto_tsquery('simple', ?)",
			query,
		)
	q = applyNoteFilter(q, filter)
	err := q.Order("is_pinned DESC, updated_at DESC").
		Limit(perPage).
		Offset((page - 1) * perPage).
		Scan(&summaries).Error
	return summaries, err
}

func applyNoteFilter(q *gorm.DB, filter ListFilter) *gorm.DB {
	if filter.ContextID != "" {
		q = q.Where("context_id = ?", filter.ContextID)
	}
	if filter.ProjectID != "" {
		q = q.Where("project_id = ?", filter.ProjectID)
	}
	return q
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

func clampPage(page, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 50
	}
	if perPage > 100 {
		perPage = 100
	}
	return page, perPage
}
