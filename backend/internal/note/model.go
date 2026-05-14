package note

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Note struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID         uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Title          string         `gorm:"not null;default:''" json:"title"`
	Content        string         `gorm:"type:text" json:"content"`
	ContentPlain   string         `gorm:"type:text" json:"content_plain"`
	ContentVersion int            `gorm:"default:1" json:"content_version"`
	Type           string         `gorm:"not null;default:'note'" json:"type"`
	Tags           datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"tags"`
	Metadata       datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"metadata,omitempty"`
	IsPinned       bool           `gorm:"default:false" json:"is_pinned"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// NoteSummary is returned by the list endpoint — excludes the heavy Content (Lexical JSON).
type NoteSummary struct {
	ID             uuid.UUID      `json:"id"`
	UserID         uuid.UUID      `json:"user_id"`
	Title          string         `json:"title"`
	ContentPlain   string         `json:"content_plain"`
	ContentVersion int            `json:"content_version"`
	Type           string         `json:"type"`
	Tags           datatypes.JSON `json:"tags"`
	IsPinned       bool           `json:"is_pinned"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

// extractPlainText walks the Lexical JSON tree and collects all text node values.
func extractPlainText(content string) string {
	if content == "" {
		return ""
	}
	var doc map[string]any
	if err := json.Unmarshal([]byte(content), &doc); err != nil {
		return ""
	}
	var buf strings.Builder
	root, _ := doc["root"].(map[string]any)
	collectText(root, &buf)
	return strings.TrimSpace(buf.String())
}

func collectText(node map[string]any, buf *strings.Builder) {
	if node == nil {
		return
	}
	if nodeType, _ := node["type"].(string); nodeType == "text" {
		if text, _ := node["text"].(string); text != "" {
			buf.WriteString(text)
			buf.WriteByte(' ')
		}
		return
	}
	children, _ := node["children"].([]any)
	for _, child := range children {
		if m, ok := child.(map[string]any); ok {
			collectText(m, buf)
		}
	}
}
