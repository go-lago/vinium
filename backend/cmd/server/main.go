package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/nkrus/vinium/internal/auth"
	"github.com/nkrus/vinium/internal/note"
	"github.com/nkrus/vinium/internal/user"
	"github.com/nkrus/vinium/pkg/config"
	"github.com/nkrus/vinium/pkg/database"
	"github.com/nkrus/vinium/pkg/middleware"
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

	// Auto-migrate модели
	if err := db.AutoMigrate(&user.User{}, &user.RefreshToken{}, &note.Note{}); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// Зависимости
	userRepo := user.NewRepository(db)
	tokenSvc := auth.NewTokenService(cfg.JWTSecret, cfg.JWTAccessTTL)
	authSvc := auth.NewService(userRepo, tokenSvc, cfg.JWTRefreshTTL)
	oauthCfg := auth.NewGoogleOAuthConfig(cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleRedirectURL)

	noteRepo := note.NewRepository(db)

	authHandler := auth.NewHandler(authSvc, oauthCfg, cfg.FrontendURL, cfg.JWTRefreshTTL)
	userHandler := user.NewHandler(userRepo)
	noteHandler := note.NewHandler(noteRepo)
	authMiddleware := auth.Middleware(tokenSvc)

	// Роутер
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
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout", authHandler.Logout)
			r.Get("/google", authHandler.GoogleLogin)
			r.Get("/google/callback", authHandler.GoogleCallback)
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
		})
	})

	addr := ":" + cfg.Port
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}
