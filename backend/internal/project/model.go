package project

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Status string

const (
	StatusActive   Status = "active"
	StatusArchived Status = "archived"
)

type Project struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ContextID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"context_id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Name        string         `gorm:"not null;default:''" json:"name"`
	Description string         `gorm:"type:text;not null;default:''" json:"description"`
	Status      Status         `gorm:"not null;default:'active'" json:"status"`
	Color       string         `gorm:"not null;default:'#6366f1'" json:"color"`
	Icon        string         `gorm:"not null;default:'📁'" json:"icon"`
	SortOrder   int            `gorm:"not null;default:0" json:"sort_order"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
