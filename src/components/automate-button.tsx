"use client";
import { useState, useTransition } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/client";
import { common } from "@/lib/i18n/common";
import { createServiceRequestAction } from "@/app/actions";

const sent = { es: "Solicitud enviada", en: "Request sent" };

/** "Quiero automatizar esto": creates a service request that lands as an opportunity in the CRM. */
export function AutomateButton({ orgId, opportunityId, workflow, requested, size = "md", variant = "solid" }: { orgId: string; opportunityId: string; workflow: string; requested?: boolean; size?: ButtonProps["size"]; variant?: ButtonProps["variant"] }) {
  const lang = useLang();
  const [done, setDone] = useState(Boolean(requested));
  const [pending, start] = useTransition();
  if (done) {
    return (
      <Button size={size} variant="soft" disabled>
        <Check aria-hidden />
        {sent[lang]}
      </Button>
    );
  }
  return (
    <Button
      size={size}
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await createServiceRequestAction(orgId, { kind: "automate_opportunity", opportunityId, note: workflow });
          if (r.ok) setDone(true);
        })
      }
    >
      <Sparkles aria-hidden />
      {common[lang].actions.wantToAutomate}
    </Button>
  );
}
