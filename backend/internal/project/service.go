package project

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

type CreateInput struct {
	ContextID   uuid.UUID
	UserID      uuid.UUID
	Name        string
	Description string
	Color       string
	Icon        string
	SortOrder   int
}

type UpdateInput struct {
	Name        string
	Description string
	Status      Status
	Color       string
	Icon        string
	SortOrder   int
}

func (s *Service) Create(in CreateInput) (*Project, error) {
	color := in.Color
	if color == "" {
		color = "#6366f1"
	}
	icon := in.Icon
	if icon == "" {
		icon = "📁"
	}
	p := &Project{
		ContextID:   in.ContextID,
		UserID:      in.UserID,
		Name:        in.Name,
		Description: in.Description,
		Status:      StatusActive,
		Color:       color,
		Icon:        icon,
		SortOrder:   in.SortOrder,
	}
	return p, s.repo.Create(p)
}

func (s *Service) GetByID(id, userID uuid.UUID) (*Project, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProjectNotFound
		}
		return nil, err
	}
	if p.UserID != userID {
		return nil, ErrProjectNotFound
	}
	return p, nil
}

func (s *Service) ListByContext(contextID uuid.UUID) ([]Project, error) {
	return s.repo.FindByContextID(contextID)
}

func (s *Service) Update(id, userID uuid.UUID, in UpdateInput) (*Project, error) {
	p, err := s.GetByID(id, userID)
	if err != nil {
		return nil, err
	}
	p.Name = in.Name
	p.Description = in.Description
	if in.Status != "" {
		p.Status = in.Status
	}
	p.Color = in.Color
	p.Icon = in.Icon
	p.SortOrder = in.SortOrder
	return p, s.repo.Update(p)
}

func (s *Service) Delete(id, userID uuid.UUID) error {
	return s.repo.Delete(id, userID)
}
