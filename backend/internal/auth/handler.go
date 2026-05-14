package auth

import (
	"encoding/json"
	"net/http"
	"time"

	"golang.org/x/oauth2"
)

const refreshTokenCookie = "refresh_token"

type Handler struct {
	service      *Service
	oauthConfig  *oauth2.Config
	frontendURL  string
	refreshTTL   time.Duration
	cookieSecure bool
}

func NewHandler(service *Service, oauthConfig *oauth2.Config, frontendURL string, refreshTTL time.Duration, cookieSecure bool) *Handler {
	return &Handler{
		service:      service,
		oauthConfig:  oauthConfig,
		frontendURL:  frontendURL,
		refreshTTL:   refreshTTL,
		cookieSecure: cookieSecure,
	}
}

// POST /api/v1/auth/register
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.service.Register(RegisterInput(input))
	if err != nil {
		switch err {
		case ErrEmailTaken:
			respondError(w, http.StatusConflict, "email already taken")
		default:
			respondError(w, http.StatusInternalServerError, "internal error")
		}
		return
	}

	h.setRefreshCookie(w, result.RefreshToken)
	respondJSON(w, http.StatusCreated, map[string]any{
		"access_token": result.AccessToken,
		"user":         result.User,
	})
}

// POST /api/v1/auth/login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.service.Login(LoginInput(input))
	if err != nil {
		switch err {
		case ErrUserNotFound, ErrInvalidPassword:
			respondError(w, http.StatusUnauthorized, "invalid email or password")
		default:
			respondError(w, http.StatusInternalServerError, "internal error")
		}
		return
	}

	h.setRefreshCookie(w, result.RefreshToken)
	respondJSON(w, http.StatusOK, map[string]any{
		"access_token": result.AccessToken,
		"user":         result.User,
	})
}

// POST /api/v1/auth/refresh
func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshTokenCookie)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "refresh token missing")
		return
	}

	result, err := h.service.Refresh(cookie.Value)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	h.setRefreshCookie(w, result.RefreshToken)
	respondJSON(w, http.StatusOK, map[string]any{
		"access_token": result.AccessToken,
	})
}

// POST /api/v1/auth/logout
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshTokenCookie)
	if err == nil {
		_ = h.service.Logout(cookie.Value)
	}
	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/v1/auth/google
func (h *Handler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	state, err := GenerateOAuthState()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Сохраняем state в cookie для CSRF-проверки
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		MaxAge:   300,
		HttpOnly: true,
		Secure:   r.TLS != nil,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
	})

	url := h.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// GET /api/v1/auth/google/callback
func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || r.URL.Query().Get("state") != stateCookie.Value {
		respondError(w, http.StatusBadRequest, "invalid state")
		return
	}

	userInfo, err := FetchGoogleUserInfo(r.Context(), h.oauthConfig, r.URL.Query().Get("code"))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "google auth failed")
		return
	}

	result, err := h.service.LoginOrCreateGoogleUser(
		userInfo.ID, userInfo.Email, userInfo.Name, userInfo.AvatarURL,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	h.setRefreshCookie(w, result.RefreshToken)
	code, err := h.service.StoreOAuthCode(result.AccessToken)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}
	http.Redirect(w, r, h.frontendURL+"/auth/callback?code="+code, http.StatusTemporaryRedirect)
}

// GET /api/v1/auth/google/exchange?code=xxx
func (h *Handler) ExchangeGoogleCode(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		respondError(w, http.StatusBadRequest, "code is required")
		return
	}
	accessToken, ok := h.service.ConsumeOAuthCode(code)
	if !ok {
		respondError(w, http.StatusBadRequest, "invalid or expired code")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"access_token": accessToken})
}

func (h *Handler) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookie,
		Value:    token,
		MaxAge:   int(h.refreshTTL.Seconds()),
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
	})
}

func (h *Handler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookie,
		Value:    "",
		MaxAge:   -1,
		HttpOnly: true,
		Path:     "/",
	})
}

func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}
