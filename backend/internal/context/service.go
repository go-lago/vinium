package context

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
	UserID    uuid.UUID
	Name      string
	Color     string
	Icon      string
	SortOrder int
}

type UpdateInput struct {
	Name      string
	Color     string
	Icon      string
	SortOrder int
}

func (s *Service) Create(in CreateInput) (*Context, error) {
	color := in.Color
	if color == "" {
		color = "#6366f1"
	}
	icon := in.Icon
	if icon == "" {
		icon = "🌐"
	}
	c := &Context{
		UserID:    in.UserID,
		Name:      in.Name,
		Color:     color,
		Icon:      icon,
		SortOrder: in.SortOrder,
	}
	return c, s.repo.Create(c)
}

func (s *Service) GetByID(id, userID uuid.UUID) (*Context, error) {
	c, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrContextNotFound
		}
		return nil, err
	}
	if c.UserID != userID {
		return nil, ErrContextNotFound
	}
	return c, nil
}

func (s *Service) List(userID uuid.UUID) ([]Context, error) {
	return s.repo.FindByUserID(userID)
}

func (s *Service) Update(id, userID uuid.UUID, in UpdateInput) (*Context, error) {
	c, err := s.GetByID(id, userID)
	if err != nil {
		return nil, err
	}
	c.Name = in.Name
	c.Color = in.Color
	c.Icon = in.Icon
	c.SortOrder = in.SortOrder
	return c, s.repo.Update(c)
}

func (s *Service) Delete(id, userID uuid.UUID) error {
	return s.repo.Delete(id, userID)
}

func (s *Service) EnsureDefault(userID uuid.UUID) (*Context, error) {
	return s.repo.EnsureDefault(userID)
}
