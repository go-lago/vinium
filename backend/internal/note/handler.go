package note

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

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

type createRequest struct {
	Title          string   `json:"title"`
	Content        string   `json:"content"`
	Tags           []string `json:"tags"`
	Type           string   `json:"type"`
	LexicalVersion string   `json:"lexical_version"`
	ContextID      *string  `json:"context_id"`
	ProjectID      *string  `json:"project_id"`
}

type updateRequest struct {
	Title          string   `json:"title"`
	Content        string   `json:"content"`
	IsPinned       bool     `json:"is_pinned"`
	Tags           []string `json:"tags"`
	Type           string   `json:"type"`
	LexicalVersion string   `json:"lexical_version"`
	ContextID      *string  `json:"context_id"`
	ProjectID      *string  `json:"project_id"`
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
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
	query := r.URL.Query().Get("q")

	summaries, err := h.svc.List(ListInput{
		UserID:    uid,
		Page:      page,
		PerPage:   perPage,
		Query:     query,
		ContextID: r.URL.Query().Get("context_id"),
		ProjectID: r.URL.Query().Get("project_id"),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch notes")
		return
	}
	writeJSON(w, http.StatusOK, summaries)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	n, err := h.svc.Create(CreateInput{
		UserID:         uid,
		Title:          req.Title,
		Content:        req.Content,
		Tags:           req.Tags,
		NoteType:       req.Type,
		LexicalVersion: req.LexicalVersion,
		ContextID:      parseOptionalUUID(req.ContextID),
		ProjectID:      parseOptionalUUID(req.ProjectID),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create note")
		return
	}
	writeJSON(w, http.StatusCreated, n)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	noteID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid note id")
		return
	}

	n, err := h.svc.GetByID(noteID, uid)
	if err != nil {
		if errors.Is(err, ErrNoteNotFound) {
			writeError(w, http.StatusNotFound, "note not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to fetch note")
		return
	}
	writeJSON(w, http.StatusOK, n)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	noteID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid note id")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	n, err := h.svc.Update(noteID, uid, UpdateInput{
		Title:          req.Title,
		Content:        req.Content,
		IsPinned:       req.IsPinned,
		Tags:           req.Tags,
		NoteType:       req.Type,
		LexicalVersion: req.LexicalVersion,
		ContextID:      parseOptionalUUID(req.ContextID),
		ProjectID:      parseOptionalUUID(req.ProjectID),
	})
	if err != nil {
		if errors.Is(err, ErrNoteNotFound) {
			writeError(w, http.StatusNotFound, "note not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update note")
		return
	}
	writeJSON(w, http.StatusOK, n)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	noteID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid note id")
		return
	}

	if err := h.svc.Delete(noteID, uid); err != nil {
		if errors.Is(err, ErrNoteNotFound) {
			writeError(w, http.StatusNotFound, "note not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete note")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func parseOptionalUUID(s *string) *uuid.UUID {
	if s == nil || *s == "" {
		return nil
	}
	id, err := uuid.Parse(*s)
	if err != nil {
		return nil
	}
	return &id
}
