package task

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

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

type taskRequest struct {
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Status      Status    `json:"status"`
	Priority    Priority  `json:"priority"`
	DueDate     *string   `json:"due_date"`
	NoteID      *string   `json:"note_id"`
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
	filter := ListFilter{
		Status:   r.URL.Query().Get("status"),
		Priority: r.URL.Query().Get("priority"),
	}
	tasks, err := h.svc.List(uid, filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch tasks")
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req taskRequest
	r.Body = http.MaxBytesReader(w, r.Body, 512<<10)
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	in := CreateInput{
		UserID:      uid,
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		Priority:    req.Priority,
		DueDate:     parseDueDate(req.DueDate),
		NoteID:      parseNoteID(req.NoteID),
	}
	t, err := h.svc.Create(in)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create task")
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid task id")
		return
	}
	t, err := h.svc.GetByID(taskID, uid)
	if err != nil {
		if errors.Is(err, ErrTaskNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to fetch task")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid task id")
		return
	}
	var req taskRequest
	r.Body = http.MaxBytesReader(w, r.Body, 512<<10)
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	t, err := h.svc.Update(taskID, uid, UpdateInput{
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		Priority:    req.Priority,
		DueDate:     parseDueDate(req.DueDate),
		NoteID:      parseNoteID(req.NoteID),
	})
	if err != nil {
		if errors.Is(err, ErrTaskNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update task")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid task id")
		return
	}
	if err := h.svc.Delete(taskID, uid); err != nil {
		if errors.Is(err, ErrTaskNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete task")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func parseDueDate(s *string) *time.Time {
	if s == nil || *s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, *s)
	if err != nil {
		return nil
	}
	return &t
}

func parseNoteID(s *string) *uuid.UUID {
	if s == nil || *s == "" {
		return nil
	}
	id, err := uuid.Parse(*s)
	if err != nil {
		return nil
	}
	return &id
}
