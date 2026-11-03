"use client";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/client";
import { common } from "@/lib/i18n/common";

export default function OrgError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const m = common[useLang()];
  return (
    <ErrorState
      title={m.errorTitle}
      action={
        <Button variant="line" size="sm" onClick={reset}>
          {m.retry}
        </Button>
      }
    />
  );
}
