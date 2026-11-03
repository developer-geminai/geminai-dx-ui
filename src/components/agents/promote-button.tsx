"use client";
import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n/client";
import { common } from "@/lib/i18n/common";
import { promoteAgentAction } from "@/app/o/[org]/agents/actions";
import { agentsMsg } from "./messages";

export function PromoteButton({ orgId, agentId, agentName, disabled }: { orgId: string; agentId: string; agentName: string; disabled?: boolean }) {
  const lang = useLang();
  const m = agentsMsg[lang];
  const c = common[lang];
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button disabled={disabled} onClick={() => setOpen(true)}>
        <ShieldCheck aria-hidden />
        {m.shadow.promote}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`${m.promoteTitle} · ${agentName}`}
        description={m.shadow.promoteConfirm}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {c.actions.cancel}
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await promoteAgentAction(orgId, agentId);
                  if (r.ok) setOpen(false);
                })
              }
            >
              <ShieldCheck aria-hidden />
              {c.actions.confirm}
            </Button>
          </>
        }
      />
    </>
  );
}
