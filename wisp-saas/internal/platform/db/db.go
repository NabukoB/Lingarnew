// Package db opens the Postgres pool and runs work inside tenant-scoped
// transactions. Every tenant-scoped query must go through WithTenant, which
// sets app.current_tenant_id so row-level security applies.
package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nabukob/lingarnew/wisp-saas/internal/store"
)

type DB struct {
	Pool *pgxpool.Pool
}

func Open(ctx context.Context, url string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("DATABASE_URL is not a valid Postgres URL: %w", err)
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("cannot reach Postgres at %s: %w", cfg.ConnConfig.Host, err)
	}
	return &DB{Pool: pool}, nil
}

func (d *DB) Close() { d.Pool.Close() }

// WithTenant runs fn in a transaction scoped to one tenant.
func (d *DB) WithTenant(ctx context.Context, tenantID uuid.UUID, fn func(q *store.Queries) error) error {
	if tenantID == uuid.Nil {
		return errors.New("db: WithTenant called without a tenant")
	}
	return d.tx(ctx, tenantID.String(), fn)
}

// WithoutTenant runs fn with no tenant set. Tenant-scoped tables return no
// rows; use it only for the SECURITY DEFINER lookup functions.
func (d *DB) WithoutTenant(ctx context.Context, fn func(q *store.Queries) error) error {
	return d.tx(ctx, "", fn)
}

func (d *DB) tx(ctx context.Context, tenant string, fn func(q *store.Queries) error) error {
	tx, err := d.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", tenant); err != nil {
		return err
	}
	if err := fn(store.New(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// IsNotFound reports whether err is pgx.ErrNoRows.
func IsNotFound(err error) bool { return errors.Is(err, pgx.ErrNoRows) }

// UniqueViolation returns the constraint name when err is a unique violation.
func UniqueViolation(err error) (string, bool) {
	var pg *pgconn.PgError
	if errors.As(err, &pg) && pg.Code == "23505" {
		return pg.ConstraintName, true
	}
	return "", false
}
