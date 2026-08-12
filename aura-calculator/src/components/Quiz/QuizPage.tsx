/* eslint-disable react-hooks/purity -- particle effects use Math.random() for visual variety */
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  REGULAR_QUESTIONS,
  PHASES,
  QuizQuestion,
  Phase,
  CURVEBALL_QUESTIONS,
} from "@/lib/questions-new";
import { Phase2Chat } from "./Phase2Chat";
import {
  calculateAuraScore,
  analyzeResponsePattern,
  trackAuraVelocity,
  getCurrentPhase,
} from "@/lib/truthMatrix";
import { smoothScrollTo } from "@/lib/scroll";
import { playSelect } from "@/lib/auraSound";
import {
  Eye,
  Zap,
  AlertTriangle,
  Flame,
  Skull,
  Brain,
  Clock,
  Trophy,
  Target,
  Sparkles,
  Activity,
} from "lucide-react";

// ===== PRESSURE EVENT SYSTEM =====
type PressureEvent = {
  id: string;
  type: "glitch" | "flash" | "shake" | "distraction" | "speedUp" | "reverseText";
  duration: number;
  message: string;
  icon: string;
};

const PRESSURE_EVENTS: PressureEvent[] = [
  { id: "glitch1", type: "glitch", duration: 800, message: "SYSTEM MALFUNCTION", icon: "◢" },
  { id: "glitch2", type: "flash", duration: 300, message: "BRIGHTNESS OVERLOAD", icon: "◉" },
  { id: "shake1", type: "shake", duration: 600, message: "EARTHQUAKE DETECTED", icon: "≡" },
  { id: "distraction1", type: "distraction", duration: 1500, message: "FOCUS DISRUPTED", icon: "◎" },
  { id: "speedUp1", type: "speedUp", duration: 2000, message: "TIME ACCELERATED", icon: "▶" },
  { id: "reverseText1", type: "reverseText", duration: 1500, message: "REVERSE MODE", icon: "⇄" },
  { id: "glitch3", type: "glitch", duration: 500, message: "DATA CORRUPTION", icon: "◢" },
  { id: "shake2", type: "shake", duration: 400, message: "VIBRATION PULSE", icon: "≈" },
  { id: "reverseText2", type: "reverseText", duration: 1200, message: "INVERTED PERCEPTION", icon: "⇄" },
  { id: "speedUp2", type: "speedUp", duration: 1800, message: "CLOCK SHIFT", icon: "▶" },
  { id: "distraction2", type: "distraction", duration: 1200, message: "NOISE FLOOD", icon: "◎" },
  { id: "glitch4", type: "glitch", duration: 700, message: "MEMORY FRAGMENT", icon: "◢" },
];

// ===== FISHER-YATES SHUFFLE =====
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== DETERMINISTIC SEEDED SHUFFLE =====
// Same seed + array => same order. Used so every run deals a fresh,
// unpredictable layout that stays stable while a question is on screen.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== PER-RUN QUESTION ORDER =====
// Shuffle the 10 questions inside every phase so each run deals a
// different sequence while preserving phase boundaries and scoring.
function buildRunQuestionOrder(): QuizQuestion[] {
  const seed = Math.floor(Math.random() * 0xffffffff);
  const groups: QuizQuestion[][] = [];
  for (let i = 0; i < REGULAR_QUESTIONS.length; i += 10) {
    groups.push(REGULAR_QUESTIONS.slice(i, i + 10));
  }
  return groups.flatMap((group, i) => seededShuffle(group, seed + i * 101));
}

// ===== MEMORIZATION COUNTERMEASURE =====
// If a subject answers a huge share of questions suspiciously fast,
// the system assumes the script is known and escalates unpredictability.
function getMemorizationSuspicion(
  answers: { responseTimeMs: number }[]
): number {
  if (answers.length < 5) return 0;
  const recent = answers.slice(-6);
  const ultraFast = recent.filter((a) => a.responseTimeMs < 900).length;
  return ultraFast / recent.length;
}

