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

## 2026-07-22 — Pre-market Research

### Account
- **UNAVAILABLE** — Alpaca API calls (`account`, `positions`, `orders`) all failed: `curl: (56) CONNECT tunnel failed, response 403`. This is the session's outbound egress proxy blocking `paper-api.alpaca.markets`, not a missing/invalid key issue (keys confirmed set). Per proxy runbook: 403 from the proxy = destination host not allowed by org policy this session — do not retry or route around it. Reported via PushNotification.
- Last known state (Trade Log Day 0 baseline): $10,000 cash-equivalent, 100% cash, no open positions, no open orders.

### Market Context
- **Oil:** WTI ~$88/bbl, Brent ~$93-95/bbl, Brent +4.6-4.8% on the day. Driven by a fresh flare-up of the US-Iran conflict (reported 6th consecutive night of US strikes; Iran struck targets in Bahrain, Jordan, Kuwait, Oman, Qatar, Syria) with the Strait of Hormuz (~20% of global oil transit) still disrupted/partially blocked. This is a re-spike off a lower ~$88 base that itself was a partial retreat from a >$100-120/bbl peak during the acute March 2026 phase of the same war. [CNBC](https://www.cnbc.com/2026/07/17/oil-price-today-brent-wti.html), [Benzinga](https://www.benzinga.com/markets/prediction-markets/26/07/60599715/sp500-july-22-open-up-or-down-polymarket-oil-fed-earnings-ai-stocks), [Gulf News](https://gulfnews.com/business/energy/amid-tanker-squeeze-in-hormuz-oil-prices-spike-as-iranus-war-chokes-global-supply-markets-on-edge-1.500463748)
- **S&P 500 futures:** -0.3% premarket; rising oil overshadowing strong corporate earnings. New 25% tariff on Brazil took effect today; reports Trump may convert the expiring 10% global tariff into a permanent duty — added trade-policy overhang. [Yahoo Finance](https://finance.yahoo.com/markets/live/stock-market-today-wednesday-july-22-dow-sp-500-nasdaq-alphabet-tesla-083644887.html), [Benzinga](https://www.benzinga.com/markets/prediction-markets/26/07/60599715/sp500-july-22-open-up-or-down-polymarket-oil-fed-earnings-ai-stocks)
- **VIX:** ~18.0, +7.8% on the day — still inside the normal 12-20 band but rising, consistent with war-headline risk. [TradingView](https://www.tradingview.com/symbols/TVC-VIX/)
- **Today's catalysts:** Alphabet (GOOGL) and Tesla (TSLA) report after the close (not before open); chip-sector rally continuing as the leveraged-unwind from early July fades (Kospi +4.6%); Texas Instruments +3.4% pre-earnings on a Susquehanna price-target raise ahead of its report today. [TipRanks](https://www.tipranks.com/news/stock-market-news-today-7-22-26-futures-slip-as-oil-jumps-alphabet-tesla-earnings-ahead)
- **Earnings before open:** T, PM, GEV, MCO, CALM, CME, NTRS, OTIS, PHM, WAB, TDY, EQNR and others — industrials/regional-bank heavy, no clear single mega-cap catalyst. GOOGL/TSLA are after close, not before open. [TipRanks](https://www.tipranks.com/news/these-are-the-stocks-reporting-earnings-today-july-22-2026), [Earnings Whispers](https://www.earningswhispers.com/calendar/20260722/3)
- **Economic calendar:** Source data was internally inconsistent on the CPI date (one source said "Wednesday July 23" despite today being confirmed Wednesday July 22) — treat with caution, no confirmed high-impact print at today's open. FOMC meeting is July 28-29 (press conference July 29, 2pm ET) — not this week. [tradingeconomics.com](https://tradingeconomics.com/united-states/calendar)
- **Sector momentum YTD:** Energy (XLE) has overtaken Tech (XLK) as 2026's best-performing sector — XLE +29.4% YTD (+9% in July alone) on the oil supply-shock story; XLK +23% YTD but -6.8% in July amid an ongoing chip-sector rout/AI-capex valuation doubts. Industrials also cited as a new market leader. S&P 500 itself +9.3% YTD, flat this month. [Benzinga](https://www.benzinga.com/markets/equities/26/07/60554062/energy-overtakes-tech-best-sector-2026) — Note: prior (7/7) entry had XLF as YTD laggard at +2.4%; not reconfirmed today, treat as stale/directional only. Deep-research pass could not independently verify precise current sector-ETF figures beyond this single source — treat as directional, not precise.
- No held positions — no ticker-specific news to review.

### Trade Ideas (documented, not executable today — see Decision)
1. **XLE / energy names** — catalyst: sector leadership (+29.4% YTD, +9% in July) tied to a real, ongoing supply-disruption story (Strait of Hormuz). Would require waiting for a confirmed pullback/base rather than chasing a war-headline spike. Hypothetical: entry near current level only after a basing signal, stop -8%, target +16% (~2:1). Risk: this momentum is headline-driven — a ceasefire/de-escalation could reverse it sharply intraday.
2. **Avoid XLK/semiconductors** — thesis still unresolved: chip-sector rout (-6.8% in July) persists on AI-capex doubts even with a Kospi bounce attempt. No clean entry signal.
3. **No new entries today, broadly** — an active war-driven oil shock plus zero account visibility is the worst combination for any first trade. Nothing clears the full entry checklist.

### Risk Factors
- **Alpaca API blocked (403, egress policy)** — cannot verify positions, cash, buying power, or daytrade count today. The Buy-Side Gate cannot be satisfied without this data regardless of idea quality; no order should be placed until access is restored.
- **Active US-Iran military conflict** with Strait of Hormuz disruption — major geopolitical tail risk; oil and equity volatility are headline-driven and can gap violently in either direction.
- **Tariff escalation** — new 25% Brazil tariff in effect today; potential conversion of the expiring 10% global tariff to permanent — added trade-policy uncertainty.
- **Chip-sector rout** — still unresolved, could spill back into broader tech/Nasdaq-100.
- **Big-cap earnings tonight** (GOOGL, TSLA) — could swing index sentiment into tomorrow's session.
- Economic-calendar source data was internally inconsistent — treat scheduled-release risk as unconfirmed, not zero.

### Decision
**HOLD — mandatory.** Alpaca API access is blocked this session (403), so account state, open positions, and buying power cannot be verified; the Buy-Side Gate cannot be satisfied under any circumstances today. Independent of that outage, today's backdrop (active war-driven oil shock, rising VIX, major earnings after close) also favors patience. No trade today.

