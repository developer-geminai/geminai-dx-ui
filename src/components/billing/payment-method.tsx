"use client";
import { useState } from "react";
import { CreditCard, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n/client";
import type { BillingOverview } from "@/lib/api/types";
import { billingMsg } from "./messages";

export function PaymentMethodCard({ method }: { method: BillingOverview["paymentMethod"] }) {
  const m = billingMsg[useLang()];
  const [open, setOpen] = useState(false);
  if (!method) return <p className="text-sm text-muted">{m.paymentNone}</p>;
  const Icon = method.type === "card" ? CreditCard : Landmark;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-paper-alt text-muted">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm text-ink">{method.label}</p>
          {method.expires ? <p className="text-xs text-muted">{m.expires(method.expires)}</p> : null}
        </div>
        <Button variant="line" size="sm" onClick={() => setOpen(true)}>
          {m.change}
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">{m.paymentVia}</p>
      <Dialog open={open} onClose={() => setOpen(false)} title={m.changeTitle} description={m.changeBody} footer={<Button onClick={() => setOpen(false)}>OK</Button>} />
    </div>
  );
}
