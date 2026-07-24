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

## 2026-07-24 — Pre-market Research

### Account
- **BLOCKED**: `scripts/alpaca.sh account/positions/orders` all failed — egress proxy returned 403 on CONNECT to `paper-api.alpaca.markets:443` ("gateway answered 403 to CONNECT (policy denial or upstream failure)", confirmed via `$HTTPS_PROXY/__agentproxy/status`). Not a credentials issue (API key/secret env vars are set); this session's network policy does not allow this host. Cannot read equity, cash, buying power, daytrade count, open positions, or open orders. Cannot verify existing stops or check any held position's P&L. User alerted via PushNotification.
- Equity/Cash/Buying power/Daytrade count: unknown (see above)

### Market Context
- WTI: ~$92.36/bbl (July 23 close, +6.37% d/d). Brent: ~$100.39, intraday range $99.59–$101.16, crossing above $100 for the first time in two months. [Fortune](https://fortune.com/article/price-of-oil-07-24-2026/), [Investing.com Brent](https://www.investing.com/commodities/brent-oil), [tradingeconomics.com](https://tradingeconomics.com/commodity/brent-crude-oil)
- Driver: Houthi rebels (Iran-aligned) struck two Saudi oil tankers (Encelia, Layla) in the Red Sea off Al Shuqaiq; fire reported onboard. Opens a second shipping choke point alongside the Strait of Hormuz. Brent rallied ~6.45% on the news, +~40% month-to-date. [CNN](https://www.cnn.com/2026/07/23/world/live-news/iran-war-trump), [Washington Post](https://www.washingtonpost.com/world/2026/07/23/least-one-saudi-oil-tanker-is-attacked-red-sea-war-risks-widen/), [Bloomberg](https://www.bloomberg.com/news/articles/2026-07-23/how-houthis-red-sea-attacks-worsen-oil-shock), [The National](https://www.thenationalnews.com/business/energy/2026/07/23/oil-hits-100-for-the-first-time-since-may-after-houthi-attacks-on-saudi-ships-in-red-sea/)
- S&P 500 futures: +0.11–0.2% premarket, tentative bounce attempt after Thursday's -1.21% close (S&P 500 to 7,408.30). Dow futures +~0.5%, Nasdaq-100 futures +0.1%. Polymarket implied 66% odds of a higher open. [Yahoo Finance](https://finance.yahoo.com/markets/live/stock-market-today-friday-july-24-dow-sp-500-nasdaq-081854465.html), [Benzinga](https://www.benzinga.com/markets/prediction-markets/26/07/60660768/sp500-july-24-open-up-or-down-polymarket-oil-prices-alphabet-tesla-earnings-ai-spending), [Bloomberg](https://www.bloomberg.com/news/articles/2026-07-23/stock-market-today-dow-s-p-live-updates)
- VIX: closed 18.70 on July 23 (+12.38% d/d, prior close 16.64) — fear gauge waking up. [Investing.com](https://www.investing.com/indices/volatility-s-p-500), [Yahoo Finance](https://finance.yahoo.com/quote/%5EVIX/)
- Today's catalysts: (1) Red Sea/Middle East oil shock above — new inflation-risk overhang; (2) "Magnificent Seven" shed ~$800B in market cap Thursday on AI-capex jitters sparked by Alphabet's and Tesla's ballooning AI spending; (3) new Trump tariffs took effect, adding to the risk-off tone; (4) elevated bond yields compounding the pressure. [CNBC](https://www.cnbc.com/2026/07/22/stock-market-today-live-updates.html), [Yahoo Finance](https://finance.yahoo.com/markets/live/stock-market-today-friday-july-24-dow-sp-500-nasdaq-081854465.html)
- Earnings before open: AXP (American Express), VZ (Verizon, call 8:30am ET), NEE, CHTR, SLB, LW, CNI, BAH, HCA, GNTX, FLG, THC, SXT, SBSI, LBTYA, FHB, EAF, CPF — 57 companies reporting before the open total. [Earnings Whispers](https://www.earningswhispers.com/calendar/20260724/3), [Yahoo Finance](https://finance.yahoo.com/markets/stocks/articles/american-express-verizon-come-earnings-121523885.html)
- Economic calendar: light — Import/Export price index 8:30am ET, Michigan Consumer Sentiment (final) 10am ET. CPI/PPI/jobless claims already released earlier this week; next FOMC meeting July 28–29 (not today). [Kiplinger](https://www.kiplinger.com/investing/economy/this-weeks-economic-calendar), [tradingeconomics.com](https://tradingeconomics.com/united-states/calendar)
- Sector momentum (2026 YTD): Tech (XLK) leads, ~+27–35% depending on source; Capital Goods +32%; Energy (XLE) +22%; Transportation +19%; Healthcare emerging as a flight-to-safety outperformer (+11.6% YTD) as volatility rises; Utilities +12.7%. Laggards: Services -3%, Consumer Discretionary ~flat. [Investing.com](https://www.investing.com/analysis/sector-rotation-a-guide-to-the-sp-500-momentum-status-200675903), [FT Portfolios](https://www.ftportfolios.com/blogs/MarketBlog/2026/3/10/top-performing-sp-500-index-subsectors-ytd-thru-36), [S&P Dow Jones Indices dashboard](https://www.spglobal.com/spdji/en/documents/performance-reports/dashboard-us-sector.pdf)
- Held-ticker news: unable to check — positions list unavailable (see Account section above).

### Trade Ideas
1. Energy (XLE, or majors like XOM/CVX/SLB) — catalyst: Red Sea escalation + Brent >$100 is a live, real-time momentum + macro tailwind (sector already YTD momentum leader). Caution: entering a geopolitical spike chases a headline — no defined entry/stop yet, needs a pullback/consolidation level before qualifying under the entry checklist. Watchlist only.
2. Healthcare (XLV or defensive large caps) — catalyst: rotation into defensives as VIX rises and Mag7/AI-capex names sell off; healthcare already showing flight-to-safety outperformance YTD. No specific entry/stop defined — watchlist only.
3. Avoid new tech/Mag7 entries — thesis risk: AI-capex jitters (Alphabet/Tesla spending concerns) actively unwinding a crowded trade; VIX +12% and rising is not an entry signal.

### Risk Factors
- **Account/position data unavailable** — cannot confirm no held position has breached the -7% stop-loss rule or that GTC trailing stops are intact. This is the top risk today: the bot is flying blind on any existing book until the network policy blocking `paper-api.alpaca.markets` is fixed.
- Active Middle East escalation (Red Sea tanker strikes, Houthi/Iran-linked) — a second shipping choke point beyond the Strait of Hormuz; risk of further escalation and oil spikes intraday.
- VIX +12% overnight — regime shift toward higher volatility, wider stops needed, false-breakout risk elevated.
- AI-capex sentiment break (Alphabet/Tesla) is actively repricing the Mag7 complex — spillover risk to broader tech/Nasdaq-100.
- New Trump tariffs in effect — added trade-policy uncertainty on top of the above.
- 57 earnings prints before the open — elevated single-name gap risk sector-wide.
- No fetch of held-ticker-specific news was possible (see Account section) — a real, currently-unknown risk if any position is open.

### Decision
HOLD — mandatory regardless of setup quality: with account/positions/orders API blocked, no buy-side gate check (position count, cash, equity %) can be verified, and no order could be placed or protected with a stop even if a thesis cleared the checklist. Today is also a high-volatility, event-driven tape (Red Sea escalation, VIX +12%, Mag7 unwind, 57 earnings prints) — not a day to force activity even once connectivity is restored. Priority: get the network policy fixed so positions/stops can be verified.
