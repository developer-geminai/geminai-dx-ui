import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official GeminAI Dx mark (two-pill logo from geminaidx.com/logo/logo.png) and wordmark,
 * reproduced as on the site: "Gemin" + "AI" in brand teal + a small "Dx".
 */
export function Logo({ className, product = true, onDark = false }: { className?: string; product?: boolean; onDark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image src="/brand/logo.png" alt="" width={30} height={30} priority className="h-[30px] w-auto" />
      <span className="flex flex-col leading-none">
        <span className={cn("inline-flex items-baseline font-sans text-[1.18rem] font-bold tracking-[-0.01em]", onDark ? "text-band-fg" : "text-ink")}>
          Gemin<span className={onDark ? "text-band-brand" : "text-brand"}>AI</span>
          <span className="ml-1 text-[0.6em] font-semibold opacity-90">Dx</span>
        </span>
        {product ? (
          <span className={cn("mt-1 font-mono text-[0.6rem] uppercase tracking-eyebrow", onDark ? "text-band-muted" : "text-muted")}>Agent Control Center</span>
        ) : null}
      </span>
      <span className="sr-only">GeminAI Dx Agent Control Center</span>
    </span>
  );
}
