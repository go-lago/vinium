package note

import (
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/nkrus/vinium/pkg/lexical"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

type CreateInput struct {
	UserID         uuid.UUID
	Title          string
	Content        string
	Tags           []string
	NoteType       string
	LexicalVersion string
}

type UpdateInput struct {
	Title          string
	Content        string
	IsPinned       bool
	Tags           []string
	NoteType       string
	LexicalVersion string
}

type ListInput struct {
	UserID  uuid.UUID
	Page    int
	PerPage int
	Query   string
}

func (s *Service) Create(in CreateInput) (*Note, error) {
	noteType := in.NoteType
	if noteType == "" {
		noteType = "note"
	}
	n := &Note{
		UserID:       in.UserID,
		Title:        in.Title,
		Content:      in.Content,
		ContentPlain: lexical.ExtractPlainText(in.Content),
		Type:         noteType,
		Tags:         marshalTags(in.Tags),
		Metadata:     marshalMetadata(in.LexicalVersion),
	}
	if err := s.repo.Create(n); err != nil {
		return nil, err
	}
	return n, nil
}

func (s *Service) GetByID(id, userID uuid.UUID) (*Note, error) {
	n, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNoteNotFound
		}
		return nil, err
	}
	if n.UserID != userID {
		return nil, ErrNoteNotFound
	}
	return n, nil
}

func (s *Service) List(in ListInput) ([]NoteSummary, error) {
	if in.Query != "" {
		return s.repo.Search(in.UserID, in.Query, in.Page, in.PerPage)
	}
	return s.repo.FindSummaryByUserID(in.UserID, in.Page, in.PerPage)
}

func (s *Service) Update(id, userID uuid.UUID, in UpdateInput) (*Note, error) {
	n, err := s.GetByID(id, userID)
	if err != nil {
		return nil, err
	}
	n.Title = in.Title
	n.Content = in.Content
	n.ContentPlain = lexical.ExtractPlainText(in.Content)
	n.IsPinned = in.IsPinned
	n.Tags = marshalTags(in.Tags)
	if in.NoteType != "" {
		n.Type = in.NoteType
	}
	if in.LexicalVersion != "" {
		n.Metadata = marshalMetadata(in.LexicalVersion)
	}
	if err := s.repo.Update(n); err != nil {
		return nil, err
	}
	return n, nil
}

func (s *Service) Delete(id, userID uuid.UUID) error {
	return s.repo.Delete(id, userID)
}


func marshalTags(tags []string) datatypes.JSON {
	if tags == nil {
		tags = []string{}
	}
	b, _ := json.Marshal(tags)
	return datatypes.JSON(b)
}

func marshalMetadata(lexicalVersion string) datatypes.JSON {
	b, _ := json.Marshal(NoteMetadata{LexicalVersion: lexicalVersion})
	return datatypes.JSON(b)
}
