package user

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	Create(u *User) error
	FindByID(id uuid.UUID) (*User, error)
	FindByEmail(email string) (*User, error)
	FindByGoogleID(googleID string) (*User, error)
	Update(u *User) error

	CreateRefreshToken(t *RefreshToken) error
	FindRefreshToken(token string) (*RefreshToken, error)
	DeleteRefreshToken(token string) error
	DeleteExpiredRefreshTokens(userID uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(u *User) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return r.db.Create(u).Error
}

func (r *repository) FindByID(id uuid.UUID) (*User, error) {
	var u User
	err := r.db.First(&u, "id = ?", id).Error
	return &u, err
}

func (r *repository) FindByEmail(email string) (*User, error) {
	var u User
	err := r.db.First(&u, "email = ?", email).Error
	return &u, err
}

func (r *repository) FindByGoogleID(googleID string) (*User, error) {
	var u User
	err := r.db.First(&u, "google_id = ?", googleID).Error
	return &u, err
}

func (r *repository) Update(u *User) error {
	return r.db.Save(u).Error
}

func (r *repository) CreateRefreshToken(t *RefreshToken) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return r.db.Create(t).Error
}

func (r *repository) FindRefreshToken(token string) (*RefreshToken, error) {
	var t RefreshToken
	err := r.db.First(&t, "token = ? AND expires_at > ?", token, time.Now()).Error
	return &t, err
}

func (r *repository) DeleteRefreshToken(token string) error {
	return r.db.Delete(&RefreshToken{}, "token = ?", token).Error
}

func (r *repository) DeleteExpiredRefreshTokens(userID uuid.UUID) error {
	return r.db.Delete(&RefreshToken{}, "user_id = ? AND expires_at < ?", userID, time.Now()).Error
}
