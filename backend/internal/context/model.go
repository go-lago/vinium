package context

import (
	"time"

	"github.com/google/uuid"
)

type Context struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Name      string    `gorm:"not null;default:''" json:"name"`
	Color     string    `gorm:"not null;default:'#6366f1'" json:"color"`
	Icon      string    `gorm:"not null;default:'🌐'" json:"icon"`
	IsDefault bool      `gorm:"not null;default:false" json:"is_default"`
	SortOrder int       `gorm:"not null;default:0" json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
