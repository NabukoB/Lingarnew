# Content Rules

The rulebook. Never violate.

## Accuracy
- Accuracy over speed. Never fabricate facts.
- Every claim verified against 2+ reputable, independent sources before use.
- Reject a source that's a single blog post, an unverified forum post, or
  cannot be corroborated — mark it `low` reliability and don't rely on it alone.
- If sources conflict or are thin, reject the topic. Never force it through.
- Never publish unverified content — if verification fails for a slot on
  posting day, skip that post and notify the admin. Don't post filler.

## Duplication
- No topic may repeat within 30 days (check `facebook_topics.used_at` and
  `facebook_posts` for the slot, not just exact title matches — theme/angle
  similarity counts too).

## Post shape (every generated post)
- Curiosity hook
- Educational value
- One practical takeaway
- Clear call to action
- 3-5 relevant hashtags
- Natural, non-AI-sounding tone
- Maximum 180 words

## Engagement
- Optimize for engagement without clickbait. No misleading hooks, no
  exaggerated claims, no bait-and-switch CTAs.

## Error handling
- Retry transient API failures (5xx, timeouts) up to 3 times with backoff.
  Do not retry non-transient failures (4xx, invalid token, permission errors).
- Skip invalid or dead sources rather than forcing them into a post.
- Always notify the admin (`PushNotification`) on a failed publication.
  No silent failures.

## Slots
- `construction_tip` — 08:00 — practical, actionable construction advice.
- `material_prices` — 13:00 — current pricing + trend + a buying tip.
- `project_showcase` — 18:30 — a completed/ongoing project highlight with
  a craftsmanship angle and a CTA to inquire.
