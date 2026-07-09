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

## 2026-07-09 — Pre-market Research (run inline during market-open)

### Account
- Equity: $99,981.61 (paper; treating $10,000 as usable capital per strategy)
- Cash: $99,608.05
- Buying power: $399,478.17
- Daytrade count: 0
- Positions: MSFT x1 @ $391.94 (unrealized -4.69%), 10% trailing stop GTC live (stop $355.12)
- Note: this MSFT buy filled 2026-07-07 but was never appended to TRADE-LOG.md — backfilling now (see log). Counts as 1 of 3 trades this week.

### Market Context
- WTI ~$74.49/bbl (+1.32%), Brent ~$79.10-79.25/bbl (+1.38%) — spiking on Middle East escalation. [TheStreet](https://www.thestreet.com/stock-market-today/stock-market-today-dow-jones-sp-500-nasdaq-updates-july-9-2026), [Fortune](https://fortune.com/article/price-of-oil-07-09-2026/)
- S&P 500 futures: choppy/conflicting signals — one source -0.8% on yields/inflation jitters, another +0.2%; Polymarket implied 85% odds of a higher open despite the noise. [Yahoo Finance](https://finance.yahoo.com/markets/stocks/articles/us-stock-market-today-p-081539361.html), [Benzinga](https://www.benzinga.com/markets/prediction-markets/26/07/60350218/sp500-july-9-open-up-or-down-polymarket-iran-oil-fed-minutes)
- VIX: 16.90, +4.77% — rising fear gauge, not yet extreme. [Yahoo Finance](https://finance.yahoo.com/quote/%5EVIX/)
- Today's catalysts: US launched new airstrikes on Iran overnight; Iran retaliated against Gulf targets. Trump said at NATO summit the ceasefire is over and US would "very probably" strike again. Active war-risk headline day. [Bloomberg](https://www.bloomberg.com/news/articles/2026-07-08/stock-market-today-dow-s-p-live-updates), [Yahoo Finance](https://finance.yahoo.com/markets/live/stock-market-today-thursday-july-9-us-strikes-iran-223149196.html)
- Earnings before open: none of note found for held/watchlist names.
- Economic calendar: 10yr Treasury yield ~4.58% (4-week high); 1yr inflation expectations ~3.7% — bond market pricing in inflation/rate risk alongside the war headlines.
- MSFT-specific (held position): stock hit a 1-year low, premarket ~$379.23 (-1.07%), down 21% YTD. Negative company catalyst: Xbox division restructuring, ~3,200 job cuts planned FY2027, divesting/spinning off studios. Long-term analyst consensus still Strong Buy (avg PT ~$589-592) but near-term momentum and news flow are negative. [Motley Fool](https://www.fool.com/investing/2026/07/09/microsoft-hit-year-low-why-regret-load-stock/), [Motley Fool](https://www.fool.com/investing/2026/07/08/massive-news-for-microsoft-stock-investors/)
- Sector momentum: not re-surveyed today — no new entries being considered given the risk backdrop (see Decision).

### Trade Ideas
None cleared the full entry checklist today. War-driven volatility (new Iran airstrikes, VIX +4.8%, oil spiking) plus a held position (MSFT) hitting fresh lows on negative company news is not a setup for adding risk.

### Risk Factors
- Active US-Iran military escalation — headline risk, gap risk, wide-spread risk all elevated intraday.
- MSFT unrealized loss -4.69%, approaching but not yet at the -7% manual cut level; fresh negative company catalyst (Xbox layoffs/restructuring) plus a 1-year-low print. Watching closely; trailing stop already live at $355.12.
- Rising 10yr yield (4.58%, 4-week high) and inflation expectations (3.7%) add macro headwind.
- Weekly trade count already at 1 (MSFT, 07-07); only 2 more available this week under the 3-trade cap.

### Decision
HOLD — no new buys today. Geopolitical shock (active war escalation) plus a held position under pressure means no edge clears the checklist. Patience > activity.
