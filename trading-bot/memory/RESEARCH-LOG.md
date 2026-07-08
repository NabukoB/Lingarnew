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

## 2026-07-08 — Pre-market Research (run inline during market-open, no prior entry existed)

### Account
- Equity: $99,990.31 (paper; treating $10,000 as usable capital per strategy)
- Cash: $99,608.05
- Buying power: $399,502.53
- Daytrade count: not returned by this account endpoint (treat as 0/unknown; no same-day round-trips planned)
- Positions: MSFT x1 @ avg $391.94, current $382.29 (-2.5%), 10% trailing GTC stop live at $355.12 (hwm $394.58)
- Note: MSFT entry (2026-07-07) was never appended to TRADE-LOG.md by the prior session — logged retroactively below to keep records accurate.

### Market Context
- Middle East escalation: Trump told NATO summit the Iran ceasefire is "over" amid renewed hostilities — broad risk-off. [CNBC](https://www.cnbc.com/2026/07/07/stock-market-today-live-updates.html)
- S&P 500 -0.7%, Nasdaq -0.7%, Dow -722pts/-1.4% intraday on the headline.
- Oil spiking on supply-disruption fear: WTI +5-7.6% to ~$74-75.77/bbl, Brent +5-8% to ~$78-80/bbl. [tradingeconomics.com](https://tradingeconomics.com/commodity/brent-crude-oil)
- VIX 17.65, +9.4% — fear gauge jumping but not panic-level yet.
- Sector momentum: XLE +2% intraday (Diamondback, Occidental, Valero leading) on the oil spike; XLK -2% as tech gets sold (Sandisk -4%, Micron -4%).
- MSFT-specific: down further to ~$382 (-1.7% today, -19% YTD) on AI-spend concerns + reports MSFT is looking to swap OpenAI/Anthropic models for in-house AI in Office apps; gaming division cut 1,600 jobs. Next earnings 2026-07-29. Thesis for existing position (megacap rotation beneficiary) is weakening, not broken — spread is tight ($382.27/$382.36), stop untouched.
- No earnings of note before open; no CPI/PPI/FOMC/jobs today.

### Trade Ideas
1. XLE / energy names (Diamondback, Occidental, Valero) — catalyst is a single-day geopolitical spike, not confirmed multi-day sector momentum; chasing a war-headline pop violates "never chase a spike" discipline. Watchlist only — needs 2-3 days of held gains before treating as a real entry.
2. No other names clear catalyst + confirmed momentum + defined stop/target today.

### Risk Factors
- Headline-driven, highly reversible risk (ceasefire status can flip on the next statement) — poor day to open new risk.
- VIX rising, broad tape red — bad expected-value day for fresh longs.
- Existing MSFT position already showing thesis erosion (down -19% YTD, AI-spend/analyst concerns) — watch for -7% stop or thesis break, no action needed yet (-2.5%, stop intact).

### Decision
HOLD — no new trades today. Geopolitical-shock day with a single-session energy spike is not a confirmed-momentum entry signal, and no ticker clears the full checklist. Existing MSFT position holds as-is with its GTC trailing stop.
