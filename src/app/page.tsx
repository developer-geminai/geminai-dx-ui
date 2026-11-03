import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/server/session";
import { orgPath } from "@/lib/utils";
import { ErrorState } from "@/components/ui/states";

export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await requireViewer();
  const first = viewer.organizations[0];
  if (!first) {
    return (
      <div className="mx-auto max-w-lg p-10">
        <ErrorState title="Sin organización" detail="Tu usuario no pertenece a ninguna organización. / Your user has no organization." />
      </div>
    );
  }
  redirect(orgPath(first.id));
}
