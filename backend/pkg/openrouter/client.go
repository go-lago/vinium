package openrouter

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const baseURL = "https://openrouter.ai/api/v1"

// ErrUpstream429 is returned when OpenRouter responds with 429 Too Many Requests.
var ErrUpstream429 = errors.New("openrouter: upstream rate limit")

type Client struct {
	apiKey     string
	model      string
	httpClient *http.Client
}

func New(apiKey, model string) *Client {
	return &Client{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{Timeout: 35 * time.Second},
	}
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model    string    `json:"model"`
	Messages []message `json:"messages"`
}

type chatResponse struct {
	Choices []struct {
		Message message `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// Chat sends a chat completion request. The caller's ctx controls the timeout.
func (c *Client) Chat(ctx context.Context, systemPrompt, userContent string) (string, error) {
	body, _ := json.Marshal(chatRequest{
		Model: c.model,
		Messages: []message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userContent},
		},
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return "", ErrUpstream429
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("openrouter: status %d, body: %s", resp.StatusCode, body)
		return "", fmt.Errorf("openrouter: status %d", resp.StatusCode)
	}

	var result chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.Error != nil {
		return "", fmt.Errorf("openrouter: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("openrouter: empty response")
	}
	return result.Choices[0].Message.Content, nil
}
