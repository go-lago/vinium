package lexical_test

import (
	"testing"

	"github.com/nkrus/vinium/pkg/lexical"
)

func TestExtractPlainText(t *testing.T) {
	cases := []struct {
		name string
		json string
		want string
	}{
		{"empty", "", ""},
		{"invalid json", "not-json", ""},
		{
			"simple paragraph",
			`{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"Hello world"}]}]}}`,
			"Hello world",
		},
		{
			"multiple paragraphs",
			`{"root":{"type":"root","children":[` +
				`{"type":"paragraph","children":[{"type":"text","text":"First"}]},` +
				`{"type":"paragraph","children":[{"type":"text","text":"Second"}]}` +
				`]}}`,
			"First Second",
		},
		{
			"nested nodes",
			`{"root":{"type":"root","children":[{"type":"paragraph","children":[` +
				`{"type":"text","text":"A"},{"type":"text","text":"B"}` +
				`]}]}}`,
			"A B",
		},
		{
			"heading node",
			`{"root":{"type":"root","children":[{"type":"heading","tag":"h1","children":[{"type":"text","text":"Title"}]}]}}`,
			"Title",
		},
		{
			"list items",
			`{"root":{"type":"root","children":[{"type":"list","children":[` +
				`{"type":"listitem","children":[{"type":"text","text":"Item one"}]},` +
				`{"type":"listitem","children":[{"type":"text","text":"Item two"}]}` +
				`]}]}}`,
			"Item one Item two",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := lexical.ExtractPlainText(tc.json)
			if got != tc.want {
				t.Errorf("ExtractPlainText() = %q, want %q", got, tc.want)
			}
		})
	}
}
