# make lint test          — what CI runs (integration tests need Docker)
# make e2e                — Playwright smoke against a running stack
# make up / make down     — local stack with docker compose
GO_PKGS := ./...

.PHONY: lint test test-go test-web e2e e2e-radius build sqlc up down script

lint:
	gofmt -l . | (! grep .) || (echo "run gofmt -w ." && exit 1)
	go vet $(GO_PKGS)
	cd web && npx tsc --noEmit && npx next lint

test: test-go test-web

test-go:
	go test -count=1 $(GO_PKGS)

test-web:
	cd web && npx vitest run

e2e:
	cd web && npx playwright test

e2e-radius:
	docker build -f infra/docker/freeradius.Dockerfile -t wisp-freeradius .
	go test -count=1 -tags e2e ./tests/e2e/

build:
	go build -o bin/ ./cmd/...
	cd web && npm run build

sqlc:
	sqlc generate

up:
	docker compose up --build -d

down:
	docker compose down

script:
	go run ./tools/script-generator
