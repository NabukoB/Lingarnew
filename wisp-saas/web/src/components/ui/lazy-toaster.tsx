"use client";

import dynamic from "next/dynamic";

/** The toast host loads after hydration; toast() calls queue until it mounts. */
export const LazyToaster = dynamic(() => import("./sonner").then((m) => m.Toaster), { ssr: false });
