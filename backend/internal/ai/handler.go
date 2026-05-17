package ai

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/nkrus/vinium/pkg/ctxutil"
	"github.com/nkrus/vinium/pkg/openrouter"
	"github.com/nkrus/vinium/pkg/ratelimit"
)

type Handler struct {
	service *Service
	limiter *ratelimit.Limiter
}

func NewHandler(service *Service, limiter *ratelimit.Limiter) *Handler {
	return &Handler{service: service, limiter: limiter}
}

// POST /api/v1/ai/action
func (h *Handler) Action(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 512*1024)

	userID, ok := ctxutil.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if !h.limiter.Allow(userID.String()) {
		w.Header().Set("Retry-After", "60")
		respondError(w, http.StatusTooManyRequests, "rate limit exceeded — try again later")
		return
	}

	var input struct {
		Action  string `json:"action"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	action, err := ParseAction(input.Action)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid action: must be summarize, rephrase, or expand")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	result, err := h.service.Run(ctx, action, input.Content)
	if err != nil {
		switch {
		case errors.Is(err, ErrEmptyContent):
			respondError(w, http.StatusBadRequest, "note content is empty")
		case errors.Is(err, openrouter.ErrUpstream429):
			respondError(w, http.StatusServiceUnavailable, "AI service temporarily unavailable")
		case errors.Is(ctx.Err(), context.DeadlineExceeded):
			respondError(w, http.StatusGatewayTimeout, "AI request timed out")
		default:
			log.Printf("ai action error (action=%s): %v", action, err)
			respondError(w, http.StatusInternalServerError, "internal error")
		}
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"result": result})
}

func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}
