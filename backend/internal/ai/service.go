package ai

import (
	"context"
	"errors"
	"fmt"

	"github.com/nkrus/vinium/pkg/lexical"
)

type Action string

const (
	ActionSummarize Action = "summarize"
	ActionRephrase  Action = "rephrase"
	ActionExpand    Action = "expand"
)

var systemPrompts = map[Action]string{
	ActionSummarize: "You are a concise assistant. Summarize the following text in 3-5 sentences. Output only the summary, no preamble.",
	ActionRephrase:  "You are an expert editor. Rephrase the following text to improve clarity and flow while keeping the same meaning. Output only the rephrased text.",
	ActionExpand:    "You are a skilled writer. Expand the following text with additional detail and context. Output only the expanded text.",
}

var (
	ErrInvalidAction = errors.New("invalid action")
	ErrEmptyContent  = errors.New("note content is empty")
)

// ChatClient is implemented by pkg/openrouter.Client.
type ChatClient interface {
	Chat(ctx context.Context, systemPrompt, userContent string) (string, error)
}

type Service struct {
	client ChatClient
}

func NewService(client ChatClient) *Service {
	return &Service{client: client}
}

func (s *Service) Run(ctx context.Context, action Action, lexicalJSON string) (string, error) {
	prompt, ok := systemPrompts[action]
	if !ok {
		return "", ErrInvalidAction
	}

	plain := lexical.ExtractPlainText(lexicalJSON)
	if plain == "" {
		return "", ErrEmptyContent
	}

	return s.client.Chat(ctx, prompt, plain)
}

func ParseAction(s string) (Action, error) {
	a := Action(s)
	if _, ok := systemPrompts[a]; !ok {
		return "", fmt.Errorf("%w: %q", ErrInvalidAction, s)
	}
	return a, nil
}
