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

## 2026-07-16 — Pre-market Research

### Account
- **UNAVAILABLE** — `bash scripts/alpaca.sh account/positions/orders` all failed: `curl: (56) CONNECT tunnel failed, response 403`. Confirmed on both `ALPACA_ENDPOINT` (paper-api.alpaca.markets) and `ALPACA_DATA_ENDPOINT` (data.alpaca.markets) with direct curl — this is an outbound network-proxy/egress policy block on the Alpaca hosts, not a missing/invalid key (both `ALPACA_API_KEY` and `ALPACA_SECRET_KEY` are set and non-empty). Per proxy runbook, 403 on a CONNECT tunnel = destination not allowed by org egress policy this session; not to be retried or routed around.
- Last known state (from memory, unverified today): Day 0 baseline, $10,000 usable capital, no open positions, no trades placed since bot launch.

### Market Context
- WTI ~$78-79.60/bbl, Brent ~$83-85/bbl — Brent at a ~1-month high. [tradingeconomics.com](https://tradingeconomics.com/commodity/brent-crude-oil), [CNBC](https://www.cnbc.com/2026/07/15/oil-prices-today-brent-wti-hormuz-blockade.html)
- S&P 500 futures: mixed/choppy — up ~0.2% on cooler CPI read early, then flipped to -0.1% pre-market Thursday per a later check. [Yahoo Finance](https://finance.yahoo.com/markets/stocks/articles/us-stock-market-today-p-081336350.html), [Benzinga](https://www.benzinga.com/markets/prediction-markets/26/07/60489078/sp500-july-16-open-up-or-down-polymarket-ppi-inflation-fed-retail-sales-netflix)
- VIX: ~16.2-16.3, range 15.88-16.57 — calm. [Yahoo Finance](https://finance.yahoo.com/quote/%5EVIX/)
- Today's catalysts: **Active Iran-US military conflict** — US struck Tehran again, reimposed naval blockade on Iranian ports near Strait of Hormuz; Iran targeted 7 commercial vessels (~12 crew dead/missing/injured). Hormuz transit volume down >50% week-over-week. Oil "little changed" so far but analysts warn of a retest of $100 if hostilities persist, higher if regional oil infrastructure is hit. Fed Chair Warsh testifies before Congress today (hawkish-leaning). June CPI came in cooler than expected (headline -0.4% MoM, YoY 3.5%; core 2.6%). [CNBC](https://www.cnbc.com/2026/07/15/oil-prices-today-brent-wti-hormuz-blockade.html), [Al Jazeera](https://www.aljazeera.com/economy/2026/7/14/oil-hits-1-month-high-as-us-iran-fighting-clouds-strait-of-hormuz-outlook), [Schwab](https://www.schwab.com/learn/story/stock-market-update-open)
- Earnings before open: **UnitedHealth (UNH)** headlines premarket earnings; also GE Aerospace, Abbott (ABT), US Bancorp, TSMC (TSM), Prologis reporting around today; Netflix (NFLX) reports after close. [Earnings Whispers](https://www.earningswhispers.com/calendar/20260716/1), [Yahoo Finance](https://finance.yahoo.com/calendar/earnings/)
- Economic calendar: Initial Claims, Advance Retail Sales, Philly Fed Manufacturing Survey, Business Inventories, NAR Pending Home Sales due today. June PPI (already out) fell -0.3% MoM, annual rate 5.5% (below 6.2% forecast). June jobs report: unemployment 4.2%. No FOMC meeting today. [tradingeconomics.com](https://tradingeconomics.com/united-states/calendar), [BLS](https://www.bls.gov/schedule/news_release/ppi.htm)
- Sector momentum (2026 YTD, via WebSearch — **Deep Research fetch pass failed again, 21/21 sources empty/failed, same issue as 07-07 entry**): XLK (Tech) leads ~26-33% YTD (wide source disagreement) but flagged by some as downgraded to underperform for 2H26 on AI-capex/valuation risk; XLE (Energy) +21%, boosted further now by Iran conflict supply-disruption premium; XLI (Industrials) +20% on AI data-center buildout + aerospace/defense demand; XLF (Financials) and healthcare/communication services lagging vs. expectations. [Seeking Alpha](https://seekingalpha.com/article/4854947-my-s-and-p-500-prediction-on-sector-out-performers-and-laggards-in-2026), [ETF DB](https://etfdb.com/sector-investing-content-hub/xlk-xle-xli-top-performing-sector-spdrs/)
- No held positions (per last known state) — no ticker-specific news to review.

### Trade Ideas (documented, not executed — see Decision)
1. Energy majors / XLE (e.g., XOM, CVX) — catalyst: active Iran-US conflict, Strait of Hormuz blockade, oil at 1-month highs with analyst upside risk to $100 on escalation. Sector already in YTD momentum (+21%). No defined entry/stop yet — needs confirmed relative-strength breakout and a calmer read on account state before sizing. Watchlist only.
2. Industrials / XLI — AI data-center buildout + aerospace/defense demand sustaining momentum (+20% YTD). No specific single-name catalyst identified yet — watchlist only.
3. Avoid Financials (XLF) and story-crowded AI/semis names — underperforming vs. expectations / valuation-risk flagged by multiple sources; wait for a clearer setup.

### Risk Factors
- **BLOCKING: Alpaca API unreachable (proxy 403 on both trading and data hosts).** Cannot verify equity/cash/buying power/daytrade count, cannot see open positions or orders, cannot place or manage any order. No trade can pass the Buy-Side Gate today regardless of catalyst quality.
- Active, escalating Iran-US military conflict — Strait of Hormuz disruption risk, oil could spike sharply on any infrastructure strike; high headline-risk day.
- Fed Chair Warsh testifies today — hawkish surprise risk on top of already-hawkish-leaning Fed reads.
- Heavy earnings day (UNH before open, NFLX after close, TSM, GE, ABT) — index-moving surprise risk.
- Sector-momentum figures pulled from single-pass WebSearch only; Deep Research fetch stage failed entirely (21/21 sources empty) for the second research cycle in a row — treat YTD sector % as directional, not precise.
- S&P futures direction itself was inconsistent across sources this morning (+0.2% vs -0.1%) — no clean read on broad market direction pre-open.

### Decision
HOLD — forced HOLD: Alpaca API is unreachable via the network proxy (403 on CONNECT tunnel to both trading and data endpoints), so account state cannot be verified and the Buy-Side Gate cannot be satisfied even if a trade idea were compelling. Separately, no trade idea today has a fully defined entry/stop/target with confirmed relative strength — this would be a watchlist-only day even with working API access. Patience > activity; flagging the API outage as the priority to resolve before the next session.
