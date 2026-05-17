package context

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrContextNotFound = errors.New("context not found")

type Repository interface {
	Create(c *Context) error
	FindByID(id uuid.UUID) (*Context, error)
	FindByUserID(userID uuid.UUID) ([]Context, error)
	Update(c *Context) error
	Delete(id uuid.UUID, userID uuid.UUID) error
	EnsureDefault(userID uuid.UUID) (*Context, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(c *Context) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return r.db.Create(c).Error
}

func (r *repository) FindByID(id uuid.UUID) (*Context, error) {
	var c Context
	err := r.db.First(&c, "id = ?", id).Error
	return &c, err
}

func (r *repository) FindByUserID(userID uuid.UUID) ([]Context, error) {
	var out []Context
	err := r.db.Where("user_id = ?", userID).Order("sort_order ASC, created_at ASC").Find(&out).Error
	return out, err
}

func (r *repository) Update(c *Context) error {
	return r.db.Save(c).Error
}

func (r *repository) Delete(id uuid.UUID, userID uuid.UUID) error {
	result := r.db.Delete(&Context{}, "id = ? AND user_id = ? AND is_default = false", id, userID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrContextNotFound
	}
	return nil
}

// EnsureDefault returns (or creates) the default context for a user.
func (r *repository) EnsureDefault(userID uuid.UUID) (*Context, error) {
	var c Context
	err := r.db.First(&c, "user_id = ? AND is_default = true", userID).Error
	if err == nil {
		return &c, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	c = Context{
		ID:        uuid.New(),
		UserID:    userID,
		Name:      "Личное",
		Color:     "#6366f1",
		Icon:      "🌐",
		IsDefault: true,
		SortOrder: 0,
	}
	return &c, r.db.Create(&c).Error
}
