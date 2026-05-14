package note

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/nkrus/vinium/pkg/ctxutil"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Handler struct {
	repo Repository
}

func NewHandler(repo Repository) *Handler {
	return &Handler{repo: repo}
}

type createRequest struct {
	Title   string   `json:"title"`
	Content string   `json:"content"`
	Tags    []string `json:"tags"`
}

type updateRequest struct {
	Title    string   `json:"title"`
	Content  string   `json:"content"`
	IsPinned bool     `json:"is_pinned"`
	Tags     []string `json:"tags"`
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

func marshalTags(tags []string) datatypes.JSON {
	if tags == nil {
		tags = []string{}
	}
	b, _ := json.Marshal(tags)
	return datatypes.JSON(b)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))

	summaries, err := h.repo.FindSummaryByUserID(uid, page, perPage)
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

	n := &Note{
		UserID:       uid,
		Title:        req.Title,
		Content:      req.Content,
		ContentPlain: extractPlainText(req.Content),
		Tags:         marshalTags(req.Tags),
	}
	if err := h.repo.Create(n); err != nil {
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

	n, err := h.repo.FindByID(noteID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, http.StatusNotFound, "note not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to fetch note")
		return
	}

	if n.UserID != uid {
		writeError(w, http.StatusNotFound, "note not found")
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

	n, err := h.repo.FindByID(noteID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, http.StatusNotFound, "note not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to fetch note")
		return
	}

	if n.UserID != uid {
		writeError(w, http.StatusNotFound, "note not found")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	n.Title = req.Title
	n.Content = req.Content
	n.ContentPlain = extractPlainText(req.Content)
	n.IsPinned = req.IsPinned
	n.Tags = marshalTags(req.Tags)

	if err := h.repo.Update(n); err != nil {
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

	if err := h.repo.Delete(noteID, uid); err != nil {
		if errors.Is(err, ErrNoteNotFound) {
			writeError(w, http.StatusNotFound, "note not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete note")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
