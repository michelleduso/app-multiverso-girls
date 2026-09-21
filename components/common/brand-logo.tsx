import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logo oficial do Multiverso Girls (arquivo em /public/logo.png, fundo transparente). */
export function BrandLogo({ size = 96, priority = false, className }: { size?: number; priority?: boolean; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Multiverso Girls"
      width={size}
      height={size}
      priority={priority}
      className={cn("h-auto select-none", className)}
      style={{ width: size }}
    />
  );
}
