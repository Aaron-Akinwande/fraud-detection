"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const nav = [
  { href: "/", label: "Overview", icon: "◈" },
  { href: "/submit", label: "Check Transaction", icon: "⬡" },
  { href: "/batch", label: "Batch Analysis", icon: "⊞" },
  { href: "/transactions", label: "Transaction Log", icon: "≡" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-red text-xl">⬡</span>
          <div>
            <p className="font-sans font-800 text-text text-sm tracking-widest uppercase">
              FraudWatch
            </p>
            <p className="font-mono text-muted text-[9px] tracking-wider">
              DETECTION SYSTEM v1.0
            </p>
          </div>
        </div>
      </div>

      {/* Status pill */}
      <div className="px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green blink" />
          <span className="font-mono text-[10px] text-green tracking-widest">
            SYSTEM ONLINE
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all duration-200 group",
                active
                  ? "bg-blue/10 text-blue border border-blue/20"
                  : "text-muted hover:text-text hover:bg-border/50 border border-transparent",
              )}
            >
              <span
                className={clsx(
                  "font-mono text-base",
                  active ? "text-blue" : "text-muted group-hover:text-text",
                )}
              >
                {icon}
              </span>
              <span className="font-sans font-medium tracking-wide">
                {label}
              </span>
              {active && (
                <span className="ml-auto w-1 h-1 rounded-full bg-blue" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <p className="font-mono text-[9px] text-muted tracking-wider leading-relaxed">
          MODEL: RANDOM FOREST
          <br />
          FEATURES: 6<br />
          STATUS: ACTIVE
        </p>
      </div>
    </aside>
  );
}
