package ai_test

import (
	"context"
	"errors"
	"testing"

	"github.com/nkrus/vinium/internal/ai"
)

// ── Mock client ───────────────────────────────────────────────────────────────

type mockClient struct {
	fn func(ctx context.Context, system, user string) (string, error)
}

func (m *mockClient) Chat(ctx context.Context, system, user string) (string, error) {
	return m.fn(ctx, system, user)
}

func newOK(result string) *mockClient {
	return &mockClient{fn: func(_ context.Context, _, _ string) (string, error) { return result, nil }}
}

func newErr(err error) *mockClient {
	return &mockClient{fn: func(_ context.Context, _, _ string) (string, error) { return "", err }}
}

// ── ParseAction ───────────────────────────────────────────────────────────────

func TestParseAction_Valid(t *testing.T) {
	for _, a := range []string{"summarize", "rephrase", "expand"} {
		if _, err := ai.ParseAction(a); err != nil {
			t.Errorf("ParseAction(%q) unexpected error: %v", a, err)
		}
	}
}

func TestParseAction_Invalid(t *testing.T) {
	_, err := ai.ParseAction("delete_all")
	if !errors.Is(err, ai.ErrInvalidAction) {
		t.Errorf("expected ErrInvalidAction, got %v", err)
	}
}

// ── Service.Run ───────────────────────────────────────────────────────────────

func TestRun_EmptyContent(t *testing.T) {
	svc := ai.NewService(newOK("whatever"))
	_, err := svc.Run(context.Background(), ai.ActionSummarize, "")
	if !errors.Is(err, ai.ErrEmptyContent) {
		t.Errorf("expected ErrEmptyContent, got %v", err)
	}
}

func TestRun_EmptyLexicalJSON(t *testing.T) {
	// Lexical JSON with no text nodes → ExtractPlainText returns ""
	empty := `{"root":{"type":"root","children":[{"type":"paragraph","children":[]}]}}`
	svc := ai.NewService(newOK("whatever"))
	_, err := svc.Run(context.Background(), ai.ActionSummarize, empty)
	if !errors.Is(err, ai.ErrEmptyContent) {
		t.Errorf("expected ErrEmptyContent for empty paragraph, got %v", err)
	}
}

func TestRun_Success(t *testing.T) {
	content := `{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"Hello"}]}]}}`
	svc := ai.NewService(newOK("Summary here"))
	result, err := svc.Run(context.Background(), ai.ActionSummarize, content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "Summary here" {
		t.Errorf("got %q, want %q", result, "Summary here")
	}
}

func TestRun_ContextCancel(t *testing.T) {
	content := `{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"Hello"}]}]}}`
	cancelled := context.Canceled
	svc := ai.NewService(newErr(cancelled))

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := svc.Run(ctx, ai.ActionSummarize, content)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestRun_SystemPromptUsed(t *testing.T) {
	content := `{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"Some text"}]}]}}`
	var capturedSystem string
	client := &mockClient{fn: func(_ context.Context, system, _ string) (string, error) {
		capturedSystem = system
		return "ok", nil
	}}
	svc := ai.NewService(client)

	if _, err := svc.Run(context.Background(), ai.ActionRephrase, content); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedSystem == "" {
		t.Error("system prompt was empty")
	}
}
