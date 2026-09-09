"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, ScanLine, Trophy, Flame } from "lucide-react";
import { Magnetic } from "@/components/Magnetic";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/quick-check", label: "Quick Check", icon: Zap },
  { href: "/aura-scan", label: "Aura Scan", icon: ScanLine },
  { href: "/results", label: "Results", icon: Trophy },
];

export function NavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="sketch-card-thin mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5">
        <Magnetic strength={0.2}>
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-black tracking-tight text-[var(--ink)]"
            aria-label="Aura Calculator home"
          >
            <span className="stamp flex h-8 w-8 items-center justify-center">
              <Flame className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">AURA</span>
          </Link>
        </Magnetic>

        <nav className="flex items-center gap-1" aria-label="Primary">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Magnetic key={href} strength={0.25}>
                <Link
                  href={href}
                  className={`relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
                    active
                      ? "bg-[var(--ink)] text-[var(--paper)] shadow-[0_10px_20px_-10px_rgba(23,19,12,0.5)]"
                      : "text-[var(--ink-soft)] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              </Magnetic>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
