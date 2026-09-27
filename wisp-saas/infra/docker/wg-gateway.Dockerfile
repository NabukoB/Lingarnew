# Userspace WireGuard (wireguard-go) gateway. Needs NET_ADMIN and /dev/net/tun.
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/wg-gateway ./cmd/wg-gateway

FROM alpine:3.20
RUN apk add --no-cache iproute2 ca-certificates
COPY --from=build /out/wg-gateway /usr/local/bin/wg-gateway
EXPOSE 51820/udp
ENTRYPOINT ["/usr/local/bin/wg-gateway"]