// ===== DYNAMIC DIFFICULTY CALCULATOR =====
function getDynamicDifficulty(
  answers: { responseTimeMs: number; questionId: number }[],
  currentPhase: Phase
): {
  timerReduction: number;
  distractionChance: number;
  curveballChance: number;
  pressureEventChance: number;
} {
  if (answers.length < 3) {
    return { timerReduction: 0, distractionChance: 0, curveballChance: 0, pressureEventChance: 0 };
  }

  const recentAnswers = answers.slice(-5);
  const avgTime =
    recentAnswers.reduce((sum, a) => sum + a.responseTimeMs, 0) / recentAnswers.length;
  const fastResponses = recentAnswers.filter((a) => a.responseTimeMs < 2000).length;

  const speedBonus = fastResponses / recentAnswers.length;

  return {
    timerReduction: currentPhase === 5 ? Math.floor(speedBonus * 500) : 0,
    distractionChance: 0.1 + speedBonus * 0.2,
    curveballChance: 0.05 + speedBonus * 0.15,
    pressureEventChance: 0.1 + speedBonus * 0.3,
  };
}

export function QuizPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<
    { questionId: number; optionId: string; responseTimeMs: number }[]
  >([]);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [shufflingOptions, setShufflingOptions] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<number[]>([]);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [currentPressureEvent, setCurrentPressureEvent] = useState<PressureEvent | null>(null);
  const [showCurveball, setShowCurveball] = useState(false);
  const [curveballQuestion, setCurveballQuestion] = useState<QuizQuestion | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [glitchIntensity, setGlitchIntensity] = useState(0);
  const [reverseText, setReverseText] = useState(false);
  const [distractionActive, setDistractionActive] = useState(false);
  const [scoreEstimate, setScoreEstimate] = useState(0);
  const [curveballCount, setCurveballCount] = useState(0);
  const [showMidpointCheck, setShowMidpointCheck] = useState(false);
  const midpointShownRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const answeringRef = useRef(false);
  const pressureEventTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bestStreakRef = useRef(0);
  const runShuffleSeedRef = useRef(Math.floor(Math.random() * 0xffffffff));

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const currentQuestionRef = useRef(currentQuestion);
  currentQuestionRef.current = currentQuestion;
  const questionStartTimeRef = useRef(questionStartTime);
  questionStartTimeRef.current = questionStartTime;
  const showCurveballRef = useRef(showCurveball);
  showCurveballRef.current = showCurveball;

  const [questions] = useState<QuizQuestion[]>(() => buildRunQuestionOrder());
  const currentQ = useMemo(() => {
    if (showCurveball && curveballQuestion) return curveballQuestion;
    return questions[currentQuestion];
  }, [currentQuestion, showCurveball, curveballQuestion, questions]);
  const currentQRef = useRef<QuizQuestion | null>(null);
  currentQRef.current = currentQ;
  const phase = getCurrentPhase(currentQuestion);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const phaseInfo = PHASES[phase];

  // Stable per-question option order, dealt fresh every run
  const baseOrder = useMemo(() => {
    if (!currentQ) return [];
    return seededShuffle(
      currentQ.options.map((_, i) => i),
      runShuffleSeedRef.current * 31 + currentQ.id
    );
  }, [currentQ]);
  const displayOrder = shuffledOptions.length > 0 ? shuffledOptions : baseOrder;
  const shuffledOptionsRef = useRef<number[]>([]);
  shuffledOptionsRef.current = displayOrder;

  // Dynamic difficulty
  const difficulty = useMemo(() => getDynamicDifficulty(answers, phase), [answers, phase]);

  // Prior answers as text, for the Phase 2 Aura System recall
  const previousChoices = useMemo(
    () =>
      answers
        .map((a) => {
          const q = questions.find((qq) => qq.id === a.questionId);
          return q?.options.find((o) => o.id === a.optionId)?.text;
        })
        .filter((t): t is string => Boolean(t)),
    [answers, questions]
  );

  // Live adaptive-pressure readout for the System Status HUD
  const pressure = useMemo(() => {
    const max = Math.max(
      difficulty.pressureEventChance,
      difficulty.curveballChance,
      difficulty.distractionChance
    );
    const pct = Math.min(100, Math.round(max * 100));
    const label = pct < 15 ? "NOMINAL" : pct < 30 ? "ELEVATED" : pct < 45 ? "HEIGHTENED" : "CRITICAL";
    return { pct, label };
  }, [difficulty]);

  const avgReplyMs = answers.length
    ? Math.round(answers.reduce((s, a) => s + a.responseTimeMs, 0) / answers.length)
    : 0;

  // Score estimate (debounced to avoid recalculation on every render)
  useEffect(() => {
    if (answers.length > 0) {
      const timeout = setTimeout(() => {
        const result = calculateAuraScore(answers);
        setScoreEstimate(result.score);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [answers]);

  const handleAnswer = useCallback(
    (questionId: number, optionId: string) => {
      if (answeringRef.current) return;
      answeringRef.current = true;
      playSelect();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const responseTimeMs = Date.now() - questionStartTimeRef.current;
      const newAnswers = [...answersRef.current, { questionId, optionId, responseTimeMs }];
      setAnswers(newAnswers);
      setSelectedOption(null);

      // Update streak (ref avoids stale state in the final save)
      const isGoodAnswer = responseTimeMs < 3000;
      if (isGoodAnswer) {
        setStreak((prev) => {
          const newStreak = prev + 1;
          if (newStreak > bestStreakRef.current) {
            bestStreakRef.current = newStreak;
            setBestStreak(newStreak);
          }
          if (newStreak >= 3 && newStreak % 3 === 0) {
            setShowStreakPopup(true);
            setTimeout(() => setShowStreakPopup(false), 2000);
          }
          return newStreak;
        });
      } else {
        setStreak(0);
      }

      // Clear pressure event and shake
      if (pressureEventTimeoutRef.current) {
        clearTimeout(pressureEventTimeoutRef.current);
        pressureEventTimeoutRef.current = null;
        setCurrentPressureEvent(null);
        setScreenShake(false);
        setGlitchIntensity(0);
        setReverseText(false);
        setDistractionActive(false);
      }

      // ===== CURVEBALL ANSWER: record it, then return to the real question =====
      if (showCurveball) {
        setShowCurveball(false);
        setCurveballQuestion(null);
        setCurveballCount((c) => c + 1);
        setQuestionStartTime(Date.now());
        answeringRef.current = false;
        return;
      }

      const nextQuestion = currentQuestionRef.current + 1;
      if (nextQuestion < questions.length) {
        const nextPhase = getCurrentPhase(nextQuestion);
        const currentPhase = getCurrentPhase(currentQuestionRef.current);
        if (nextPhase !== currentPhase && !showPhaseTransition) {
          setShowPhaseTransition(true);
          setTimeout(() => {
            setShowPhaseTransition(false);
            setCurrentQuestion(nextQuestion);
            setQuestionStartTime(Date.now());
            answeringRef.current = false;
          }, 2000);
        } else {
          setCurrentQuestion(nextQuestion);
          setQuestionStartTime(Date.now());
          answeringRef.current = false;
        }
      } else {
        const result = calculateAuraScore(newAnswers);
        const velocity = trackAuraVelocity(newAnswers);
        const pattern = analyzeResponsePattern(newAnswers);
        localStorage.setItem(
          "auraResults",
          JSON.stringify({
            ...result,
            answers: newAnswers,
            auraVelocity: velocity,
            responsePattern: pattern,
            bestStreak: bestStreakRef.current,
            curveballCount,
            totalCurveballs: newAnswers.filter((a) => a.questionId >= 100).length,
          })
        );
        router.push("/results");
      }
    },
    [questions.length, router, showPhaseTransition, showCurveball]
  );

  const handleAnswerRef = useRef(handleAnswer);
  handleAnswerRef.current = handleAnswer;

  // ===== KEYBOARD ANSWERS (1-4) =====
  useEffect(() => {
    if (!quizStarted || showPhaseTransition || showDisclaimer || showMidpointCheck) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (phaseRef.current === 2) return; // Phase 2 chat handles its own keys
      const index = parseInt(e.key, 10) - 1;
      if (index < 0 || index > 3) return;
      const q = currentQRef.current;
      if (!q) return;
      const order =
        shuffledOptionsRef.current.length > 0
          ? shuffledOptionsRef.current
          : q.options.map((_, i) => i);
      const option = q.options[order[index]];
      if (!option) return;
      e.preventDefault();
      setSelectedOption(option.id);
      handleAnswerRef.current(q.id, option.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quizStarted, showPhaseTransition, showDisclaimer]);

  // Timer for Phase 5 (and curveball questions with timeLimitMs)
  useEffect(() => {
    if (quizStarted && currentQ?.timeLimitMs) {
      const timerReduction = difficulty.timerReduction;
      const adjustedTime = Math.max(800, currentQ.timeLimitMs - timerReduction);
      const timeSeconds = adjustedTime / 1000;
      setTimeLeft(timeSeconds);
      answeringRef.current = false;

      timerRef.current = setInterval(() => {
        if (!timerRef.current) return;
        setTimeLeft((prev) => {
          if (prev === null || prev <= 0.1) {
            if (answeringRef.current) return null;
            answeringRef.current = true;
            clearInterval(timerRef.current!);
            timerRef.current = null;
            const q = currentQRef.current;
            if (q) {
              handleAnswerRef.current(q.id, q.options[0].id);
            }
            return null;
          }
          return Math.max(0, prev - 0.1);
        });
      }, 100);
    } else {
      setTimeLeft(null);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      answeringRef.current = false;
    };
  }, [currentQuestion, quizStarted, currentQ?.timeLimitMs, difficulty.timerReduction]);

  // Spectator count for Phase 4
  useEffect(() => {
    if (phase === 4 && currentQ?.spectatorCount) {      const target = currentQ.spectatorCount;
      setSpectatorCount(0);
      const increment = Math.ceil(target / 30);
      let current = 0;
      const interval = setInterval(() => {
        current = Math.min(current + increment, target);
        setSpectatorCount(current);
        if (current >= target) clearInterval(interval);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setSpectatorCount(0);
    }
  }, [currentQuestion, phase, currentQ?.spectatorCount]);

  // ===== PHASE 5 OPTION SCRAMBLE =====
  // Phase 5 re-scrambles the already-shuffled options on screen.
  useEffect(() => {
    if (phase === 5 && quizStarted && currentQ) {
      setShuffledOptions(shuffleArray(baseOrder));
      setShufflingOptions(true);
      const timeout = setTimeout(() => setShufflingOptions(false), 500);
      return () => clearTimeout(timeout);
    } else if (quizStarted) {
      setShuffledOptions([]);
    }
  }, [currentQuestion, phase, quizStarted, currentQ, baseOrder]);

  // ===== PRESSURE EVENT SYSTEM =====
  useEffect(() => {
    if (!quizStarted || showPhaseTransition || showMidpointCheck) return;

    // Streaks attract the system's attention: escalation on hot runs
    const streakEscalation = streak >= 3 ? 0.1 : 0;

    // Random pressure events
    if (Math.random() < difficulty.pressureEventChance + streakEscalation) {
      const randomEvent = PRESSURE_EVENTS[Math.floor(Math.random() * PRESSURE_EVENTS.length)];
      setCurrentPressureEvent(randomEvent);

      if (randomEvent.type === "shake") {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), randomEvent.duration);
      }

      if (randomEvent.type === "glitch") {
        setGlitchIntensity(0.5);
        setTimeout(() => setGlitchIntensity(0), randomEvent.duration);
      }

      if (randomEvent.type === "speedUp") {
        // Real clock theft: eat half a second off the timer
        setTimeLeft((prev) => (prev === null ? prev : Math.max(0.4, prev - 0.5)));
      }

      if (randomEvent.type === "reverseText") {
        setReverseText(true);
        setTimeout(() => setReverseText(false), randomEvent.duration);
      }

      if (randomEvent.type === "distraction") {
        setDistractionActive(true);
        setTimeout(() => setDistractionActive(false), randomEvent.duration);
      }

      pressureEventTimeoutRef.current = setTimeout(() => {
        setCurrentPressureEvent(null);
        setScreenShake(false);
        setGlitchIntensity(0);
        setReverseText(false);
        setDistractionActive(false);
      }, randomEvent.duration);
    }

    // ===== ADAPTIVE CURVEBALL INJECTION =====
    // Base chance scales with speed, then escalates when the subject
    // answers suspiciously fast (memorization countermeasure) and once
    // a few curveballs have already landed (chaos chain).
    const suspicion = getMemorizationSuspicion(answersRef.current);
    const chainBonus = curveballCount >= 2 ? 0.12 : 0;
    const curveballChance = Math.min(
      0.55,
      difficulty.curveballChance + suspicion * 0.25 + chainBonus
    );

    // Random curveball questions (never above the 50 regular questions)
    if (
      Math.random() < curveballChance &&
      currentQuestion > 5 &&
      currentQuestion < questions.length
    ) {
      const availableCurveballs = CURVEBALL_QUESTIONS.filter((q) => q.phase === phase);
      if (availableCurveballs.length > 0) {
        const randomCurveball =
          availableCurveballs[Math.floor(Math.random() * availableCurveballs.length)];
        setCurveballQuestion(randomCurveball);
        setShowCurveball(true);
      }
    }

    return () => {
      if (pressureEventTimeoutRef.current) {
        clearTimeout(pressureEventTimeoutRef.current);
        pressureEventTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, quizStarted, curveballCount]);

  // ===== HALF-TIME DEBRIEF =====
  useEffect(() => {
    const midpoint = Math.floor(questions.length / 2);
    if (
      quizStarted &&
      currentQuestion === midpoint &&
      !midpointShownRef.current &&
      !showPhaseTransition
    ) {
      midpointShownRef.current = true;
      setShowMidpointCheck(true);
      answeringRef.current = true;
    }
  }, [currentQuestion, quizStarted, showPhaseTransition, questions.length]);

  const handleStartQuiz = () => setShowDisclaimer(true);
  const handleAcceptDisclaimer = () => {
    setShowDisclaimer(false);
    setQuizStarted(true);
    setQuestionStartTime(Date.now());
    smoothScrollTo(0);
  };

  const phaseMeta = (() => {
    switch (phase) {
      case 1: return { label: "SPATIAL ANALYSIS", badge: <Brain className="h-4 w-4" /> };
      case 2: return { label: "VERBAL BANTER", badge: null };
      case 3: return { label: "EGO TRAP ZONE", badge: <Skull className="h-4 w-4" /> };
      case 4: return { label: "PUBLIC SCRUTINY", badge: <Eye className="h-4 w-4" /> };
      case 5: return { label: "NEURAL SPEED RUN", badge: <Zap className="h-4 w-4" /> };
      default: return { label: "ANALYSIS", badge: null };
    }
  })();

  // ===== PHASE TRANSITION SCREEN =====
  if (showPhaseTransition) {
    const nextPhase = getCurrentPhase(currentQuestion + 1);
    const nextPhaseInfo = PHASES[nextPhase];
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] paper-grain">
        <div className="halftone absolute inset-0 opacity-30" />
        <div className="crosshatch absolute inset-0 opacity-20" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          className="relative z-10 text-center"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--ink)]"
          >
            <Skull className="h-12 w-12 text-[var(--paper)]" />
          </motion.div>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4 font-[var(--font-display)] text-4xl font-black uppercase text-[var(--ink)] md:text-6xl"
          >
            <span className="sketch-underline">Phase {nextPhase} incoming</span>
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-[var(--font-mono)] text-lg font-bold text-[var(--ink)]"
          >
            {nextPhaseInfo.name}
          </motion.p>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-2 font-[var(--font-mono)] text-sm text-[var(--ink-muted)]"
          >
            {nextPhaseInfo.description.toUpperCase()}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ===== DISCLAIMER MODAL =====
  if (showDisclaimer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-4 paper-grain">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="sketch-card-ink w-full max-w-lg p-8 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--paper)]"
          >
            <AlertTriangle className="h-8 w-8 text-[var(--paper)]" />
          </motion.div>
          <h2 className="mb-4 font-[var(--font-display)] text-2xl font-black uppercase text-[var(--paper)]">
            Disclaimer
          </h2>
          <p className="mb-6 leading-relaxed text-[var(--paper-deep)]">
            This examination uses{" "}
            <span className="font-bold text-[var(--paper)]">psychological pressure techniques</span>{" "}
            including response-time tracking, consistency cross-references, and ego trap detection.
            There is <span className="font-bold text-[var(--paper)]">no way to cheat</span>.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setShowDisclaimer(false)}
              className="sketch-btn sketch-btn-ghost flex-1 text-[var(--paper)]"
            >
              GO BACK
            </button>
            <button
              onClick={handleAcceptDisclaimer}
              className="sketch-btn flex-1 text-[var(--ink)]"
              style={{ background: "var(--paper)", color: "var(--ink)", border: "2px solid var(--paper)" }}
            >
              I ACCEPT THE RISK
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== PRE-QUIZ STATE =====
  if (!quizStarted) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--paper)] p-4 paper-grain">
        <div className="halftone absolute inset-0 opacity-30" />
        <div className="crosshatch-soft absolute inset-0" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-2xl text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mb-8"
          >
            <h1 className="mb-6 font-[var(--font-display)] text-5xl font-black uppercase sm:text-7xl">
              <span className="sketch-underline">Ready to begin?</span>
            </h1>
            <div className="flex items-center justify-center gap-4">
              <span className="stamp">50 QUESTIONS</span>
              <span className="stamp stamp-invert">5 PHASES</span>
              <span className="stamp">ZERO MERCY</span>
            </div>
          </motion.div>

          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {Object.values(PHASES).map((p) => (
              <motion.span
                key={p.phase}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: p.phase * 0.1 }}
                className="sketch-card-thin px-4 py-2 font-[var(--font-mono)] text-xs text-[var(--ink-soft)]"
              >
                {p.name.split(" ").slice(0, 2).join(" ")}
              </motion.span>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStartQuiz}
            className="sketch-btn text-lg"
          >
            <Flame className="h-6 w-6" />
            TAKE THE TEST
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ===== QUIZ IN PROGRESS =====
  return (
    <div
      className={`relative min-h-screen bg-[var(--paper)] p-4 paper-grain md:p-8 ${
        screenShake ? "animate-shake" : ""
      }`}
    >
      <div className="crosshatch-soft absolute inset-0" />

      {/* ===== PHASE 3 GLITCH EFFECT ===== */}
      {(glitchIntensity > 0) && (
        <div className="pointer-events-none fixed inset-0 z-40">
          <div className="absolute inset-0 bg-[var(--ink)] opacity-[0.04]" />
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-px bg-[var(--ink)] opacity-50"
              style={{ top: `${10 + i * 12}%`, left: 0, right: 0 }}
              animate={{ x: [-100, 100, -100], opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.2 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.08 }}
            />
          ))}
        </div>
      )}

      {/* ===== PRESSURE EVENT OVERLAY ===== */}
      <AnimatePresence>
        {currentPressureEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center ${
              currentPressureEvent.type === "flash" ? "bg-[var(--paper-card)]" : "bg-[var(--ink)]/80"
            }`}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 4, -4, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-center"
            >
              <span className={`text-6xl ${currentPressureEvent.type === "flash" ? "text-[var(--ink)]" : "text-[var(--paper)]"}`}>
                {currentPressureEvent.icon}
              </span>
              <p
                className={`mt-4 font-[var(--font-mono)] text-2xl font-black tracking-widest ${
                  currentPressureEvent.type === "flash" ? "text-[var(--ink)]" : "text-[var(--paper)]"
                }`}
              >
                {currentPressureEvent.message}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== STREAK POPUP ===== */}
      <AnimatePresence>
        {showStreakPopup && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="sketch-card fixed left-1/2 top-20 z-50 -translate-x-1/2 px-6 py-3"
          >
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-[var(--ink)]" />
              <span className="font-[var(--font-mono)] text-xl font-black text-[var(--ink)]">
                {streak}x STREAK!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== PHASE 4 SPECTATOR TICKER ===== */}
      {phase === 4 && currentQ?.spectatorCount && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sketch-card-thin fixed top-4 right-4 z-50 px-4 py-3"
        >
          <div className="flex items-center gap-2 font-[var(--font-mono)]">
            <Eye className="h-5 w-5 animate-pulse text-[var(--ink)]" />
            <span className="text-sm font-bold text-[var(--ink)]">
              {spectatorCount} people are watching you
            </span>
          </div>
          <div className="mt-1 flex gap-1">
            {Array.from({ length: Math.min(Math.floor(spectatorCount / 20), 10) }).map((_, i) => (
              <div
                key={i}
                className="h-2 w-2 animate-pulse bg-[var(--ink)]"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ===== TIMER (Phase 5 + Curveballs with time limit) ===== */}
      {(phase === 5 || (showCurveball && currentQ?.timeLimitMs)) && timeLeft !== null && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <motion.div
            animate={{ scale: timeLeft < 1 ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 0.3, repeat: timeLeft < 1 ? Infinity : 0 }}
            className="sketch-card-thin px-6 py-3"
          >
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-[var(--ink)]" />
              <span className="font-[var(--font-mono)] text-2xl font-black text-[var(--ink)]">
                {timeLeft.toFixed(1)}s
              </span>
            </div>
            <div className="meter-track mt-2 w-40">
              <div
                className={`meter-fill ${timeLeft < 1 ? "animate-pulse" : ""}`}
                style={{ width: `${(timeLeft / 2) * 100}%`, transitionDuration: "0.1s" }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* ===== HALF-TIME DEBRIEF ===== */}
      <AnimatePresence>
        {showMidpointCheck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--ink)]/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="sketch-card w-full max-w-lg p-8"
            >
              <p className="stamp mb-4">HALF-TIME DEBRIEF</p>
              <h2 className="mb-6 font-[var(--font-display)] text-3xl font-black uppercase text-[var(--ink)]">
                System checkpoint
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="sketch-card-thin p-4 text-center">
                  <p className="font-[var(--font-mono)] text-xs tracking-widest text-[var(--ink-muted)]">CURRENT SCORE</p>
                  <p className="font-[var(--font-mono)] text-2xl font-black text-[var(--ink)]">{scoreEstimate.toLocaleString()}</p>
                </div>
                <div className="sketch-card-thin p-4 text-center">
                  <p className="font-[var(--font-mono)] text-xs tracking-widest text-[var(--ink-muted)]">BEST STREAK</p>
                  <p className="font-[var(--font-mono)] text-2xl font-black text-[var(--ink)]">{bestStreak}x</p>
                </div>
                <div className="sketch-card-thin p-4 text-center">
                  <p className="font-[var(--font-mono)] text-xs tracking-widest text-[var(--ink-muted)]">CURVEBALLS</p>
                  <p className="font-[var(--font-mono)] text-2xl font-black text-[var(--ink)]">{curveballCount}</p>
                </div>
                <div className="sketch-card-thin p-4 text-center">
                  <p className="font-[var(--font-mono)] text-xs tracking-widest text-[var(--ink-muted)]">AVG REPLY</p>
                  <p className="font-[var(--font-mono)] text-2xl font-black text-[var(--ink)]">
                    {avgReplyMs ? `${Math.round(avgReplyMs / 100) / 10}s` : "—"}
                  </p>
                </div>
              </div>
              <p className="mt-6 font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">
                THE SYSTEM PAUSED TO TAKE STOCK OF YOU. {answers.length} REPLIES ON RECORD, PRESSURE{" "}
                {pressure.label}.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowMidpointCheck(false);
                  answeringRef.current = false;
                  setQuestionStartTime(Date.now());
                }}
                className="sketch-btn mt-6 w-full text-base"
              >
                CONTINUE THE EXAM
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== SYSTEM STATUS HUD ===== */}
      {quizStarted && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="sketch-card-thin fixed left-4 top-4 z-50 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse bg-[var(--ink)]" />
            <span className="font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--ink)]">
              SYSTEM STATUS
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-[var(--font-mono)] text-[10px] text-[var(--ink-muted)]">PRESSURE</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((seg) => (
                <div
                  key={seg}
                  className="h-3 w-3 border border-[var(--ink)]"
                  style={{
                    backgroundColor: pressure.pct > seg * 25 ? "var(--ink)" : "transparent",
                  }}
                />
              ))}
            </div>
            <span className="font-[var(--font-mono)] text-xs font-black text-[var(--ink)]">
              {pressure.label}
            </span>
          </div>
          <div className="mt-2 space-y-0.5 font-[var(--font-mono)] text-[10px] text-[var(--ink-muted)]">
            <div>PHASE {phase}/5 · {phaseInfo.name.toUpperCase()}</div>
            {difficulty.timerReduction > 0 && (
              <div>TIMER CUT −{difficulty.timerReduction}MS</div>
            )}
            {curveballCount > 0 && (
              <div className="font-bold text-[var(--ink)]">
                CURVEBALLS FIELDED: {curveballCount}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== SCORE ESTIMATE ===== */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="sketch-card-thin fixed bottom-4 left-4 z-50 px-4 py-2"
      >
        <div className="flex items-center gap-2 font-[var(--font-mono)]">
          <Activity className="h-4 w-4 text-[var(--ink-muted)]" />
          <span className="text-xs text-[var(--ink-muted)]">SCORE:</span>
          <span className="text-sm font-bold text-[var(--ink)]">
            {scoreEstimate.toLocaleString()}
          </span>
        </div>
      </motion.div>

      {/* ===== STREAK COUNTER ===== */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="sketch-card-thin fixed bottom-4 right-4 z-50 px-4 py-2"
      >
        <div className="flex items-center gap-2 font-[var(--font-mono)]">
          <Target className="h-4 w-4 text-[var(--ink)]" />
          <span className="text-xs text-[var(--ink-muted)]">STREAK:</span>
          <span className="text-sm font-bold text-[var(--ink)]">{streak}x</span>
          {bestStreak > 0 && (
            <span className="text-xs text-[var(--ink-faint)]">({bestStreak} BEST)</span>
          )}
        </div>
      </motion.div>

      {/* ===== HEADER ===== */}
      {phase !== 2 && (
        <div className="mx-auto mb-8 max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.span
                key={phase}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="stamp"
              >
                PHASE {phase}
              </motion.span>
              <span className="font-[var(--font-mono)] text-sm text-[var(--ink-muted)]">
                QUESTION {currentQuestion + 1} OF {questions.length}
              </span>
            </div>
            <span className="hidden font-[var(--font-mono)] text-xs text-[var(--ink-faint)] md:block">
              {phaseInfo.name.toUpperCase()}
            </span>
          </div>
          <div className="meter-track w-full">
            <motion.div
              className="meter-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* ===== QUESTION AREA ===== */}
      {phase === 2 ? (
        <div className="mx-auto h-[calc(100vh-100px)] max-w-2xl">
          <Phase2Chat
            question={currentQ}
            onAnswer={handleAnswer}
            questionNumber={currentQuestion + 1}
            totalQuestions={questions.length}
            previousChoices={previousChoices}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion + (showCurveball ? "-c" : "")}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, type: "spring" }}
              className="sketch-card p-6 md:p-8"
            >
              {/* ===== CURVEBALL BADGE ===== */}
              {showCurveball && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 flex w-fit items-center gap-2 bg-[var(--ink)] px-3 py-1"
                >
                  <Sparkles className="h-4 w-4 text-[var(--paper)]" />
                  <span className="font-[var(--font-mono)] text-xs font-bold text-[var(--paper)]">
                    CURVEBALL
                  </span>
                </motion.div>
              )}

              {/* ===== PHASE BADGE ===== */}
              {phaseMeta.badge && (
                <div className="mb-4 flex items-center gap-2 font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--ink-muted)]">
                  {phaseMeta.badge}
                  <span>{phaseMeta.label}</span>
                  {phase === 5 && difficulty.timerReduction > 0 && (
                    <span className="animate-pulse font-bold text-[var(--ink)]">HARDER</span>
                  )}
                </div>
              )}

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-6 font-[var(--font-display)] text-2xl font-bold text-[var(--ink)] md:text-3xl"
              >
                {reverseText ? currentQ.text.split("").reverse().join("") : currentQ.text}
              </motion.h2>
              {currentQ.subtext && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="mb-6 font-[var(--font-mono)] text-xs italic text-[var(--ink-muted)]"
                >
                  {currentQ.subtext.toUpperCase()}
                </motion.p>
              )}

              {/* ===== OPTIONS ===== */}
              <div className={`relative space-y-3 ${shufflingOptions ? "animate-pulse" : ""}`}>
                {distractionActive && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[var(--paper-card)]/60 backdrop-blur-[1px]">
                    <span className="animate-pulse font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--ink)]">
                      FOCUS DISRUPTED
                    </span>
                  </div>
                )}
                {displayOrder.map((optionIndex, displayIndex) => {
                  const option = currentQ.options[optionIndex];
                  return (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + displayIndex * 0.08, type: "spring" }}
                      onClick={() => {
                        setSelectedOption(option.id);
                        handleAnswer(currentQ.id, option.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedOption(option.id);
                          handleAnswer(currentQ.id, option.id);
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Option ${String.fromCharCode(65 + displayIndex)}: ${option.text}`}
                      className={`sketch-option ${
                        selectedOption === option.id ? "sketch-option-selected" : ""
                      }`}
                    >
                      <span className="sketch-letter">
                        {String.fromCharCode(65 + displayIndex)}
                      </span>
                      <span
                        className={`flex-1 text-left text-base md:text-lg ${
                          selectedOption === option.id
                            ? "text-[var(--paper)]"
                            : "text-[var(--ink-soft)]"
                        }`}
                      >
                        {option.text}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* ===== PHASE-SPECIFIC WARNINGS ===== */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 flex items-center gap-2 font-[var(--font-mono)] text-xs text-[var(--ink-muted)]"
              >
                {phase === 3 && (
                  <>
                    <Skull className="h-4 w-4" />
                    <span>SOME OPTIONS ARE TRAPS. THE SYSTEM IS WATCHING YOUR EGO.</span>
                  </>
                )}
                {phase === 5 && (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>NO TIME TO THINK. TRUST YOUR INSTINCTS.</span>
                  </>
                )}
                {phase === 4 && (
                  <>
                    <Eye className="h-4 w-4" />
                    <span>THE AUDIENCE IS JUDGING YOUR EVERY MOVE.</span>
                  </>
                )}
                {phase === 1 && (
                  <>
                    <Brain className="h-4 w-4" />
                    <span>INVOLUNTARY RESPONSES ARE BEING LOGGED.</span>
                  </>
                )}
                <span className="font-bold text-[var(--ink)]">PRESS 1-4 TO ANSWER</span>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
