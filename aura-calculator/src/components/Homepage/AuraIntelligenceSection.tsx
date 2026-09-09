"use client";

const METRICS = [
  {
    label: "SIGNAL SAMPLING",
    value: "6.4kHz",
    note: "Blink frequency captured while you read this.",
  },
  {
    label: "DECISION LATENCY",
    value: "± 14ms",
    note: "Every hesitation is logged against your baseline.",
  },
  {
    label: "FILTER STABILITY",
    value: "0.02σ",
    note: "How hard the machine works to read through your act.",
  },
  {
    label: "AURA PRESSURE",
    value: "1.08 atm",
    note: "Presence is a measurable force. So is its absence.",
  },
];

const PRINCIPLES = [
  {
    title: "NO COLOUR",
    description:
      "Chromatic comfort is a crutch. The system reads you in pure ink and paper.",
  },
  {
    title: "NO REDO",
    description:
      "The exam runs once. Your first instinct is the only one that counts.",
  },
  {
    title: "NO MERCY",
    description:
      "The tier is a verdict. It is recorded. It does not expire.",
  },
];

export function AuraIntelligenceSection() {
  return (
    <section
      className="relative overflow-hidden py-32 px-4"
      aria-label="Aura intelligence"
    >
      {/* Inverted ink field */}
      <div className="absolute inset-0 bg-[var(--ink)]" />
      <div className="halftone absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#f4f1ee_1px,transparent_1.5px)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--ink),#241f17,var(--ink))]" />

      {/* Mouse-reactive depth field */}
      <div data-mouse-parallax className="absolute inset-0">
        <div
          data-mouse-depth="0.035"
          className="absolute -top-24 -right-24 h-[28rem] w-[28rem] rounded-full border-2 border-[var(--paper)] opacity-[0.08]"
        />
        <div
          data-mouse-depth="0.07"
          className="absolute -bottom-32 -left-24 h-[24rem] w-[24rem] rounded-full border-2 border-dashed border-[var(--paper)] opacity-[0.1]"
        />
      </div>

      {/* Scroll parallax accent ring */}
      <div data-parallax-section>
        <div
          data-parallax-layer
          data-parallax-speed="0.22"
          className="pointer-events-none absolute top-1/2 left-1/2 hidden h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--paper)] opacity-[0.05] lg:block"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Stamped eyebrow */}
        <div className="mb-8 flex justify-center" data-reveal="fade-up">
          <span className="stamp stamp-invert">THE MEASUREMENT ENGINE</span>
        </div>

        {/* Split-word headline */}
        <h2
          data-motion-text="words"
          className="mx-auto mb-8 max-w-4xl text-center font-[var(--font-display)] text-5xl font-black uppercase leading-[1.08] text-[var(--paper)] sm:text-7xl"
        >
          The system never blinks
        </h2>

        <p
          data-reveal="blur-in"
          data-reveal-delay="0.15"
          className="mx-auto mb-20 max-w-2xl text-center font-[var(--font-mono)] text-sm leading-relaxed text-[var(--paper-deep)]"
        >
          BEHIND THE QUIZ LIVES A QUIET PSYCHOMETRIC ENGINE. IT SAMPLES,
          COMPARES AND VERDICTS — WITHOUT A SINGLE PIXEL OF COMPASSION.
        </p>

        {/* Telemetry grid */}
        <div data-reveal-group className="mb-24 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((metric, index) => (
            <div
              key={metric.label}
              data-reveal-item
              className={`sketch-card-thin relative p-6 text-[var(--ink)] ${index % 2 === 0 ? "tilt-l" : "tilt-r"}`}
            >
              <div className="mb-4 font-[var(--font-mono)] text-[10px] font-bold tracking-[0.2em] text-[var(--ink-muted)]">
                {metric.label}
              </div>
              <div className="mb-2 font-[var(--font-display)] text-4xl font-black tracking-tight text-[var(--ink)]">
                {metric.value}
              </div>
              <div className="font-[var(--font-mono)] text-xs leading-relaxed text-[var(--ink-soft)]">
                {metric.note}
              </div>
            </div>
          ))}
        </div>

        {/* Principles */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PRINCIPLES.map((principle, index) => (
            <div
              key={principle.title}
              data-reveal={index % 2 === 0 ? "slide-left" : "slide-right"}
              data-reveal-delay={String(index * 0.08)}
              className="rounded-[1.75rem] border border-[var(--paper)]/25 bg-[var(--paper)]/[0.04] p-8 text-center"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--paper)] font-[var(--font-mono)] text-lg font-black text-[var(--paper)]">
                {index + 1}
              </div>
              <h3 className="mb-3 font-[var(--font-mono)] text-sm font-bold tracking-widest text-[var(--paper)]">
                {principle.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--paper-deep)]">
                {principle.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
