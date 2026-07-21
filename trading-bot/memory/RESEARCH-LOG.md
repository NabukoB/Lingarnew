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

## 2026-07-21 — Pre-market Research

### Account
- **BLOCKED — could not pull account/positions/orders.** `bash scripts/alpaca.sh account|positions|orders` all failed with `curl: (22) 403` on the CONNECT tunnel to `paper-api.alpaca.markets`. Checked `$HTTPS_PROXY/__agentproxy/status`: confirmed org egress policy is denying the host outright (`connect_rejected`, "gateway answered 403 to CONNECT (policy denial or upstream failure)"), repeated across 4 recent attempts. This is a network policy block, not a credentials issue — `ALPACA_API_KEY`/`ALPACA_SECRET_KEY` are both set. Per README, policy denials are not to be retried or routed around. Sent a PushNotification alert.
- Last known state (memory/TRADE-LOG.md, memory/RESEARCH-LOG.md): Day 0 baseline dated 2026-07-07, no positions, no trades logged since. That log is now 14 days stale and unverifiable this session — treat as unconfirmed, not current truth.

### Market Context
- WTI ~$83.90/bbl (+0.8%), Brent ~$89.77/bbl (+0.6%) — up on the day but off recent one-month highs; mediators reportedly floated a 10-day Iran ceasefire proposal, easing some war-premium. [Reuters via 93.3 The Drive](https://www.933thedrive.com/2026/07/21/wall-st-futures-gain-on-iran-ceasefire-hopes-earnings-in-focus/), [Yahoo Finance](https://finance.yahoo.com/markets/stocks/articles/ceasefire-hopes-add-550-billion-143722115.html)
- S&P 500 futures +0.45-0.5% premarket; Nasdaq-100 futures +1.3% on chip-stock revival + ceasefire hopes. Polymarket implied 95% odds of a higher open. [Yahoo Finance](https://finance.yahoo.com/markets/live/stock-market-today-tuesday-july-21-dow-sp-500-nasdaq-084631499.html), [Benzinga](https://www.benzinga.com/markets/prediction-markets/26/07/60569710/sp500-july-21-open-up-or-down-polymarket-iran-ceasefire-oil-earnings-ai)
- VIX: last close 18.65 (July 20, -0.64%) — moderately elevated vs. ~15.9 on 2026-07-07. [Yahoo Finance](https://finance.yahoo.com/quote/%5EVIX/)
- Today's catalysts: US-Iran conflict still hot despite ceasefire chatter — CENTCOM carried out a 10th consecutive night of strikes after Trump declared a prior ceasefire "over"; Iran has hit US assets in the Middle East and Houthi allies declared a maritime embargo against Saudi Arabia. Markets are looking past this toward AI-bellwether earnings (Alphabet reports Wednesday — CapEx guidance is the key AI-trade signal). [93.3 The Drive](https://www.933thedrive.com/2026/07/21/wall-st-futures-gain-on-iran-ceasefire-hopes-earnings-in-focus/), [Bloomberg](https://www.bloomberg.com/news/articles/2026-07-20/stock-market-today-dow-s-p-live-updates)
- Earnings before open today: Capital One (COF), Chubb (CB), Danaher (DHR), D.R. Horton (DHI), General Motors (GM), Novartis (NVS), Charles Schwab (SCHW), among ~70 names reporting. Of the ~54 S&P 500 companies reported so far this season, 87% beat bottom-line estimates (FactSet). [Benzinga](https://www.benzinga.com/markets/equities/26/07/60570908/stock-market-today-dow-jones-nasdaq-100-futures-rise-as-tech-stocks-lead-the-rally-nebius-archer-iren-in-focus), [93.3 The Drive](https://www.933thedrive.com/2026/07/21/wall-st-futures-gain-on-iran-ceasefire-hopes-earnings-in-focus/)
- Economic calendar: FOMC's Barr speaks 10am ET today (no CPI/PPI/jobs today). This week: CPI Wed 8:30am + FOMC Kashkari speaks, PPI + jobless claims Thu 8:30am, Michigan Consumer Sentiment Fri 10am. Next FOMC meeting July 28-29. [tradingeconomics.com calendar](https://tradingeconomics.com/united-states/calendar)
- Sector momentum: YTD still led by XLK (Tech, ~26-33% depending on source) and XLE (Energy, +21%), XLI (Industrials, +20%) — but this past week (ending 7/20) shows a sharp reversal: **Energy best +3.7%**, Real Estate +1.4%, Financials +0.1%; **Technology worst, -4%+**, Industrials -1.9%, Health Care -1%. Read as AI-capex-jitters-driven rotation out of the YTD tech leadership into energy/defensives ahead of Big Tech earnings. Deep-research fetch pass again failed (24/24 sources empty, same failure pattern as 2026-07-07) — fell back to direct WebSearch; treat as directional, not precise. [StockCharts](https://articles.stockcharts.com/article/best-five-us-stock-market-sectors-week-of-july-20-2026-75/), [ETF DB](https://etfdb.com/sector-investing-content-hub/xlk-xle-xli-top-performing-sector-spdrs/)
- No verified held positions — no ticker-specific news pulled (see Account section: position state unconfirmed this session, not "known empty").

### Trade Ideas (documented, not executed — see Decision)
1. Energy names (XLE-linked) — catalyst: sharpest one-week sector rotation into Energy (+3.7%) on Iran-conflict oil premium; needs a confirmed pullback entry and oil-price stabilization before treating as a real setup. No entry/stop defined — watchlist only.
2. Reduce/avoid new Tech exposure — thesis: YTD leadership sector just posted its worst week (-4%+) on AI-capex doubts ahead of Alphabet's Wednesday earnings (CapEx guidance is the swing factor); wait for that print before any new tech entries.
3. Watch this week's earnings docket (GM, Schwab today; Alphabet/IBM/Tesla later) for volatility — not an entry signal, a reason for caution on position sizing/timing.

### Risk Factors
- **Critical/blocking:** Alpaca paper API unreachable all session (network egress policy denies `paper-api.alpaca.markets`) — equity, cash, buying power, open positions, and daytrade count are all unverified. No trade can pass the Buy-Side Gate without this data.
- Escalating US-Iran military conflict (active strikes both directions, Houthi embargo on Saudi Arabia) despite ceasefire headlines — high geopolitical tail risk, oil/futures could reverse fast on any escalation headline.
- Big AI-bellwether earnings this week (Alphabet Wed, IBM, Tesla) — could sharply move the tech/AI trade either direction.
- CPI (Wed) and PPI (Thu) inflation prints ahead of the July 28-29 FOMC meeting — rate-path repricing risk.
- VIX elevated vs. two weeks ago (18.65 vs ~15.9) — less margin for error on any new position.
- Sector rotation (Energy in / Tech out) is only one week old — not yet a confirmed trend, could snap back.
- memory/TRADE-LOG.md and memory/RESEARCH-LOG.md have a 14-day gap since the last entry (2026-07-07) — position/account continuity cannot be confirmed this session.

### Decision
HOLD — mandatory, not discretionary: the Alpaca API is unreachable this session, so equity, cash, open-position count, and daytrade count (all required by the Buy-Side Gate) cannot be verified. No order can be placed without that data regardless of how attractive any catalyst looks. Separately, market context itself (fresh 1-week sector rotation, major earnings this week, live geopolitical conflict, elevated VIX) argues for patience even once API access is restored. Re-attempt account pull next session; escalate to admin if the 403 policy block persists.
