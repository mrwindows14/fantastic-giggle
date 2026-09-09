"use client";

import { AlertTriangle, Eye, Clock, Shield, Zap } from "lucide-react";

export function DontLieSection() {
  return (
    <section className="relative overflow-hidden py-32 px-4 paper-grain">
      {/* Inverted ink section */}
      <div className="absolute inset-0 bg-[var(--ink)]" />
      <div className="halftone absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#f4f1ee_1px,transparent_1.5px)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--ink),#2a251d,var(--ink))]" />

      {/* Scroll parallax accent ring */}
      <div data-parallax-section>
        <div
          data-parallax-layer
          data-parallax-speed="0.18"
          className="pointer-events-none absolute top-1/2 left-1/2 hidden h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-[var(--paper)] opacity-[0.06] lg:block"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Warning stamp */}
        <div data-reveal="scale" className="mb-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-[var(--paper)]">
            <AlertTriangle className="h-12 w-12 text-[var(--paper)]" />
          </div>
        </div>

        {/* Main warning */}
        <h2
          data-reveal="blur-in"
          className="mb-6 font-[var(--font-display)] text-5xl font-black uppercase text-[var(--paper)] sm:text-7xl"
        >
          <span className="sketch-underline" style={{ backgroundImage: "linear-gradient(to right, #f4f1ee 60%, transparent 40%)" }}>
            Don&apos;t lie.
          </span>
        </h2>

        <p
          data-reveal="fade-up"
          data-reveal-delay="0.15"
          className="mx-auto mb-12 max-w-2xl font-[var(--font-display)] text-2xl italic text-[var(--paper-deep)]"
        >
          The system <span className="font-bold not-italic text-[var(--paper)]">knows</span> when you&apos;re faking
          it. Every. Single. Time.
        </p>

        {/* Detection methods */}
        <div data-reveal-group className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {[
            {
              icon: <Clock className="h-6 w-6" />,
              title: "RESPONSE TIME TRACKING",
              description:
                "Took 4 seconds to pick the 'confident' answer? Flagged. Authentic aura is instant.",
            },
            {
              icon: <Eye className="h-6 w-6" />,
              title: "CONSISTENCY CROSS-REFERENCE",
              description:
                "Said you're fearless in Q7 but froze in Q42? The engine catches the contradiction.",
            },
            {
              icon: <Shield className="h-6 w-6" />,
              title: "HONEYPOT TRAP DETECTION",
              description:
                "Every 'cool' option is bait. The system tracks if you fell for the ego trap.",
            },
            {
              icon: <Zap className="h-6 w-6" />,
              title: "INSTINCT VELOCITY ANALYSIS",
              description:
                "Real confidence is measured in milliseconds. Overthinking = desperation.",
            },
          ].map((method, index) => (
            <div
              key={index}
              data-reveal-item
              className={`rounded-[1.75rem] border border-[var(--paper)]/25 bg-[var(--paper)]/[0.04] p-7 text-left transition-transform duration-300 hover:-translate-y-1 ${index % 2 === 0 ? "tilt-l" : "tilt-r"}`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--paper)]/40 text-[var(--paper)]">
                {method.icon}
              </div>
              <h4 className="mb-2 font-[var(--font-mono)] text-sm font-bold tracking-wide text-[var(--paper)]">
                {method.title}
              </h4>
              <p className="text-sm leading-relaxed text-[var(--paper-deep)]">
                {method.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom warning */}
        <div data-reveal="fade-up" className="inline-flex items-center gap-3 rounded-full border border-[var(--paper)]/30 bg-[var(--paper)]/[0.05] px-7 py-3.5">
          <AlertTriangle className="h-5 w-5 text-[var(--paper)]" />
          <span className="font-[var(--font-mono)] text-sm font-bold text-[var(--paper)]">
            LYING WILL ONLY LOWER YOUR SCORE. BE HONEST. BE YOURSELF. LET THE AURA FLOW.
          </span>
        </div>
      </div>
    </section>
  );
}
