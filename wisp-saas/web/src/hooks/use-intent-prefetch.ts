"use client";

import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

/**
 * Prefetches a page's full data when the user shows intent (hover, focus or
 * touch), so the click renders immediately without a loading skeleton.
 * Links only prefetch the cheap loading shell by default.
 */
export function useIntentPrefetch() {
  const router = useRouter();
  const done = useRef(new Map<string, number>());
  const prefetch = useCallback(
    (href: string) => {
      const last = done.current.get(href) ?? 0;
      if (Date.now() - last < 25_000) return; // dynamic data stays fresh for 30s in the router cache
      done.current.set(href, Date.now());
      router.prefetch(href, { kind: PrefetchKind.FULL });
    },
    [router],
  );
  return useCallback(
    (href: string) => ({
      onPointerEnter: () => prefetch(href),
      onFocus: () => prefetch(href),
      onTouchStart: () => prefetch(href),
    }),
    [prefetch],
  );
}
