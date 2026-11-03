import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import { orgPath } from "@/lib/utils";
import { ErrorState } from "@/components/ui/states";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await requireSession();
  const first = session.organizations[0];
  if (!first) {
    return (
      <div className="mx-auto max-w-lg p-10">
        <ErrorState title="No organization assigned" detail="Your operator account has no organization grants. Ask an administrator to update the Control Center configuration." />
      </div>
    );
  }
  redirect(orgPath(first.id));
}
