"use client";
import { useState, useTransition } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label, Textarea } from "@/components/ui/form";
import { useLang } from "@/lib/i18n/client";
import { common } from "@/lib/i18n/common";
import { pauseAgentAction, resumeAgentAction } from "@/app/actions";

/** "Pausar" always visible on an agent: asks for a reason and confirms. Resumes to the previous mode. */
export function PauseAgentButton({ orgId, agentId, agentName, paused, disabled, size = "md" }: { orgId: string; agentId: string; agentName: string; paused: boolean; disabled?: boolean; size?: "sm" | "md" }) {
  const m = common[useLang()];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  if (paused) {
    return (
      <Button variant="solid" size={size} disabled={disabled || pending} onClick={() => start(async () => void (await resumeAgentAction(orgId, agentId)))}>
        <Play aria-hidden />
        {m.pause.resume}
      </Button>
    );
  }
  return (
    <>
      <Button variant="danger" size={size} disabled={disabled} onClick={() => setOpen(true)}>
        <Pause aria-hidden />
        {m.actions.pause}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`${m.pause.title} · ${agentName}`}
        description={m.pause.description}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {m.actions.cancel}
            </Button>
            <Button
              variant="danger"
              disabled={!reason.trim() || pending}
              onClick={() =>
                start(async () => {
                  const r = await pauseAgentAction(orgId, agentId, reason);
                  if (r.ok) {
                    setOpen(false);
                    setReason("");
                  }
                })
              }
            >
              <Pause aria-hidden />
              {m.pause.confirm}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`pause-${agentId}`}>{m.pause.reason}</Label>
          <Textarea id={`pause-${agentId}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={m.pause.reasonPlaceholder} autoFocus />
        </div>
      </Dialog>
    </>
  );
}
