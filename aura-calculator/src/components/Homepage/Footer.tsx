"use client";

import { motion } from "framer-motion";
import { ExternalLink, Heart, ScanLine, Zap, Trophy } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative overflow-hidden px-4 py-16 paper-grain">
      <div className="absolute inset-0 bg-[var(--paper-deep)]" />
      <div className="halftone absolute inset-0 opacity-20" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Divider */}
        <div className="ink-divider mb-12">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2 L15 9 L22 9 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9 L9 9 Z" />
          </svg>
        </div>

        {/* Logo */}
        <div data-reveal="fade-up" className="mb-8">
          <div className="mb-4 inline-flex items-center gap-3">
            <span className="font-[var(--font-display)] text-3xl font-black tracking-tight text-[var(--ink)]">
              GIGACHAD OP METER
            </span>
          </div>
          <p className="font-[var(--font-mono)] text-xs uppercase tracking-widest text-[var(--ink-muted)]">
            The most dangerous personality test on the internet.
          </p>
        </div>

        {/* Nav links */}
        <div data-reveal="fade-up" data-reveal-delay="0.1" className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/quick-check"
            className="sketch-card-thin inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-[var(--ink-soft)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
          >
            <Zap className="h-4 w-4" /> Quick Check
          </Link>
          <Link
            href="/aura-scan"
            className="sketch-card-thin inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-[var(--ink-soft)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
          >
            <ScanLine className="h-4 w-4" /> Aura Scan
          </Link>
          <Link
            href="/results"
            className="sketch-card-thin inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-[var(--ink-soft)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
          >
            <Trophy className="h-4 w-4" /> My Results
          </Link>
        </div>

        {/* Made by */}
        <div data-reveal="blur-in" data-reveal-delay="0.15" className="mb-8">
          <p className="mb-2 font-[var(--font-mono)] text-xs uppercase tracking-widest text-[var(--ink-faint)]">
            Engineered with psychometric precision
          </p>
          <p className="sketch-underline inline-block font-[var(--font-display)] text-2xl font-black text-[var(--ink)]">
            Made by Harshit Mishra
          </p>
        </div>

        {/* Social links */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[
            {
              icon: <ExternalLink className="h-5 w-5" />,
              label: "GitHub",
              href: "https://github.com",
            },
          ].map((social, index) => (
            <motion.a
              key={index}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ink-line)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
              whileHover={{ scale: 1.08, y: -2 }}
              aria-label={social.label}
            >
              {social.icon}
            </motion.a>
          ))}
        </div>

        {/* Copyright */}
        <div className="flex items-center justify-center gap-2 font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">
          <span>Made with</span>
          <Heart className="h-3 w-3 fill-[var(--ink)] text-[var(--ink)]" />
          <span>and a lot of data</span>
        </div>

        <p className="mt-4 font-[var(--font-mono)] text-xs text-[var(--ink-faint)]">
          © {new Date().getFullYear()} GIGACHAD OP METER. All rights reserved. No aura was spared.
        </p>
      </div>
    </footer>
  );
}
