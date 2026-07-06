# Project Context

## Overview

- **What:** Autonomous AI trading bot.
- **Starting capital:** ~$100,000 paper (Alpaca default paper account).
- **Platform:** Alpaca — paper endpoint until `LIVE_TRADING_CONFIRMED=true` is
  explicitly set.
- **Strategy:** Swing trading US stocks. No options.
- **Origin:** Rules and structure adopted from Nate Herk's "Opus 4.7 Trading
  Bot Setup Guide" (2026-04) — a documented 30-day live-trading refinement of
  the same architecture we run here.

## Architecture (see `tradingAgent/CLAUDE.md` for the routine playbook)

- No server, no daemon. Claude Code sessions ARE the bot.
- Five scheduled routines per weekday (pre-market, market-open, midday, EOD
  summary, Friday weekly review) each fire a fresh session.
- Memory lives in these markdown files, committed to git — this file, the
  strategy, and the append-only logs. Sessions read → work → write → commit +
  push. Anything not committed is lost.
- Alpaca is the source of truth for money, positions, orders. Memory is
  documentation of what happened, not the state itself.

## Rules

- API keys are set as environment variables in the Claude Code Remote
  environment settings. **Never** commit an `.env` file. If a routine sees a
  key missing, it stops and pushes a notification — it does not create an
  `.env` as a workaround.
- Every trade must have a documented thesis in `RESEARCH-LOG.md` before it's
  placed.
- Safety rails are enforced in `scripts/alpaca.mjs` itself (paper guard,
  kill switch, position size cap, open positions cap, trades-per-week cap,
  daily loss circuit breaker, PDT guard). If the script refuses, respect the
  refusal — don't route around it.
