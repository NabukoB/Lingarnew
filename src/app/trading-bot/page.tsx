import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getAccount,
  getPositions,
  getOpenOrders,
  type AlpacaPosition,
  type AlpacaOrder,
} from "@/lib/trading-bot/alpaca";
import { readResearchLog, readTradeLogTail } from "@/lib/trading-bot/memory";
import { Markdown } from "./Markdown";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fmtMoney = (n: number, digits = 2) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export default async function TradingBotPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [account, positions, orders, research, tradeTail] = await Promise.all([
    getAccount(),
    getPositions(),
    getOpenOrders(),
    readResearchLog(),
    readTradeLogTail(),
  ]);

  const equity = account ? parseFloat(account.equity) : null;
  const lastEquity = account ? parseFloat(account.last_equity) : null;
  const dayPnl =
    equity !== null && lastEquity !== null ? equity - lastEquity : null;
  const dayPnlPct =
    dayPnl !== null && lastEquity && lastEquity !== 0
      ? (dayPnl / lastEquity) * 100
      : null;

  const now = new Date();
  const nowLabel = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] text-lingar-gold uppercase tracking-widest font-medium">
          Trading Bot
        </p>
        <h1 className="text-2xl font-bold text-lingar-paper mt-1">
          Paper Dashboard
        </h1>
        <p className="text-[11px] text-lingar-ghost mt-1">
          {account
            ? `${account.account_number} · ${account.status} · ${nowLabel}`
            : nowLabel}
        </p>
      </div>

      {account ? (
        <div className="bg-lingar-surface rounded-2xl p-5 border border-lingar-surface2">
          <p className="text-[10px] text-lingar-ghost uppercase tracking-wider">
            Equity
          </p>
          <p className="text-3xl font-bold text-lingar-paper mt-0.5 tabular-nums">
            ${fmtMoney(equity!)}
          </p>
          {dayPnl !== null && dayPnlPct !== null && (
            <p
              className={`text-xs mt-1 tabular-nums ${
                dayPnl >= 0 ? "text-lingar-green" : "text-lingar-red"
              }`}
            >
              {dayPnl >= 0 ? "+" : ""}${fmtMoney(dayPnl)} ({fmtPct(dayPnlPct)}){" "}
              <span className="text-lingar-ghost">today</span>
            </p>
          )}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <MiniStat label="Cash" value={`$${fmtMoney(parseFloat(account.cash), 0)}`} />
            <MiniStat
              label="Buying Power"
              value={`$${fmtMoney(parseFloat(account.buying_power), 0)}`}
            />
            <MiniStat label="Day Trades" value={String(account.daytrade_count ?? 0)} />
          </div>
        </div>
      ) : (
        <ErrorCard
          title="Alpaca unavailable"
          message="Server can't reach Alpaca. Check ALPACA_API_KEY, ALPACA_SECRET_KEY, ALPACA_ENDPOINT in the Vercel env."
        />
      )}

      <Section
        title="Open Positions"
        count={positions?.length ?? null}
      >
        {positions && positions.length > 0 ? (
          <PositionsTable positions={positions} />
        ) : (
          <Empty text="No open positions." />
        )}
      </Section>

      <Section title="Open Orders" count={orders?.length ?? null}>
        {orders && orders.length > 0 ? (
          <OrdersTable orders={orders} />
        ) : (
          <Empty text="No open orders." />
        )}
      </Section>

      <Section
        title="Latest Research"
        subtitle={research.latestDate ?? undefined}
      >
        {research.latest ? (
          <Markdown content={research.latest} />
        ) : (
          <Empty text="No research entries yet — the pre-market routine hasn't written one." />
        )}
      </Section>

      <Section title="Trade Log — Tail">
        {tradeTail && tradeTail.trim().length > 0 ? (
          <Markdown content={tradeTail} />
        ) : (
          <Empty text="Trade log is empty." />
        )}
      </Section>

      <div className="text-center text-[11px] text-lingar-ghost pt-4 border-t border-lingar-surface2 space-y-1">
        <p>Refresh the page to pull the latest Alpaca state.</p>
        <p>
          Memory files ·{" "}
          <a
            href="https://github.com/NabukoB/Lingarnew/tree/main/trading-bot/memory"
            target="_blank"
            rel="noreferrer"
            className="text-lingar-gold underline"
          >
            GitHub
          </a>{" "}
          · Alpaca ·{" "}
          <a
            href="https://app.alpaca.markets/paper/dashboard/overview"
            target="_blank"
            rel="noreferrer"
            className="text-lingar-gold underline"
          >
            Console
          </a>
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] text-lingar-ghost uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xs font-semibold text-lingar-paper mt-0.5 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number | null;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-lingar-surface rounded-2xl p-5 border border-lingar-surface2">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-lingar-paper uppercase tracking-wider">
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="text-[11px] text-lingar-ghost tabular-nums">
            {count}
          </span>
        )}
        {subtitle && (
          <span className="text-[11px] text-lingar-ghost">{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-lingar-ghost italic">{text}</p>;
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-lingar-surface border border-lingar-red/40 rounded-2xl p-5">
      <p className="text-sm font-semibold text-lingar-red">{title}</p>
      <p className="text-xs text-gray-300 mt-1 leading-relaxed">{message}</p>
    </div>
  );
}

function PositionsTable({ positions }: { positions: AlpacaPosition[] }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full text-[12px] tabular-nums">
        <thead>
          <tr className="text-left text-lingar-ghost text-[10px] uppercase tracking-wider">
            <th className="py-1 px-1 font-medium">Sym</th>
            <th className="py-1 px-1 font-medium text-right">Qty</th>
            <th className="py-1 px-1 font-medium text-right">Entry</th>
            <th className="py-1 px-1 font-medium text-right">Mark</th>
            <th className="py-1 px-1 font-medium text-right">P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const pl = parseFloat(p.unrealized_pl);
            const plpc = parseFloat(p.unrealized_plpc) * 100;
            const green = pl >= 0;
            return (
              <tr key={p.symbol} className="border-t border-lingar-surface2">
                <td className="py-2 px-1 font-semibold text-lingar-paper">
                  {p.symbol}
                </td>
                <td className="py-2 px-1 text-right text-gray-300">{p.qty}</td>
                <td className="py-2 px-1 text-right text-gray-300">
                  ${fmtMoney(parseFloat(p.avg_entry_price))}
                </td>
                <td className="py-2 px-1 text-right text-gray-300">
                  ${fmtMoney(parseFloat(p.current_price))}
                </td>
                <td
                  className={`py-2 px-1 text-right ${
                    green ? "text-lingar-green" : "text-lingar-red"
                  }`}
                >
                  {green ? "+" : ""}${fmtMoney(pl)}
                  <span className="text-[10px] block">
                    {fmtPct(plpc)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OrdersTable({ orders }: { orders: AlpacaOrder[] }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full text-[12px] tabular-nums">
        <thead>
          <tr className="text-left text-lingar-ghost text-[10px] uppercase tracking-wider">
            <th className="py-1 px-1 font-medium">Sym</th>
            <th className="py-1 px-1 font-medium">Side</th>
            <th className="py-1 px-1 font-medium text-right">Qty</th>
            <th className="py-1 px-1 font-medium">Type</th>
            <th className="py-1 px-1 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-lingar-surface2">
              <td className="py-2 px-1 font-semibold text-lingar-paper">
                {o.symbol}
              </td>
              <td
                className={`py-2 px-1 uppercase text-[10px] font-semibold ${
                  o.side === "buy" ? "text-lingar-green" : "text-lingar-red"
                }`}
              >
                {o.side}
              </td>
              <td className="py-2 px-1 text-right text-gray-300">{o.qty}</td>
              <td className="py-2 px-1 text-gray-300 text-[11px]">
                {o.type}
                {o.trail_percent ? ` ${o.trail_percent}%` : ""}
                {o.limit_price ? ` $${o.limit_price}` : ""}
                {o.stop_price ? ` $${o.stop_price}` : ""}
              </td>
              <td className="py-2 px-1 text-gray-300 text-[10px] uppercase">
                {o.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
