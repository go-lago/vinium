package ctxutil

import (
	"context"

	"github.com/google/uuid"
)

type contextKey string

const UserIDKey contextKey = "userID"

func SetUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, UserIDKey, id)
}

func GetUserID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return id, ok
}
