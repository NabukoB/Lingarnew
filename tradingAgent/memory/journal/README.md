# Journal

One file per trading day: `YYYY-MM-DD.md`. Each routine that runs that day
appends its own section (create the file if you're the first routine to run
that day):

```markdown
## Pre-Market Research
...

## Market-Open Execution
...

## Midday Scan
...

## End-of-Day Summary
...

## Weekly Review
...
```

Not every section appears every day (e.g. Weekly Review only on Fridays; a
routine that finds the market closed just notes that and stops).
