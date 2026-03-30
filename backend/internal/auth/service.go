package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/nkrus/vinium/internal/user"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUserNotFound    = errors.New("user not found")
	ErrInvalidPassword = errors.New("invalid password")
	ErrInvalidToken    = errors.New("invalid or expired refresh token")
	ErrEmailTaken      = errors.New("email already taken")
)

type RegisterInput struct {
	Name     string
	Email    string
	Password string
}

type LoginInput struct {
	Email    string
	Password string
}

type AuthResult struct {
	User        *user.User
	AccessToken string
	// Refresh token возвращается отдельно для записи в httpOnly cookie
	RefreshToken string
}

type Service struct {
	users      user.Repository
	tokens     *TokenService
	refreshTTL time.Duration
}

func NewService(repo user.Repository, tokens *TokenService, refreshTTL time.Duration) *Service {
	return &Service{
		users:      repo,
		tokens:     tokens,
		refreshTTL: refreshTTL,
	}
}

func (s *Service) Register(in RegisterInput) (*AuthResult, error) {
	_, err := s.users.FindByEmail(in.Email)
	if err == nil {
		return nil, ErrEmailTaken
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	u := &user.User{
		Email:        in.Email,
		Name:         in.Name,
		PasswordHash: string(hash),
	}
	if err := s.users.Create(u); err != nil {
		return nil, err
	}

	return s.issueTokens(u)
}

func (s *Service) Login(in LoginInput) (*AuthResult, error) {
	u, err := s.users.FindByEmail(in.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(in.Password)); err != nil {
		return nil, ErrInvalidPassword
	}

	return s.issueTokens(u)
}

func (s *Service) Refresh(refreshToken string) (*AuthResult, error) {
	rt, err := s.users.FindRefreshToken(refreshToken)
	if err != nil {
		return nil, ErrInvalidToken
	}

	u, err := s.users.FindByID(rt.UserID)
	if err != nil {
		return nil, err
	}

	// Ротация токена: удаляем старый
	if err := s.users.DeleteRefreshToken(refreshToken); err != nil {
		return nil, err
	}

	return s.issueTokens(u)
}

func (s *Service) Logout(refreshToken string) error {
	return s.users.DeleteRefreshToken(refreshToken)
}

// LoginOrCreateGoogleUser находит или создаёт пользователя по данным Google OAuth.
func (s *Service) LoginOrCreateGoogleUser(googleID, email, name, avatarURL string) (*AuthResult, error) {
	u, err := s.users.FindByGoogleID(googleID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Может уже есть аккаунт с таким email (зарегался через email/password)
		u, err = s.users.FindByEmail(email)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			u = &user.User{}
		}
		u.GoogleID = &googleID
		u.Email = email
		u.Name = name
		u.AvatarURL = avatarURL

		if u.ID == uuid.Nil {
			if err := s.users.Create(u); err != nil {
				return nil, err
			}
		} else {
			if err := s.users.Update(u); err != nil {
				return nil, err
			}
		}
	}

	return s.issueTokens(u)
}

func (s *Service) issueTokens(u *user.User) (*AuthResult, error) {
	accessToken, err := s.tokens.GenerateAccessToken(u.ID)
	if err != nil {
		return nil, err
	}

	refreshToken, err := generateRefreshToken()
	if err != nil {
		return nil, err
	}

	rt := &user.RefreshToken{
		UserID:    u.ID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(s.refreshTTL),
	}
	if err := s.users.CreateRefreshToken(rt); err != nil {
		return nil, err
	}

	// Чистим протухшие токены в фоне (не критично если упадёт)
	go func() { _ = s.users.DeleteExpiredRefreshTokens(u.ID) }()

	return &AuthResult{
		User:         u,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func generateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
