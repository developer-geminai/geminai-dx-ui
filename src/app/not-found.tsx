import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
      <Logo />
      <h1 className="mt-6 text-3xl font-semibold">Not found</h1>
      <p className="max-w-md text-muted">This page, organization, agent or case does not exist, or your operator account is not authorized to view it.</p>
      <Button asChild variant="line">
        <Link href="/">Back to the Control Center</Link>
      </Button>
    </div>
  );
}
