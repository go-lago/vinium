package lexical

import (
	"encoding/json"
	"strings"
)

// ExtractPlainText walks a Lexical JSON document and returns concatenated text.
func ExtractPlainText(content string) string {
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
