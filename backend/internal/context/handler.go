package context

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/nkrus/vinium/pkg/ctxutil"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

type contextRequest struct {
	Name      string `json:"name"`
	Color     string `json:"color"`
	Icon      string `json:"icon"`
	SortOrder int    `json:"sort_order"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func userID(r *http.Request) (uuid.UUID, bool) {
	return ctxutil.GetUserID(r.Context())
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	// Ensure there's always at least one default context
	if _, err := h.svc.EnsureDefault(uid); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to ensure default context")
		return
	}
	contexts, err := h.svc.List(uid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch contexts")
		return
	}
	writeJSON(w, http.StatusOK, contexts)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req contextRequest
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	c, err := h.svc.Create(CreateInput{
		UserID:    uid,
		Name:      req.Name,
		Color:     req.Color,
		Icon:      req.Icon,
		SortOrder: req.SortOrder,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create context")
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid context id")
		return
	}
	c, err := h.svc.GetByID(id, uid)
	if err != nil {
		if errors.Is(err, ErrContextNotFound) {
			writeError(w, http.StatusNotFound, "context not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to fetch context")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid context id")
		return
	}
	var req contextRequest
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	c, err := h.svc.Update(id, uid, UpdateInput{
		Name:      req.Name,
		Color:     req.Color,
		Icon:      req.Icon,
		SortOrder: req.SortOrder,
	})
	if err != nil {
		if errors.Is(err, ErrContextNotFound) {
			writeError(w, http.StatusNotFound, "context not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update context")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid context id")
		return
	}
	if err := h.svc.Delete(id, uid); err != nil {
		if errors.Is(err, ErrContextNotFound) {
			writeError(w, http.StatusNotFound, "context not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete context")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
