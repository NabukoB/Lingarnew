// Package testutil starts a real Postgres for integration tests (testcontainers),
// applies the migrations as the schema owner and hands tests a pool that
// connects as a login role inside wisp_app, so row-level security applies
// exactly as in production.
//
// Set TEST_DATABASE_URL (an owner/superuser URL on a disposable database) to
// skip Docker.
package testutil

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/url"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/db"
	"github.com/nabukob/lingarnew/wisp-saas/internal/platform/migrate"
	"github.com/nabukob/lingarnew/wisp-saas/internal/secrets"
)

const appPassword = "wisp_api_test"

var (
	once     sync.Once
	appURL   string
	ownerURL string
	startErr error
)

// DB returns a pool connected as the RLS-restricted app role. The database is
// shared by all tests in the package; tests isolate data by creating their own tenants.
func DB(t testing.TB) *db.DB {
	t.Helper()
	once.Do(start)
	if startErr != nil {
		t.Fatalf("start postgres: %v", startErr)
	}
	d, err := db.Open(context.Background(), appURL)
	if err != nil {
		t.Fatalf("open app pool: %v", err)
	}
	t.Cleanup(d.Close)
	return d
}

// OwnerURL is the schema-owner URL (bypasses RLS). Use it only to assert on raw rows.
func OwnerURL(t testing.TB) string {
	once.Do(start)
	if startErr != nil {
		t.Fatalf("start postgres: %v", startErr)
	}
	return ownerURL
}

// Sealer returns a secrets sealer with a throwaway local key.
func Sealer(t testing.TB) *secrets.Sealer {
	kek, err := secrets.NewLocalKEK(base64.StdEncoding.EncodeToString(make32()))
	if err != nil {
		t.Fatal(err)
	}
	return secrets.NewSealer(kek)
}

func make32() []byte {
	b := make([]byte, 32)
	for i := range b {
		b[i] = byte(i * 7)
	}
	return b
}

func start() {
	ctx := context.Background()
	ownerURL = os.Getenv("TEST_DATABASE_URL")
	if ownerURL == "" {
		c, err := tcpostgres.Run(ctx, "postgres:16-alpine",
			tcpostgres.WithDatabase("wisp"),
			tcpostgres.WithUsername("owner"),
			tcpostgres.WithPassword("owner"),
			testcontainers.WithWaitStrategy(wait.ForLog("database system is ready to accept connections").WithOccurrence(2).WithStartupTimeout(90*time.Second)),
		)
		if err != nil {
			startErr = err
			return
		}
		ownerURL, err = c.ConnectionString(ctx, "sslmode=disable")
		if err != nil {
			startErr = err
			return
		}
	}
	if err := migrate.Up(ownerURL); err != nil {
		startErr = err
		return
	}
	conn, err := pgx.Connect(ctx, ownerURL)
	if err != nil {
		startErr = err
		return
	}
	defer conn.Close(ctx)
	_, err = conn.Exec(ctx, fmt.Sprintf(`DO $$ BEGIN
		IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wisp_api') THEN
			CREATE ROLE wisp_api LOGIN PASSWORD '%s' IN ROLE wisp_app;
		END IF; END $$;`, appPassword))
	if err != nil {
		startErr = err
		return
	}
	u, err := url.Parse(ownerURL)
	if err != nil {
		startErr = err
		return
	}
	u.User = url.UserPassword("wisp_api", appPassword)
	appURL = u.String()
}
