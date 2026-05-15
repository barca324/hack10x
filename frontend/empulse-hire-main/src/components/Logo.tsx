import { useState } from "react";

interface LogoProps {
  className?: string;
  collapsed?: boolean;
}

/** Editable IndiaMART placeholder logo. Swap text/colors here to rebrand. */
export function Logo({ className = "", collapsed = false }: LogoProps) {
  const [src] = useState<string | null>(null);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center font-bold text-primary-foreground text-base shrink-0 shadow">
        {src ? <img src={src} alt="IndiaMART" className="h-full w-full object-contain" /> : "iM"}
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sidebar-foreground text-sm tracking-tight">IndiaMART</span>
          <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">IMS · HR Suite</span>
        </div>
      )}
    </div>
  );
}
