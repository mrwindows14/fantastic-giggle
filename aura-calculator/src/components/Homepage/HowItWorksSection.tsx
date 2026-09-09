"use client";

import {
  Clock,
  MessageSquare,
  AlertTriangle,
  Users,
  Zap,
  Shield,
  Eye,
  Target,
} from "lucide-react";

const PHASES = [
  {
    phase: "PHASE 1",
    title: "Spatial Deviation",
    questions: "Q1 - Q10",
    icon: <Eye className="h-6 w-6" />,
    description:
      "Tracks your physical coordination, spatial awareness, and involuntary actions. How do you move through the world?",
    mechanic: "DEFAULT UI",
  },
  {
    phase: "PHASE 2",
    title: "Verbal Banter",
    questions: "Q11 - Q20",
    icon: <MessageSquare className="h-6 w-6" />,
    description:
      "Tests your wit, social boundaries, and panic speech patterns. Can you hold your own under verbal fire?",
    mechanic: "CHAT BOX UI",
  },
  {
    phase: "PHASE 3",
    title: "Ego Trap",
    questions: "Q21 - Q30",
    icon: <AlertTriangle className="h-6 w-6" />,
    description:
      "The system hunts for try-hard behavior. Every \"cool\" option is a trap. Only vulnerability scores high.",
    mechanic: "GLITCH UI",
  },
  {
    phase: "PHASE 4",
    title: "Audience Pressure",
    questions: "Q31 - Q40",
    icon: <Users className="h-6 w-6" />,
    description:
      "A live spectator counter watches your every move. How do you perform when everyone's looking?",
    mechanic: "SPECTATOR TICKER",
  },
  {
    phase: "PHASE 5",
    title: "Neural Speed Run",
    questions: "Q41 - Q50",
    icon: <Zap className="h-6 w-6" />,
    description:
      "2-second timers. Shuffling options. No time to think. Pure instinct only. Your filter is stripped away.",
    mechanic: "2S TIMER",
  },
];

const MARKING_POINTS = [
  {
    icon: <Clock className="h-5 w-5" />,
    title: "INSTINCT VELOCITY",
    description:
      "Every millisecond is tracked. Fast, confident answers score higher. Slow hesitation gets penalized.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "CONSISTENCY CHECK",
    description:
      "Your answers are cross-referenced. Contradict yourself and the engine catches the lie.",
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: "HONEYPOT DETECTION",
    description:
      "Cool-sounding answers are traps. The system flags performative behavior and ego-driven choices.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden py-32 px-4 paper-grain">
      <div className="crosshatch-soft absolute inset-0" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section header */}
        <div data-reveal="blur-in" className="mb-20 text-center">
          <span className="stamp mb-6">THE MARKING SCHEME</span>
          <h2 className="mt-6 font-[var(--font-display)] text-5xl font-black uppercase sm:text-6xl">
            <span className="sketch-underline">How the system works</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-[var(--font-mono)] text-sm text-[var(--ink-muted)]">
            WE WON&apos;T REVEAL THE EXACT ENGINE. BUT HERE&apos;S ENOUGH TO KNOW YOU CAN&apos;T CHEAT.
          </p>
        </div>

        {/* 5 Phases */}
        <div className="mb-20">
          <h3 className="mb-8 text-center font-[var(--font-mono)] text-lg font-bold uppercase tracking-widest text-[var(--ink-soft)]">
            The 5 Pressure Phases
          </h3>
          <div className="space-y-4">
            {PHASES.map((phase, index) => (
              <div
                key={phase.phase}
                data-reveal={index % 2 === 0 ? "slide-left" : "slide-right"}
                data-reveal-delay={String(index * 0.1)}
                className={`sketch-card-thin flex flex-col gap-5 p-6 sm:flex-row sm:items-center ${index % 2 === 0 ? "tilt-l" : "tilt-r"}`}
              >
                {/* Phase number */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--ink)]">
                  <span className="font-[var(--font-mono)] text-lg font-black text-[var(--paper)]">
                    {phase.phase.replace("PHASE ", "")}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span className="text-[var(--ink)]">{phase.icon}</span>
                    <h4 className="text-lg font-bold text-[var(--ink)] sm:text-xl">
                      {phase.title}
                    </h4>
                    <span className="font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">
                      {phase.questions}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
                    {phase.description}
                  </p>
                </div>

                {/* Mechanic badge */}
                <div className="hidden shrink-0 rounded-full border border-[var(--ink-line)] px-4 py-1.5 font-[var(--font-mono)] text-[10px] font-bold tracking-wider text-[var(--ink-soft)] md:block">
                  {phase.mechanic}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marking Scheme */}
        <div>
          <h3 className="mb-8 text-center font-[var(--font-mono)] text-lg font-bold uppercase tracking-widest text-[var(--ink-soft)]">
            What We Track
          </h3>
          <div data-reveal-group className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {MARKING_POINTS.map((point, index) => (
              <div
                key={index}
                data-reveal-item
                className={`sketch-card text-center p-6 ${index === 0 ? "tilt-l" : index === 2 ? "tilt-r" : ""}`}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--paper)]">
                  {point.icon}
                </div>
                <h4 className="mb-2 font-[var(--font-mono)] text-sm font-bold tracking-wide text-[var(--ink)]">
                  {point.title}
                </h4>
                <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
