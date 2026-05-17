package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/nkrus/vinium/internal/ai"
	"github.com/nkrus/vinium/internal/auth"
	appctx "github.com/nkrus/vinium/internal/context"
	"github.com/nkrus/vinium/internal/note"
	"github.com/nkrus/vinium/internal/project"
	"github.com/nkrus/vinium/internal/task"
	"github.com/nkrus/vinium/internal/user"
	"github.com/nkrus/vinium/pkg/config"
	"github.com/nkrus/vinium/pkg/database"
	"github.com/nkrus/vinium/pkg/middleware"
	"github.com/nkrus/vinium/pkg/openrouter"
	"github.com/nkrus/vinium/pkg/ratelimit"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	if err := db.AutoMigrate(
		&user.User{}, &user.RefreshToken{},
		&appctx.Context{}, &project.Project{},
		&note.Note{}, &task.Task{},
	); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// Dependencies
	userRepo := user.NewRepository(db)
	tokenSvc := auth.NewTokenService(cfg.JWTSecret, cfg.JWTAccessTTL)
	authSvc := auth.NewService(userRepo, tokenSvc, cfg.JWTRefreshTTL)
	oauthCfg := auth.NewGoogleOAuthConfig(cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleRedirectURL)

	noteRepo := note.NewRepository(db)
	noteSvc := note.NewService(noteRepo)

	taskRepo := task.NewRepository(db)
	taskSvc := task.NewService(taskRepo)
	taskHandler := task.NewHandler(taskSvc)

	ctxRepo := appctx.NewRepository(db)
	ctxSvc := appctx.NewService(ctxRepo)
	ctxHandler := appctx.NewHandler(ctxSvc)

	projRepo := project.NewRepository(db)
	projSvc := project.NewService(projRepo)
	projHandler := project.NewHandler(projSvc)

	orClient := openrouter.New(cfg.OpenRouterAPIKey, cfg.OpenRouterModel)
	aiSvc := ai.NewService(orClient)
	// 10 req/min sliding window, 20 req/day per user
	aiLimiter := ratelimit.New(10, 20)
	// 10 req/min per IP for auth endpoints, no daily cap
	authLimiter := ratelimit.New(10, 0)

	authHandler := auth.NewHandler(authSvc, oauthCfg, cfg.FrontendURL, cfg.JWTRefreshTTL, cfg.CookieSecure)
	userHandler := user.NewHandler(userRepo)
	noteHandler := note.NewHandler(noteSvc)
	aiHandler := ai.NewHandler(aiSvc, aiLimiter)
	authMiddleware := auth.Middleware(tokenSvc)

	r := chi.NewRouter()
	r.Use(chiMiddleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", ipRateLimit(authLimiter, cfg.TrustProxy, authHandler.Register))
			r.Post("/login", ipRateLimit(authLimiter, cfg.TrustProxy, authHandler.Login))
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout", authHandler.Logout)
			r.Get("/google", authHandler.GoogleLogin)
			r.Get("/google/callback", authHandler.GoogleCallback)
			r.Get("/google/exchange", authHandler.ExchangeGoogleCode)
		})

		r.Group(func(r chi.Router) {
			r.Use(authMiddleware)
			r.Get("/me", userHandler.GetMe)
			r.Put("/me", userHandler.UpdateMe)

			r.Route("/notes", func(r chi.Router) {
				r.Get("/", noteHandler.List)
				r.Post("/", noteHandler.Create)
				r.Get("/{id}", noteHandler.Get)
				r.Put("/{id}", noteHandler.Update)
				r.Delete("/{id}", noteHandler.Delete)
			})

			r.Route("/tasks", func(r chi.Router) {
				r.Get("/", taskHandler.List)
				r.Post("/", taskHandler.Create)
				r.Get("/{id}", taskHandler.Get)
				r.Put("/{id}", taskHandler.Update)
				r.Delete("/{id}", taskHandler.Delete)
			})

			r.Post("/ai/action", aiHandler.Action)

			r.Route("/contexts", func(r chi.Router) {
				r.Get("/", ctxHandler.List)
				r.Post("/", ctxHandler.Create)
				r.Get("/{id}", ctxHandler.Get)
				r.Put("/{id}", ctxHandler.Update)
				r.Delete("/{id}", ctxHandler.Delete)
				r.Route("/{contextId}/projects", func(r chi.Router) {
					r.Get("/", projHandler.ListByContext)
				})
			})

			r.Route("/projects", func(r chi.Router) {
				r.Post("/", projHandler.Create)
				r.Get("/{id}", projHandler.Get)
				r.Put("/{id}", projHandler.Update)
				r.Delete("/{id}", projHandler.Delete)
			})
		})
	})

	addr := ":" + cfg.Port
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 35 * time.Second,
		IdleTimeout:  120 * time.Second,
	}
	log.Printf("Server starting on %s", addr)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server: %v", err)
	}
}

// ipRateLimit wraps a handler with per-IP rate limiting.
func ipRateLimit(l *ratelimit.Limiter, trustProxy bool, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := realIP(r, trustProxy)
		if !l.Allow(ip) {
			w.Header().Set("Retry-After", "60")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "too many requests"})
			return
		}
		next(w, r)
	}
}

func realIP(r *http.Request, trustProxy bool) string {
	if trustProxy {
		if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
			// X-Forwarded-For may be a comma-separated list; take the first (client) IP.
			if ip, _, ok := strings.Cut(fwd, ","); ok {
				return strings.TrimSpace(ip)
			}
			return strings.TrimSpace(fwd)
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
