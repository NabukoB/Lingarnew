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

## 2026-07-28 — Pre-market Research

### Account
- **UNAVAILABLE THIS RUN** — Alpaca API calls (`account`, `positions`, `orders`) all failed: `curl: (56) CONNECT tunnel failed, response 403` against `paper-api.alpaca.markets`. This session's egress proxy is blocking the Alpaca host outright (not a missing-key issue; keys verified present). Reported to admin via PushNotification. Do not fabricate figures — last confirmed state remains the 2026-07-07 baseline (equity ~$10,000 usable capital, no open positions, no trade-log entries since).
- Positions/orders: unknown this cycle — could not verify any existing holdings are within stop/risk limits. Flagged as a risk factor below.

### Market Context
- WTI: ~$80.11/bbl (Sept. delivery), down ~3% intraday. Brent: $86.58/bbl, down 1.54%. Move driven by a holding US–Iran fighting pause easing Middle East supply-risk premium. [CNBC](https://www.cnbc.com/2026/07/28/oil-price-today-wti-brent-us-iran-hormuz.html), [tradingeconomics.com](https://tradingeconomics.com/commodity/brent-crude-oil)
- S&P 500 futures: mixed/choppy — up ~0.9% early, pared to roughly flat/-0.1% later in premarket as semiconductor weakness deepened (Micron -4%, Nvidia -1.2%, Intel/AMD -3%+ premarket). Nasdaq futures underperforming S&P. 10-yr yield ~4.64%; PMI readings 53-54 (still expansionary). [Bloomberg](https://www.bloomberg.com/news/articles/2026-07-27/stock-market-today-dow-s-p-live-updates?srnd=homepage-asia), [CNBC](https://www.cnbc.com/2026/07/27/stock-market-today-live-updates.html), [Yahoo Finance](https://finance.yahoo.com/markets/live/stock-market-today-tuesday-july-28-dow-sp-500-nasdaq-082832371.html)
- VIX: 18.67 (last close, 7/27) — calm-to-moderate, up from ~15.9 on 7/7; consistent with sector reallocation rather than broad flight-to-safety. [Yahoo Finance](https://finance.yahoo.com/quote/%5EVIX/history/)
- Today's catalysts: Deepening semiconductor selloff (AI-capex/financing-circularity worries) — Nvidia reportedly discussing ~$250B of financing guarantees tied to an OpenAI data-center project; TSMC raised 2026 capex guidance to $64B, spooking margin/ROI assumptions. Oil's retreat toward high-$80s is easing inflation anxiety ahead of tomorrow's Fed decision. [Yahoo Finance](https://finance.yahoo.com/markets/live/stock-market-today-tuesday-july-28-dow-sp-500-nasdaq-082832371.html), [Tickmill](https://www.tickmill.com/blog/daily-market-outlook-july-28-2026)
- Earnings before open: no confirmed major US pre-market reporters found for 7/28 specifically (176 companies report today per Earnings Whispers, but a before-open marquee list wasn't surfaced). Major names (SK Hynix, Visa, Coca-Cola, Boeing, UPS, Ford) report tomorrow, 7/29. [Earnings Whispers](https://www.earningswhispers.com/calendar/20260728/1), [FX Leaders](https://www.fxleaders.com/news/2026/07/27/forex-signals-brief-july-28-skhy-visa-coca-cola-boeing-ups-and-ford-earnings-preview-wednesday/)
- Economic calendar: Consumer Confidence, Richmond Fed Manufacturing Survey (10:00 ET), Dallas Fed Texas Retail Outlook (10:30 ET) today. **FOMC meeting is today/tomorrow (7/28-7/29)** — policy statement + Chair Warsh press conference tomorrow, 7/29. CME FedWatch: 64.2% probability of a hold (down from 87.2% a week ago) — rate-path uncertainty rising. [tradingeconomics.com](https://tradingeconomics.com/united-states/calendar), [Kiplinger](https://www.kiplinger.com/investing/economy/this-weeks-economic-calendar)
- Sector momentum (2026 YTD, via deep research): Energy (XLE) and Technology (XLK) led H1 (roughly +20-35% YTD depending on source — wide disagreement, treat as directional only), Industrials (XLI) ~+20%. Laggards: Consumer Discretionary (~-5.6%), Communication Services (~-6.1%), Financials ~flat. **Recent rotation (last 1-2 weeks): clear shift OUT of tech/semis INTO healthcare, financials, and energy** — 7/27 saw XLK -1.44%, SOXX -5.1% in a session, vs. XLV +0.7%, XLF +0.86%, XLE +0.4%. [interactivecrypto.com](https://www.interactivecrypto.com/spy-edges-higher-amid-tech-selloff-and-sector-rotation-toward-healthcare-and-financials-jul-2026), [intellectia.ai](https://intellectia.ai/blog/ai-trade-cracks-chip-stocks-july-2026), [etftrends.com](https://www.etftrends.com/sector-investing-content-hub/top-performing-sector-spdrs-xlk-xle-xli-top-the-list/)
- No confirmed held positions to review (per last known state) — no ticker-specific news pulled.

### Trade Ideas (documented, not executed — see Decision)
1. Healthcare (XLV) / Financials (XLF) — catalyst: active rotation destination as capital exits crowded tech/semis; no specific ticker, entry, or stop defined yet — watchlist only until a pullback + relative-strength confirmation appears.
2. Avoid semiconductors/AI-capex names (SMH, NVDA, MU, INTC, AMD) — thesis broken: AI-financing circularity concerns + TSMC capex/margin worries are driving an active, ongoing selloff. Not a long candidate today.
3. Energy (XLE) — momentum leader YTD, but today's oil-price move (WTI/Brent both down on Iran de-escalation) conflicts with the "oil near $100 supporting energy" rotation narrative from secondary sources — data is contradictory, do not treat as a clean long until reconciled with a live quote.

### Risk Factors
- **Alpaca API unreachable this run** (proxy 403 on `paper-api.alpaca.markets`) — cannot confirm current equity, cash, buying power, daytrade count, open positions, or open orders. Any existing position's stop-loss/trailing-stop coverage could not be verified this cycle. PushNotification sent; retry account pull next session.
- FOMC decision tomorrow (7/29) — meaningful rate-path uncertainty (hold probability dropped from 87% to 64% in a week); high event risk argues against new entries into the event.
- Sector YTD % figures disagree sharply across sources (e.g., XLE cited anywhere from +3.6% to +52% YTD) — directional signal only, not precise.
- Oil-price catalyst is internally inconsistent (falling per direct quote vs. "near $100" per rotation commentary) — needs reconciliation.
- Ongoing semiconductor/AI-financing unwind could spill into broader Nasdaq-100/tech if it doesn't stabilize.

### Decision
HOLD — no live account/position data to evaluate against the buy-side gate (data outage, not a market call), and FOMC event risk lands tomorrow regardless. Patience > activity; retry the account/positions pull as soon as connectivity is restored.
