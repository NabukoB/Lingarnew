import * as React from "react";
import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";

/** Big full-width portal button in the WISP's brand colour. */
export const primaryButtonClass = buttonVariants({ variant: "brand", size: "xl" });

export function PrimaryButton(props: ButtonProps) {
  return <Button variant="brand" size="xl" {...props} />;
}
