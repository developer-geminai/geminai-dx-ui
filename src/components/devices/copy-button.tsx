"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/client";
import { devMsg } from "./messages";

/** Copies `value` (relative paths are resolved against the current origin). */
export function CopyButton({ value, absolute = false }: { value: string; absolute?: boolean }) {
  const m = devMsg[useLang()].download;
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="line"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(absolute ? new URL(value, window.location.origin).toString() : value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
      {done ? m.copied : m.copy}
    </Button>
  );
}
