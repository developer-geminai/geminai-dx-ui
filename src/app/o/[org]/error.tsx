"use client";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

export default function OrgError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="This page could not be displayed"
      detail="An unexpected error occurred while rendering. No data was changed. Details are in the Control Center server log."
      action={
        <Button variant="line" size="sm" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
