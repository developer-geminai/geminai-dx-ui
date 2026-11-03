import { cn } from "@/lib/utils";

export function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return <pre className={cn("max-h-96 overflow-auto rounded-md bg-paper-alt p-3 font-mono text-[0.72rem] leading-relaxed text-ink", className)}>{text}</pre>;
}
