# Research Log

Daily pre-market research entries will be appended here.
Format each entry:

## YYYY-MM-DD — Pre-market Research

### Account
- Equity: $X
- Cash: $X
- Buying power: $X
- Daytrade count: N

### Market Context
- WTI / Brent:
- S&P 500 futures:
- VIX:
- Today's catalysts:
- Earnings before open:
- Economic calendar:
- Sector momentum:

### Trade Ideas
1. TICKER — catalyst, entry $X, stop $X, target $X, R:R X:1
2. ...

### Risk Factors
- ...

### Decision
TRADE or HOLD (default HOLD if no edge)

## 2026-07-07 — Pre-market Research

### Account
- Equity: $100,000 (paper account; per strategy, treating $10,000 as usable capital, rest ignored)
- Cash: $100,000
- Buying power: $400,000
- Daytrade count: 0
- Positions: none | Open orders: none (Day 0 — bot not yet launched)

### Market Context
- WTI ~$69/bbl, Brent ~$72.94/bbl — near 4-month lows; OPEC+ (led by Saudi Arabia) raised production quotas over the weekend, adding supply pressure. [tradingeconomics.com](https://tradingeconomics.com/commodity/brent-crude-oil), [Brent futures](https://www.investing.com/commodities/brent-oil)
- S&P 500 futures: -0.2/-0.25% premarket; Nasdaq-100 futures -1%, dragged by semiconductor weakness. SpaceX joins Nasdaq-100 today. [Bloomberg](https://www.bloomberg.com/news/articles/2026-07-06/stock-market-today-dow-s-p-live-updates), [Benzinga](https://www.benzinga.com/markets/prediction-markets/26/07/60297181/sp500-july-7-open-up-or-down-polymarket-dow-record-semiconductor-stocks-market-rotation)
- VIX: ~15.9 (+0.44%) — calm, no fear spike. [Yahoo Finance](https://finance.yahoo.com/quote/%5EVIX/)
- Today's catalysts: Global semiconductor/memory rout — Samsung -9%, SK Hynix -14.6% ($290B combined value lost), Micron -13% (-$138B), Kospi circuit-breaker-level drop. Driver: SK Hynix HBM production-expansion slowdown + doubts AI infra capex will pay off + hawkish tone from new Fed Chair Kevin Warsh. Money rotating out of semis into megacap platform tech (MSFT, META, GOOGL, AMZN). [CNBC](https://www.cnbc.com/2026/07/02/samsung-sk-hynix-shares-slide-kospi-tech-selloff-nasdaq.html), [Bloomberg](https://www.bloomberg.com/news/articles/2026-07-02/south-korean-stocks-tumble-6-as-ai-jitters-hurt-chipmakers)
- Earnings before open: none of note for US names; Samsung (Korea) already reported, profit +19x YoY but guidance/spending concerns overshadowed it. [Yahoo Finance calendar](https://finance.yahoo.com/calendar/earnings/)
- Economic calendar: US trade deficit (May data) due ~8:30am ET — routine, low-impact. No CPI/PPI/FOMC/jobs data today. [BEA](https://www.bea.gov/data/intl-trade-investment/international-trade-goods-and-services), [tradingeconomics.com calendar](https://tradingeconomics.com/united-states/calendar)
- Sector momentum (2026 YTD): XLK (Tech) +33% (leader, but now under pressure from the semi unwind), XLE (Energy) +21%, XLI (Industrials) +20%, XLF (Financials) only +2.4% (laggard). REITs/Staples flagged as underperformers. [Seeking Alpha](https://seekingalpha.com/article/4854947-my-s-and-p-500-prediction-on-sector-out-performers-and-laggards-in-2026), [ETF DB](https://etfdb.com/sector-investing-content-hub/xlk-xle-xli-top-performing-sector-spdrs/)
- No held positions — no ticker-specific news to review.

### Trade Ideas (documented, not executed — see Decision)
1. MSFT/META/GOOGL/AMZN — catalyst: rotation beneficiary as capital exits AI-infra/memory chip names into megacap platform tech; would need a specific pullback entry + confirmed relative-strength breakout before committing. No defined entry/stop yet — watchlist only.
2. Avoid semiconductors (SMH, MU, individual chip names) — thesis broken short-term: HBM capex doubts + hawkish Fed overhang. Sector momentum leader (XLK) is now the most crowded/volatile trade — not an entry today.
3. Energy (XLE) — YTD momentum strong (+21%) but oil sitting near 4-month lows on OPEC+ supply increase; momentum and spot price are diverging — wait for oil to stabilize before treating as a long.

### Risk Factors
- Fresh Fed leadership (Kevin Warsh) reads hawkish — added macro/rate uncertainty this week.
- Semiconductor unwind could spill into broader tech/Nasdaq-100 if it doesn't stabilize.
- Day 0: no track record yet: first live trades should have unambiguous catalysts per the entry checklist.
- Sector momentum data pulled from single-source web search estimates (deep-research fetch pass failed — 27/27 sources empty) — treat YTD sector % as directional, not precise.

### Decision
HOLD — no position currently open, no ticker clears the full entry checklist (specific catalyst + confirmed sector momentum + defined stop/target) yet. Semiconductor rotation is a developing story to watch, not an entry signal today. Patience > activity on Day 0.

## 2026-07-17 — Pre-market Research

### Account
- **BLOCKED: live account pull failed.** `bash scripts/alpaca.sh account/positions/orders` all returned `curl: (56) CONNECT tunnel failed, response 403` — the session's egress proxy is denying the destination host `paper-api.alpaca.markets` (org policy block, not a missing-key issue; env vars `ALPACA_API_KEY`/`ALPACA_SECRET_KEY`/`ALPACA_ENDPOINT`/`ALPACA_DATA_ENDPOINT` were all confirmed set). Per proxy runbook (`/root/.ccr/README.md`): do not retry or route around a 403/407 from the proxy — report it. Sent a PushNotification alert.
- Last known state (Day 0 snapshot, 2026-07-07 / memory/TRADE-LOG.md): $10,000 usable capital baseline, 0 open positions, 0 open orders. No trades logged since. Equity/cash/buying power/daytrade count for today could NOT be verified live.

### Market Context
- WTI/Brent: Brent ~$85.95/bbl (+2.04% on the day); oil on track for an 11%+ weekly gain, crude touching ~$87/bbl — 4th straight up day. Driver: escalating US-Iran conflict — US struck an oil tanker near Iran's main export terminal this week (first since the blockade was reimposed), Trump warned of hitting Iranian infrastructure next week absent a diplomatic breakthrough; June ceasefire has collapsed. [tradingeconomics.com](https://tradingeconomics.com/commodity/brent-crude-oil), [Washington Times/AP](https://www.washingtontimes.com/news/2026/jul/16/ai-stocks-slumping-oil-prices-keep-rising/), [CNBC](https://www.cnbc.com/2026/07/16/stock-market-today-live-updates.html)
- S&P 500 futures: -0.9% premarket; Nasdaq-100 futures -1.9%. Chip ETFs extending declines premarket — iShares Semiconductor ETF (SOXX) -3.7%, VanEck Semiconductor ETF (SMH) -3.4%. [CNBC](https://www.cnbc.com/markets/pre-markets/)
- VIX: ~16.7-17.2, mid-range "calm" band — no fear spike despite the Iran headlines. [Yahoo Finance](https://finance.yahoo.com/quote/%5EVIX/)
- Today's catalysts: (1) Iran war driving oil/energy higher — Energy (XLE) up ~32% YTD, the standout sector leader, still gaining on the week (high-confidence, 3-vote verified). (2) AI-capex jitters hitting chip stocks — S&P 500 fell ~0.3-0.5%, Nasdaq fell ~0.9-1.5% on 7/16 as Micron, Sandisk and peers sold off following TSMC's raised capex spending forecast spooking the "is AI spend sustainable" debate (high-confidence, 3-vote verified), even though those names remain up sharply YTD (specific YTD % figures for MU/SNDK could NOT be verified — conflicting sourcing, dropped). (3) Netflix -8% after-hours on a second straight quarter of slowing subscriber/sales growth guidance. [Washington Times/AP](https://www.washingtontimes.com/news/2026/jul/16/ai-stocks-slumping-oil-prices-keep-rising/), [Bloomberg](https://www.bloomberg.com/news/articles/2026-07-16/stock-market-today-dow-s-p-live-updates), [Schwab](https://www.schwab.com/learn/story/stock-market-update-open)
- Earnings before open: Travelers (TRV), Truist Financial (TFC), Fifth Third Bancorp (FITB) — regional/financial names. [Kiplinger](https://www.kiplinger.com/investing/stocks/17494/next-week-earnings-calendar-stocks), [Earnings Whispers](https://www.earningswhispers.com/calendar/20260717/1)
- Economic calendar: Imports/Exports + New Residential Construction (housing starts/permits) 8:30am ET; Industrial Production & Capacity Utilization 9:15am ET; Michigan Consumer Sentiment (prelim) 10:00am ET; NY Fed Staff Nowcast 12:45pm ET. No CPI/PPI/FOMC/jobs data today (CPI already released 7/14). [FRED calendar](https://fred.stlouisfed.org/releases/calendar), [tradingeconomics.com](https://tradingeconomics.com/united-states/calendar)
- Sector momentum (deep-research, adversarially verified): Energy (XLE) confirmed leader, ~32% YTD, still climbing on Iran-driven oil strength (2/3 vote — some sourcing blog-tier but no contradiction found). Tech/semis (XLK) was the week's weakest performer on AI-capex-jitter selling, though still a strong YTD gainer overall — this looks like a pullback within an uptrend, not a confirmed reversal (unconfirmed either way). YTD rankings for the other 8 sector SPDRs (XLF, XLI, XLV, XLY, XLP, XLB, XLU, XLRE, XLC) were NOT established — no verified source data surfaced. [Deep-research synthesis: 42 agents, 2/4 claims survived 3-vote adversarial verification]
- No held positions (per last known state) — no ticker-specific news to review.

### Trade Ideas (documented, not executed — see Decision)
1. Energy (XLE / integrated majors) — catalyst: Iran war driving oil to 4-day highs, sector already YTD leader. Risk: this is a headline-driven spike (war), not a demand story — any ceasefire/de-escalation reverses it fast. Watchlist only; would need a defined pullback entry, not chasing the spike. No entry/stop/target set today.
2. Avoid semiconductors/AI-capex names (SMH, SOXX, MU, individual chip names) — thesis: AI-capex-sustainability doubts actively selling off the sector this week; too volatile/uncertain for a fresh long right now despite strong YTD performance. Not an entry.
3. Financials (TRV, TFC, FITB reporting today) — watchlist only pending earnings reactions; sector has been a relative laggard historically, a strong beat + guide could be a catalyst but no data yet pre-open.

### Risk Factors
- **Hard blocker: Alpaca API unreachable this session (proxy 403 on `paper-api.alpaca.markets`)** — cannot verify equity/cash/buying power/daytrade count, cannot place or manage any order even if a thesis cleared. This alone rules out any trade today.
- Active, escalating US-Iran conflict — genuine two-sided headline risk: further escalation could spike VIX and hit broad equities; any ceasefire signal would sharply reverse the energy/oil trade.
- AI-capex jitters could deepen into a broader tech/Nasdaq unwind if TSMC's spending signal triggers more repricing.
- Two of four deep-research claims (specific YTD % for Micron, Sandisk) failed adversarial verification — treat individual-stock YTD figures as unconfirmed; only sector-level directional claims (Energy up, Tech/semis weak-on-the-week) are verified.
- Full 11-sector YTD ranking incomplete — only Energy (leader) and Tech/semis (weak-week) are substantiated; don't assume other sectors' momentum without further confirmation.

### Decision
HOLD — mandatory regardless of thesis quality: the Alpaca API is unreachable this session (proxy-level 403), so the Buy-Side Gate (position count, cash, buying power, daytrade count) cannot be verified and no order could be placed or managed even if desired. Separately, today's dominant catalyst (active Iran war) is genuinely two-sided headline risk not a clean momentum signal. Patience > activity.
