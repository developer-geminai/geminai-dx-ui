"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CircleCheck, PartyPopper } from "lucide-react";
import type { BlockRule, Contract, Device, OnboardingState, OnboardingStepKey, OrgEntity, Organization } from "@/lib/api/types";
import { ONBOARDING_STEPS } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/client";
import { cn, orgPath } from "@/lib/utils";
import { completeStepAction } from "@/app/o/[org]/onboarding/actions";
import type { TrackerDownload } from "@/components/devices/download-card";
import { obMsg } from "./messages";
import { AccountStep, CompanyStep, ContractsStep, DevicesStep, PrivacyStep } from "./steps";

export interface WizardProps {
  orgId: string;
  phase: Organization["phase"];
  retention: Organization["retention"];
  state: OnboardingState;
  entities: OrgEntity[];
  contracts: Contract[];
  rules: BlockRule[];
  devices: Device[];
  download: TrackerDownload;
  user: { name: string; email: string };
  canEdit: boolean;
  canSign: boolean;
  canPrivacy: boolean;
}

export function OnboardingWizard(props: WizardProps) {
  const lang = useLang();
  const m = obMsg[lang];
  const router = useRouter();
  const { state, orgId } = props;
  const [step, setStep] = useState<OnboardingStepKey>(state.current);
  const [pending, start] = useTransition();
  const idx = ONBOARDING_STEPS.indexOf(step);
  const allDone = state.completed.done;

  // Follow the server state when a step completes.
  const serverCurrent = state.current;
  useEffect(() => setStep(serverCurrent), [serverCurrent]);

  const reachable = (s: OnboardingStepKey) => state.completed[s] || s === state.current || allDone;
  const complete = (s: OnboardingStepKey) =>
    start(async () => {
      const r = await completeStepAction(orgId, s);
      if (r.ok) router.refresh();
    });
  const goNext = () => setStep(ONBOARDING_STEPS[Math.min(idx + 1, ONBOARDING_STEPS.length - 1)]!);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label={m.eyebrow} className="lg:sticky lg:top-20 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
          {ONBOARDING_STEPS.map((s, i) => {
            const done = state.completed[s];
            const current = s === step;
            const can = reachable(s);
            return (
              <li key={s} className="shrink-0">
                <button
                  type="button"
                  disabled={!can}
                  onClick={() => setStep(s)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors disabled:cursor-not-allowed",
                    current ? "bg-surface shadow-card ring-1 ring-line" : can ? "hover:bg-surface/70" : "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "tabular flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      done ? "border-brand bg-brand text-brand-on" : current ? "border-brand text-brand-ink" : "border-line text-muted",
                    )}
                  >
                    {done ? <Check className="size-3.5" aria-label={m.completed} /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-sm font-medium text-ink">{m.steps[s].title}</span>
                    <span className="hidden text-xs text-muted lg:block">{m.steps[s].hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 hidden px-3 text-xs text-faint lg:block">{m.noPayment}</p>
      </nav>

      <section className="min-w-0 rounded-lg border border-line bg-surface">
        <header className="border-b border-line px-6 py-5">
          <p className="label-mono">{m.stepOf(idx + 1, ONBOARDING_STEPS.length)}</p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-medium">
            {m.steps[step].title}
            {state.completed[step] && step !== "done" ? <CircleCheck className="size-5 text-brand" aria-label={m.completed} /> : null}
          </h2>
          <p className="text-sm text-muted">{m.steps[step].hint}</p>
        </header>
        <div className="px-6 py-6">
          {step === "account" ? (
            <AccountStep user={props.user} done={state.completed.account} canEdit={props.canEdit} pending={pending} onContinue={() => (state.completed.account ? goNext() : complete("account"))} />
          ) : step === "company" ? (
            <CompanyStep orgId={orgId} company={state.company} entities={props.entities} canEdit={props.canEdit} onSaved={() => router.refresh()} done={state.completed.company} onNext={goNext} />
          ) : step === "contracts" ? (
            <ContractsStep company={state.company} contracts={props.contracts} done={state.completed.contracts} canSign={props.canSign} pending={pending} onSign={() => complete("contracts")} onNext={goNext} />
          ) : step === "privacy" ? (
            <PrivacyStep orgId={orgId} rules={props.rules} retention={props.retention} done={state.completed.privacy} canEdit={props.canPrivacy} onSaved={() => router.refresh()} onNext={goNext} />
          ) : step === "devices" ? (
            <DevicesStep devices={props.devices} download={props.download} done={state.completed.devices} canEdit={props.canEdit} pending={pending} onContinue={() => (state.completed.devices ? goNext() : complete("devices"))} />
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                <PartyPopper className="size-7" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-2xl font-medium">{allDone ? m.done.already : m.done.title}</h3>
              <p className="mt-2 max-w-md text-muted">{allDone ? m.done.alreadyBody : m.done.body}</p>
              <div className="mt-6">
                {allDone ? (
                  <Button asChild>
                    <Link href={orgPath(orgId, "diagnostic")}>{m.done.goDiagnostic}</Link>
                  </Button>
                ) : (
                  <Button
                    disabled={pending || !props.canEdit}
                    onClick={() =>
                      start(async () => {
                        const r = await completeStepAction(orgId, "done");
                        if (r.ok) router.push(orgPath(orgId, "diagnostic"));
                      })
                    }
                  >
                    {m.done.cta}
                  </Button>
                )}
              </div>
              {!props.canEdit && !allDone ? <p className="mt-3 text-xs text-muted">{m.readOnly}</p> : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

