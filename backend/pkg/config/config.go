package config

import (
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string

	JWTSecret     string
	JWTAccessTTL  time.Duration
	JWTRefreshTTL time.Duration

	CookieSecure bool

	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	OpenRouterAPIKey string
	OpenRouterModel  string
	TrustProxy       bool

	FrontendURL string
	Port        string
}

func Load() (*Config, error) {
	// .env не обязателен в продакшне — ошибку игнорируем
	_ = godotenv.Load()

	jwtSecret := getEnv("JWT_SECRET", "")
	if len(jwtSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be at least 32 characters (got %d)", len(jwtSecret))
	}

	accessTTL, err := time.ParseDuration(getEnv("JWT_ACCESS_TTL", "15m"))
	if err != nil {
		return nil, err
	}
	refreshTTL, err := time.ParseDuration(getEnv("JWT_REFRESH_TTL", "168h"))
	if err != nil {
		return nil, err
	}

	openRouterKey := getEnv("OPENROUTER_API_KEY", "")
	if openRouterKey == "" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY is required")
	}

	return &Config{
		DatabaseURL:        getEnv("DATABASE_URL", ""),
		JWTSecret:          jwtSecret,
		JWTAccessTTL:       accessTTL,
		JWTRefreshTTL:      refreshTTL,
		CookieSecure:       getEnvBool("COOKIE_SECURE", true),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", ""),
		OpenRouterAPIKey:   openRouterKey,
		OpenRouterModel:    getEnv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free"),
		TrustProxy:         getEnvBool("TRUST_PROXY", false),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:5173"),
		Port:               getEnv("PORT", "8080"),
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	switch v {
	case "true", "1", "yes":
		return true
	case "false", "0", "no":
		return false
	default:
		return fallback
	}
}
