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

## 2026-07-23 — Pre-market Research

### Account
- **UNAVAILABLE** — `scripts/alpaca.sh account|positions|orders` all failed: proxy CONNECT tunnel to `paper-api.alpaca.markets` returned 403 (org egress policy block, per `/root/.ccr/README.md` §"403/407 from the proxy" — not an Alpaca credentials issue). Not retried per proxy guidance. Last known state: Day 0 baseline, $10,000, no positions, no orders (memory/TRADE-LOG.md unchanged since 2026-07-07). User notified via push.
- Note: RESEARCH-LOG has only one prior entry (2026-07-07) despite 16 calendar days elapsed — scheduled runs appear to have been inactive or silent-HOLD without logging in between; flagging for review, not resolving here.

### Market Context
- WTI ~$90.14/bbl (+3.8%, highest since June 8); Brent ~$98.44-98.49/bbl (+4-4.6%) — active war premium, not a supply/demand move. [CNBC](https://www.cnbc.com/2026/07/23/oil-prices-today-wti-brent-trump-iran-hormuz.html), [Fortune](https://fortune.com/article/price-of-oil-07-23-2026/)
- S&P 500 futures: ~7,541 (range 7,504.75–7,554), slightly lower premarket on rising yields (10yr ~4.63%, 2-month high) and energy jitters; surprise crude inventory build (+2.6M bbl) despite the war. [Yahoo Finance](https://finance.yahoo.com/markets/stocks/articles/us-stock-market-today-p-081301441.html)
- VIX: most recent print 18.65 (close 7/21) — elevated vs. 2026 Day-0 baseline (~15.9) but not panic-level. [Yahoo Finance](https://finance.yahoo.com/quote/%5EVIX/)
- **Major catalyst — active US-Iran military conflict**: 12th consecutive night of US strikes on Iran; Iran retaliating against Kuwait/Jordan targets and striking tankers in the Strait of Hormuz (IRGC-claimed tanker explosion near Oman route today). Trump threatens to destroy a bridge/power plant per ship targeted; Iran threatens regional energy infrastructure in response. Iran also separately signaling openness to talks. [Al Jazeera](https://www.aljazeera.com/news/2026/7/23/iran-houthis-strike-tankers-as-us-bombing-continues-whats-the-latest), [CNBC](https://www.cnbc.com/2026/07/23/oil-prices-today-wti-brent-trump-iran-hormuz.html), [Wikipedia: 2026 Strait of Hormuz crisis](https://en.wikipedia.org/wiki/2026_Strait_of_Hormuz_crisis)
- Other catalysts: AI/semiconductor strength in Asia (Samsung, SK Hynix +3%+) on AI capex flows; heavy Big Tech earnings week (GOOGL, INTC, IBM, TSLA later this week). [Bloomberg](https://www.bloomberg.com/news/articles/2026-07-22/stock-market-today-dow-s-p-live-updates)
- Earnings before open today: RTX, T-Mobile, Thermo Fisher, Union Pacific, Blackstone, Lockheed Martin, Freeport-McMoRan, Comcast, Honeywell, Intel, SAP, Newmont — 166 reports scheduled total today. [Earnings Whispers](https://www.earningswhispers.com/calendar/20260723/1)
- Economic calendar: no CPI/PPI/jobs report today (next CPI 8/12); FOMC meeting is next week (7/28-29, decision 7/29 2pm ET) — not today. ECB rate decision today. Fed H.4.1/H.8/H.10 routine releases only. [Federal Reserve](https://www.federalreserve.gov/newsevents/2026-july.htm)
- Sector momentum (2026 YTD): Technology leads (+27.5% to +34.7% depending on source), Capital Goods +32.4%, Energy +22.4% (now getting a war-driven tailwind), Transportation +18.5%, Utilities +12.7%. Laggards: Services -3.1%, Consumer Discretionary +0.75%, Retail +5.15%. Large-cap value (+15.5%) far outpacing large-cap growth (+2.1%) — broadening rotation out of mega-cap concentration. [Clark.com](https://clark.com/personal-finance-credit/investing-retirement/the-best-investments-so-far-through-june-2026/), [FT Portfolios](https://www.ftportfolios.com/blogs/MarketBlog/2026/3/10/top-performing-sp-500-index-subsectors-ytd-thru-36)
- No confirmed held positions per last known state — no ticker-specific news pulled.

### Trade Ideas (documented, not executed — see Decision)
1. Energy majors/XLE (e.g. XOM, CVX) — catalyst: active Hormuz conflict + tanker strikes pushing Brent/WTI sharply higher, sector already YTD momentum leader (+22%); risk: war premium can reverse violently on any de-escalation/talks headline (Iran signaling openness to talks same day) — NOT an entry until war trajectory and account state are both clear.
2. Defense primes (LMT, RTX both reporting today) — catalyst: active US military campaign + earnings today could beat/raise guidance on demand outlook; need to see actual earnings prints and price reaction before entry — watchlist only.
3. Broad tech/value rotation (per sector momentum data) — capital goods and value broadening out beyond mega-cap growth; no single-ticker catalyst identified yet, needs a defined breakout name before it clears the entry checklist.

### Risk Factors
- **Live shooting war** (US-Iran, Strait of Hormuz) — major geopolitical event, oil up 4%+ intraday, headline risk both directions (escalation vs. talks) within hours.
- Elevated VIX (18.65) and rising 10yr yield (4.63%, 2-month high) — risk-off pressure independent of the war.
- **Cannot verify account equity, cash, buying power, existing positions, or open orders** — Alpaca API blocked by proxy egress policy (403). No order should be placed today regardless of thesis quality until this is resolved and confirmed working.
- Gap in RESEARCH-LOG since 2026-07-07 — no continuity on whether trades were placed/closed in the interim; TRADE-LOG.md shows none, but that file may itself be stale.
- Heavy earnings day (166 reports) — elevated single-name volatility risk even for uninvolved sectors.

### Decision
HOLD — hard blocker: Alpaca API unreachable (proxy 403), so no trade can be verified or placed regardless of market read. Even setting that aside, today's setup (active war, earnings-heavy, elevated yields/VIX) argues for watching, not entering. Re-run account pull once API access is confirmed restored.
