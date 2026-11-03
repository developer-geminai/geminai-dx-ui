"use client";
import { useState, useTransition } from "react";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ContractStatusBadge } from "@/components/status-badges";
import { useLang } from "@/lib/i18n/client";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import type { Contract } from "@/lib/api/types";
import { signContractAction } from "@/app/o/[org]/contracts/actions";
import { contractsMsg } from "./messages";
import { PdfButton } from "./pdf-preview";

export function ContractRow({ orgId, contract, canSign }: { orgId: string; contract: Contract; canSign: boolean }) {
  const lang = useLang();
  const m = contractsMsg[lang];
  const c = common[lang];
  const f = fmt(lang);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pending, start] = useTransition();

  return (
    <tr>
      <td>
        <p className="font-medium text-ink">{contract.title}</p>
        {contract.signedAt ? <p className="text-xs text-muted">{m.signedAt(f.dateLong(contract.signedAt))}</p> : null}
      </td>
      <td className="whitespace-nowrap text-muted">{c.contractType[contract.type]}</td>
      <td className="whitespace-nowrap font-mono text-xs text-muted">{contract.templateVersion}</td>
      <td>
        <ContractStatusBadge status={contract.status} />
      </td>
      <td className="tabular whitespace-nowrap text-muted">{f.date(contract.date)}</td>
      <td className="whitespace-nowrap text-muted">{contract.signer}</td>
      <td>
        <div className="flex justify-end gap-2">
          {contract.status === "pending_signature" ? (
            <Button size="sm" onClick={() => setOpen(true)} disabled={!canSign} title={canSign ? undefined : m.noPermission}>
              <PenLine aria-hidden />
              {m.sign}
            </Button>
          ) : null}
          <PdfButton
            title={contract.title}
            subtitle={contract.entityName}
            url={contract.pdfUrl}
            lines={[
              [m.colTemplate, contract.templateVersion],
              [m.colStatus, c.contractStatus[contract.status]],
              [m.colSigner, contract.signer],
            ]}
          />
        </div>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title={`${m.signTitle} · ${contract.title}`}
          description={m.signBody}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {c.actions.cancel}
              </Button>
              <Button
                disabled={!checked || pending}
                onClick={() =>
                  start(async () => {
                    const r = await signContractAction(orgId, contract.id);
                    if (r.ok) setOpen(false);
                  })
                }
              >
                <PenLine aria-hidden />
                {m.signConfirm}
              </Button>
            </>
          }
        >
          <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">{m.colDoc}</dt>
            <dd>{contract.entityName}</dd>
            <dt className="text-muted">{m.colTemplate}</dt>
            <dd className="font-mono text-xs">{contract.templateVersion}</dd>
            <dt className="text-muted">{m.colSigner}</dt>
            <dd>{contract.signer}</dd>
          </dl>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 accent-[rgb(var(--brand))]" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            {m.signCheck}
          </label>
        </Dialog>
      </td>
    </tr>
  );
}
