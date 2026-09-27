"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "./drawer";

/**
 * One modal for the whole app: a centred dialog on desktop, a swipeable
 * bottom sheet on phones (the dashboard's phone layout, CLAUDE.md §14).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  hideTitle = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Keep the title for screen readers only (content has its own heading). */
  hideTitle?: boolean;
  children: React.ReactNode;
}) {
  const desktop = useMediaQuery("(min-width: 640px)", true);
  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={description ? undefined : undefined}>
          <DialogHeader className={hideTitle ? "sr-only" : undefined}>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <DialogDescription className={description ? "" : "sr-only"}>{description ?? title}</DialogDescription>
          {children}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className={hideTitle ? "sr-only" : undefined}>{title}</DrawerTitle>
        <DrawerDescription className={description ? "" : "sr-only"}>{description ?? title}</DrawerDescription>
        {children}
      </DrawerContent>
    </Drawer>
  );
}
