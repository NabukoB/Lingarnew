-- name: InsertRouterMetric :exec
INSERT INTO router_metrics (tenant_id, router_id, at, cpu_load, mem_used_pct, uptime_sec, pppoe_users, hotspot_users,
                            uplink, rx_bytes, tx_bytes, rx_bps, tx_bps)
VALUES (app_tenant(), @router_id, @at, @cpu_load, @mem_used_pct, @uptime_sec, @pppoe_users, @hotspot_users,
        @uplink, @rx_bytes, @tx_bytes, @rx_bps, @tx_bps)
ON CONFLICT (router_id, at) DO NOTHING;

-- name: LastRouterMetric :one
SELECT * FROM router_metrics WHERE router_id = $1 AND resolution_sec = 60 ORDER BY at DESC LIMIT 1;

-- name: RecentCPULoads :many
SELECT cpu_load FROM router_metrics WHERE router_id = $1 AND resolution_sec = 60 ORDER BY at DESC LIMIT $2;

-- name: LatestRouterMetrics :many
SELECT DISTINCT ON (router_id) router_id, at, cpu_load, mem_used_pct, pppoe_users, hotspot_users, rx_bps, tx_bps
FROM router_metrics
WHERE resolution_sec = 60 AND at > @since
ORDER BY router_id, at DESC;

-- name: RouterMetricSeries :many
SELECT date_bin(@step::interval, at, '2000-01-01 00:00:00+00')::timestamptz AS bucket,
       round(avg(cpu_load))::int AS cpu_load,
       round(avg(mem_used_pct))::int AS mem_used_pct,
       max(pppoe_users)::int AS pppoe_users,
       max(hotspot_users)::int AS hotspot_users,
       COALESCE(round(avg(rx_bps)), 0)::bigint AS rx_bps,
       COALESCE(round(avg(tx_bps)), 0)::bigint AS tx_bps
FROM router_metrics
WHERE router_id = @router_id AND at >= @since
GROUP BY 1
ORDER BY 1;

-- name: FoldRouterMetrics :execrows
-- Averages whole hours of minute samples older than @before into one hourly row.
INSERT INTO router_metrics (tenant_id, router_id, at, resolution_sec, cpu_load, mem_used_pct, uptime_sec,
                            pppoe_users, hotspot_users, uplink, rx_bps, tx_bps)
SELECT m.tenant_id, m.router_id, date_trunc('hour', m.at), 3600,
       round(avg(m.cpu_load))::smallint, round(avg(m.mem_used_pct))::smallint, max(m.uptime_sec),
       max(m.pppoe_users), max(m.hotspot_users), max(m.uplink), round(avg(m.rx_bps))::bigint, round(avg(m.tx_bps))::bigint
FROM router_metrics m
WHERE m.resolution_sec = 60 AND m.at < @before
GROUP BY m.tenant_id, m.router_id, date_trunc('hour', m.at)
ON CONFLICT (router_id, at) DO NOTHING;

-- name: DeleteFoldedRouterMetrics :exec
DELETE FROM router_metrics WHERE resolution_sec = 60 AND at < @before;

-- name: DeleteOldRouterMetrics :exec
DELETE FROM router_metrics WHERE at < @before;

-- name: NeighborsSeenAt :one
SELECT COALESCE(max(seen_at), '-infinity')::timestamptz FROM router_neighbors WHERE router_id = $1;

-- name: DeleteRouterNeighbors :exec
DELETE FROM router_neighbors WHERE router_id = $1;

-- name: InsertRouterNeighbor :exec
INSERT INTO router_neighbors (tenant_id, router_id, interface, mac_address, identity, address, platform, board, version, seen_at)
VALUES (app_tenant(), @router_id, @interface, @mac_address, @identity, @address, @platform, @board, @version, @seen_at)
ON CONFLICT (router_id, interface, mac_address) DO UPDATE
SET identity = EXCLUDED.identity, address = EXCLUDED.address, platform = EXCLUDED.platform,
    board = EXCLUDED.board, version = EXCLUDED.version, seen_at = EXCLUDED.seen_at;

-- name: ListRouterNeighbors :many
SELECT * FROM router_neighbors ORDER BY router_id, interface, identity;

-- name: CountBusyRouters :one
-- Routers whose latest minute sample (within @since) is at or above @cpu.
SELECT count(*)::int FROM (
    SELECT DISTINCT ON (router_id) cpu_load FROM router_metrics
    WHERE resolution_sec = 60 AND at > @since
    ORDER BY router_id, at DESC
) latest WHERE cpu_load >= @cpu::smallint;
