/* eslint-disable react-hooks/purity -- confetti particles use Math.random() for visual variety */
"use client";

import { useRef, useEffect, useState, useMemo, Suspense } from "react";
import { motion, animate, useInView } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Float } from "@react-three/drei";
import * as THREE from "three";
import {
  AuraTier,
  AuraAxis,
  TIERS,
  AuraScoreBreakdown,
  TruthMatrixEntry,
} from "@/lib/questions-new";
import {
  RotateCcw,
  Download,
  Share2,
  AlertTriangle,
  Shield,
  Clock,
  Zap,
  Target,
  Trophy,
  TrendingUp,
  Brain,
  Heart,
  Flame,
  Crown,
  Image as ImageIcon,
} from "lucide-react";
import { AnimeCharacter } from "@/components/Anime/AnimeCharacters";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HallOfFame } from "./HallOfFame";
import { saveAuraEntry } from "@/lib/auraHallOfFame";
import { downloadAuraShareCard } from "@/lib/auraShareCard";
import { generateAuraReasoning, StoredAnswer } from "@/lib/auraReasoning";

// ===== CANVAS ERROR BOUNDARY FOR WebGL CONTEXT LOSS =====
function CanvasErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="w-full h-full flex items-center justify-center text-[var(--ink-muted)] font-[var(--font-mono)] text-xs">
          3D UNAVAILABLE
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

type ResultsProps = {
  score: number;
  tier: AuraTier;
  axes: Record<AuraAxis, number>;
  breakdown: AuraScoreBreakdown;
  truthMatrix: TruthMatrixEntry[];
  responsePattern: {
    pattern: string;
    description: string;
    icon: string;
  };
  auraVelocity: number[];
  onRestart: () => void;
  saveEntry?: boolean;
  answers?: StoredAnswer[];
  bestStreak?: number;
  curveballCount?: number;
};

const INK = "#14110c";
const PAPER = "#fbfaf6";

// ===== COUNT-UP SCORE =====
function CountUp({ value, duration = 2 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

// ===== CONFETTI BURST (monochrome ink) =====
const CONFETTI_COLORS = [INK, "#3d382f", "#6f685c", "#a49b8a", "#ece8df", "#14110c"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        width: 5 + Math.random() * 6,
        height: 8 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        duration: 2.4 + Math.random() * 2,
        delay: Math.random() * 0.9,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: `${p.width}px`,
            height: `${p.height}px`,
            backgroundColor: p.color,
            opacity: 0,
            animation: `confetti-fall ${p.duration}s cubic-bezier(0.16, 1, 0.3, 1) ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ===== 3D AURA ORB =====
function AuraOrb3D({ color, intensity }: { color: string; intensity: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      const scale = 1 + Math.sin(t * 2) * 0.1 * intensity;
      ref.current.scale.setScalar(scale);
      ref.current.rotation.y = t * 0.5;
    }
    if (outerRef.current) {
      outerRef.current.rotation.x = t * 0.3;
      outerRef.current.rotation.z = t * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
      {/* Core */}
      <mesh ref={ref}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.85}
          emissive={color}
          emissiveIntensity={intensity}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
          emissive="#ffffff"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* Outer aura */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.12}
          emissive={color}
          emissiveIntensity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Float>
  );
}

function AuraScene({ color, intensity }: { color: string; intensity: number }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color={color} />
      <pointLight position={[-5, -5, 5]} intensity={0.4} color="#ffffff" />
      <AuraOrb3D color={color} intensity={intensity} />
      <Sparkles count={120} scale={10} size={2.5} speed={1} opacity={0.6} color="#14110c" />
    </>
  );
}

// ===== 5-AXIS RADAR CHART =====
function AxisRadar({ axes }: { axes: Record<AuraAxis, number> }) {
  const centerX = 150;
  const centerY = 150;
  const maxRadius = 110;

  const axisOrder: AuraAxis[] = ["presence", "composure", "fluidity", "desperation", "fumble"];
  const axisLabels = ["Presence", "Composure", "Fluidity", "Desperation", "Fumble"];
  const axisColors = [INK, "#3d382f", "#4d463b", "#6f685c", "#14110c"];

  const normalizedAxes = axisOrder.map((axis) => {
    const raw = axes[axis] || 0;
    const isNegative = axis === "desperation" || axis === "fumble";
    const normalized = isNegative
      ? Math.min(100, Math.max(0, 50 - raw / 2))
      : Math.min(100, Math.max(0, 50 + raw / 2));
    return normalized;
  });

  const points = normalizedAxes.map((value, i) => {
    const angle = (i / axisOrder.length) * Math.PI * 2 - Math.PI / 2;
    const radius = (value / 100) * maxRadius;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      labelX: centerX + Math.cos(angle) * (maxRadius + 30),
      labelY: centerY + Math.sin(angle) * (maxRadius + 30),
      value,
    };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative">
      <svg viewBox="0 0 300 300" className="w-full h-full max-w-sm mx-auto">
        {/* Grid */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={axisOrder
              .map((_, i) => {
                const angle = (i / axisOrder.length) * Math.PI * 2 - Math.PI / 2;
                const r = maxRadius * level;
                return `${centerX + Math.cos(angle) * r},${centerY + Math.sin(angle) * r}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(20,17,12,0.15)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axisOrder.map((_, i) => {
          const angle = (i / axisOrder.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={centerX + Math.cos(angle) * maxRadius}
              y2={centerY + Math.sin(angle) * maxRadius}
              stroke="rgba(20,17,12,0.15)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill="url(#radarGradient)"
          stroke={INK}
          strokeWidth="2"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="6"
            fill={axisColors[i]}
            stroke={PAPER}
            strokeWidth="2"
          />
        ))}

        {/* Labels */}
        {points.map((p, i) => (
          <g key={`label-${i}`}>
            <text
              x={p.labelX}
              y={p.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={INK}
              fontSize="8"
              fontWeight="600"
            >
              {axisLabels[i]}
            </text>
            <text
              x={p.labelX}
              y={p.labelY + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={axisColors[i]}
              fontSize="10"
              fontWeight="bold"
            >
              {Math.round(p.value)}%
            </text>
          </g>
        ))}

        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={INK} stopOpacity="0.25" />
            <stop offset="100%" stopColor={INK} stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ===== AURA VELOCITY LINE GRAPH =====
function AuraVelocityGraph({ velocity }: { velocity: number[] }) {
  const maxScore = Math.max(...velocity, 1);
  const minScore = Math.min(...velocity, 0);
  const range = maxScore - minScore || 1;

  const width = 600;
  const height = 200;
  const padding = 40;

  const points = velocity.map((score, i) => ({
    x: padding + (i / (velocity.length - 1)) * (width - padding * 2),
    y: padding + ((maxScore - score) / range) * (height - padding * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((level) => (
          <line
            key={level}
            x1={padding}
            y1={padding + level * (height - padding * 2)}
            x2={width - padding}
            y2={padding + level * (height - padding * 2)}
            stroke="rgba(20,17,12,0.08)"
            strokeWidth="1"
          />
        ))}

        {/* Zero line */}
        <line
          x1={padding}
          y1={padding + (maxScore / range) * (height - padding * 2)}
          x2={width - padding}
          y2={padding + (maxScore / range) * (height - padding * 2)}
          stroke="rgba(20,17,12,0.25)"
          strokeWidth="1"
          strokeDasharray="4"
        />

        {/* Gradient fill */}
        <defs>
          <linearGradient id="velocityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={INK} stopOpacity="0.2" />
            <stop offset="100%" stopColor={INK} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d={`${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
          fill="url(#velocityGradient)"
        />

        {/* Line */}
        <path d={linePath} fill="none" stroke={INK} strokeWidth="2" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={INK}
            stroke={PAPER}
            strokeWidth="1"
          />
        ))}

        {/* Axis labels */}
        <text x={padding} y={height - 10} fill="rgba(20,17,12,0.4)" fontSize="10" fontFamily="monospace">
          Q1
        </text>
        <text x={width - padding - 10} y={height - 10} fill="rgba(20,17,12,0.4)" fontSize="10" fontFamily="monospace">
          Q50
        </text>
        <text x={5} y={padding + 5} fill="rgba(20,17,12,0.4)" fontSize="10" fontFamily="monospace">
          {Math.round(maxScore)}
        </text>
        <text x={5} y={height - padding + 5} fill="rgba(20,17,12,0.4)" fontSize="10" fontFamily="monospace">
          {Math.round(minScore)}
        </text>
      </svg>
    </div>
  );
}

// ===== POWER LEVEL METER =====
function PowerLevelMeter({ score }: { score: number }) {
  const normalizedScore = Math.min(100, Math.max(0, ((score + 5000) / 23000) * 100));

  return (
    <div className="relative">
      <div className="meter-track overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${normalizedScore}%` }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="meter-fill"
        />
      </div>
      <div className="mt-2 flex justify-between font-[var(--font-mono)] text-xs">
        <span className="text-[var(--ink-muted)]">NOOB</span>
        <span className="text-[var(--ink-muted)]">ULTIMATE BEAST</span>
      </div>
    </div>
  );
}

// ===== TRUTH MATRIX TABLE =====
function TruthMatrixTable({ truthMatrix }: { truthMatrix: TruthMatrixEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-[var(--ink)]">
            <th className="py-3 px-4 text-left font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--ink)]">Q#</th>
            <th className="py-3 px-4 text-left font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--ink)]">RESPONSE TIME</th>
            <th className="py-3 px-4 text-left font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--ink)]">INSTINCT VELOCITY</th>
            <th className="py-3 px-4 text-left font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--ink)]">CONSISTENT</th>
            <th className="py-3 px-4 text-left font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--ink)]">HONEYPOT</th>
          </tr>
        </thead>
        <tbody>
          {truthMatrix.slice(0, 10).map((entry, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border-b border-[var(--ink-line-faint)] hover:bg-[var(--paper-deep)] transition-colors"
            >
              <td className="py-3 px-4 font-[var(--font-mono)] text-[var(--ink-soft)]">Q{entry.questionId}</td>
              <td className="py-3 px-4 font-[var(--font-mono)] text-[var(--ink)]">{entry.responseTimeMs}ms</td>
              <td className="py-3 px-4 font-[var(--font-mono)] text-[var(--ink-soft)]">{entry.instinctVelocity.toFixed(1)}</td>
              <td className="py-3 px-4">
                {entry.isConsistent ? (
                  <span className="font-bold text-[var(--ink)]">✓</span>
                ) : (
                  <span className="font-bold text-[var(--ink-muted)]">✗</span>
                )}
              </td>
              <td className="py-3 px-4">
                {entry.honeypotTriggered ? (
                  <span className="font-bold text-[var(--ink)]">⚠</span>
                ) : (
                  <span className="text-[var(--ink-faint)]">—</span>
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      {truthMatrix.length > 10 && (
        <p className="mt-4 text-center font-[var(--font-mono)] text-sm text-[var(--ink-muted)]">
          SHOWING 10 OF {truthMatrix.length} ENTRIES
        </p>
      )}
    </div>
  );
}

// ===== SECTION HEADER =====
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="ink-divider mb-6">
      <span className="font-[var(--font-display)] text-xl font-black uppercase text-[var(--ink)] md:text-2xl">
        {title}
      </span>
      <span className="text-[var(--ink)]">{icon}</span>
    </div>
  );
}

// ===== MAIN RESULTS DASHBOARD =====
export function AuraResultsDashboard({
  score,
  tier,
  axes,
  breakdown,
  truthMatrix,
  responsePattern,
  auraVelocity,
  onRestart,
  saveEntry = true,
  answers,
  bestStreak,
  curveballCount,
}: ResultsProps) {
  const tierInfo = TIERS[tier];
  const [copied, setCopied] = useState(false);

  // Aura Intelligence reasoning case file
  const reasoning = useMemo(
    () =>
      generateAuraReasoning({
        score,
        tier,
        axes,
        breakdown,
        truthMatrix,
        responsePattern,
        answers,
        bestStreak,
        curveballCount,
      }),
    [score, tier, axes, breakdown, truthMatrix, responsePattern, answers, bestStreak, curveballCount]
  );

  // Save this result to the Hall of Fame once
  useEffect(() => {
    if (!saveEntry) return;
    saveAuraEntry({
      mode: "full",
      tier,
      emoji: tierInfo.emoji,
      label: tierInfo.name,
      score,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Truth score calculation
  const truthScore = truthMatrix.length > 0
    ? (truthMatrix.filter((t) => t.isConsistent).length / truthMatrix.length) * 100
    : 0;
  const honeypotTriggers = truthMatrix.filter((t) => t.honeypotTriggered).length;

  // Response time stats
  const avgResponseTime = truthMatrix.length > 0
    ? truthMatrix.reduce((sum, t) => sum + t.responseTimeMs, 0) / truthMatrix.length
    : 0;
  const fastestResponse = truthMatrix.length > 0
    ? Math.min(...truthMatrix.map((t) => t.responseTimeMs))
    : 0;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-6xl mx-auto px-4 relative z-10"
    >
      <Confetti />
      {/* Tier Header with Anime Character */}
      <motion.div variants={item} className="text-center">
        <motion.div
          className="stamp mx-auto mb-8"
          animate={{ rotate: [-1.2, 1.2, -1.2] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            PSYCHOMETRIC EVALUATION COMPLETE
          </span>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
          {/* Anime character */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.5 }}
          >
            <AnimeCharacter tier={tier} size={180} />
          </motion.div>

          <div className="text-center md:text-left">
            <h1 className="mb-4 font-[var(--font-display)] text-5xl font-black text-[var(--ink)] md:text-7xl">
              <span className="mr-4">{tierInfo.emoji}</span>
              <span className="sketch-underline">{tierInfo.name}</span>
            </h1>
            <p className="mb-4 max-w-2xl text-xl leading-relaxed text-[var(--ink-soft)]">
              {tierInfo.description}
            </p>
            <div className="sketch-card-thin inline-flex items-center gap-4 px-8 py-4">
              <span className="font-[var(--font-mono)] text-sm uppercase tracking-wider text-[var(--ink-muted)]">
                Final Score
              </span>
              <motion.span
                className="text-4xl font-black font-[var(--font-mono)] text-[var(--ink)]"
                animate={{
                  textShadow: [
                    "0 0 0 rgba(20,17,12,0)",
                    "0 0 12px rgba(20,17,12,0.35)",
                    "0 0 0 rgba(20,17,12,0)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CountUp value={score} />
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Power Level Meter */}
      <motion.div variants={item}>
        <SectionHeader icon={<Flame className="h-5 w-5" />} title="Power Level Assessment" />
        <div className="sketch-card p-6">
          <PowerLevelMeter score={score} />
        </div>
      </motion.div>

      {/* 3D Aura Orb */}
      <motion.div variants={item} className="flex justify-center">
        <div className="sketch-card h-80 w-80 overflow-hidden">
          <CanvasErrorBoundary>
            <Canvas
              camera={{ position: [0, 0, 5], fov: 50 }}
              dpr={[1, 1.5]}
              gl={{ antialias: true, alpha: true }}
              onCreated={({ gl }) => {
                gl.setClearColor(0x000000, 0);
              }}
            >
              <Suspense fallback={null}>
                <AuraScene
                  color={tierInfo.color}
                  intensity={Math.min(Math.abs(score) / 10000, 1)}
                />
              </Suspense>
            </Canvas>
          </CanvasErrorBoundary>
        </div>
      </motion.div>

      {/* 5-Axis Radar */}
      <motion.div variants={item}>
        <SectionHeader icon={<Brain className="h-5 w-5" />} title="5-Axis Aura Vector" />
        <div className="sketch-card p-6">
          <AxisRadar axes={axes} />
        </div>
      </motion.div>

      {/* Expanded Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: <Shield className="h-6 w-6" />,
            label: "Truth Score",
            value: `${Math.round(truthScore)}%`,
            description: "Consistency rating",
          },
          {
            icon: <AlertTriangle className="h-6 w-6" />,
            label: "Honeypots Caught",
            value: `${honeypotTriggers}`,
            description: "Traps detected",
          },
          {
            icon: <Zap className="h-6 w-6" />,
            label: "Avg Response",
            value: `${Math.round(avgResponseTime)}ms`,
            description: "Reaction speed",
          },
          {
            icon: <Clock className="h-6 w-6" />,
            label: "Fastest Response",
            value: `${fastestResponse}ms`,
            description: "Peak performance",
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            className="sketch-card-thin p-5 text-center group"
            whileHover={{ y: -5, scale: 1.02 }}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] group-hover:scale-110 transition-transform">
              {stat.icon}
            </div>
            <p className="mb-1 font-[var(--font-mono)] text-xs uppercase tracking-wider text-[var(--ink-muted)]">
              {stat.label}
            </p>
            <p className="text-xl font-bold font-[var(--font-mono)] text-[var(--ink)]">{stat.value}</p>
            <p className="mt-1 text-xs text-[var(--ink-faint)]">{stat.description}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Aura Velocity Graph */}
      <motion.div variants={item}>
        <SectionHeader icon={<TrendingUp className="h-5 w-5" />} title="Aura Velocity Journey" />
        <div className="sketch-card p-6">
          <AuraVelocityGraph velocity={auraVelocity} />
        </div>
      </motion.div>

      {/* Truth Matrix Table */}
      <motion.div variants={item}>
        <SectionHeader icon={<Heart className="h-5 w-5" />} title="Truth Matrix Analysis" />
        <div className="sketch-card p-6">
          <TruthMatrixTable truthMatrix={truthMatrix} />
        </div>
      </motion.div>

      {/* Hall of Fame */}
      <motion.div variants={item}>
        <SectionHeader icon={<Trophy className="h-5 w-5" />} title="Hall of Fame" />
        <HallOfFame />
      </motion.div>

      {/* Score Breakdown */}
      <motion.div variants={item}>
        <SectionHeader icon={<Trophy className="h-5 w-5" />} title="Score Breakdown" />
        <div className="sketch-card p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sketch-card-thin p-4 text-center">
              <p className="mb-1 font-[var(--font-mono)] text-sm text-[var(--ink-muted)]">PRESENCE</p>
              <p className="text-2xl font-bold font-[var(--font-mono)] text-[var(--ink)]">+{Math.round(breakdown.presenceBonus)}</p>
            </div>
            <div className="sketch-card-thin p-4 text-center">
              <p className="mb-1 font-[var(--font-mono)] text-sm text-[var(--ink-muted)]">COMPOSURE</p>
              <p className="text-2xl font-bold font-[var(--font-mono)] text-[var(--ink)]">+{Math.round(breakdown.composureBonus)}</p>
            </div>
            <div className="sketch-card-thin p-4 text-center">
              <p className="mb-1 font-[var(--font-mono)] text-sm text-[var(--ink-muted)]">FLUIDITY</p>
              <p className="text-2xl font-bold font-[var(--font-mono)] text-[var(--ink)]">+{Math.round(breakdown.fluidityBonus)}</p>
            </div>
            <div className="sketch-card-thin p-4 text-center">
              <p className="mb-1 font-[var(--font-mono)] text-sm text-[var(--ink-muted)]">STREAK MULTIPLIER</p>
              <p className="text-2xl font-bold font-[var(--font-mono)] text-[var(--ink)]">×{breakdown.streakMultiplier.toFixed(2)}</p>
            </div>
          </div>
          <div className="sketch-card-thin mt-4 p-4">
            <div className="flex justify-between items-center">
              <span className="font-[var(--font-mono)] text-sm font-bold text-[var(--ink)]">INAUTHENTICITY TAX</span>
              <span className="text-lg font-bold font-[var(--font-mono)] text-[var(--ink)]">-{Math.round(breakdown.inauthenticityTax)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Narrative */}
      <motion.div variants={item} className="sketch-card p-8 text-center">
        <div className="mb-4 text-6xl">{tierInfo.emoji}</div>
        <SectionHeader icon={<Crown className="h-6 w-6" />} title="Your Aura Narrative" />
        <p className="mx-auto max-w-3xl font-[var(--font-display)] text-lg italic leading-relaxed text-[var(--ink-soft)]">
          &ldquo;{tierInfo.narrative}&rdquo;
        </p>
      </motion.div>

      {/* Response Pattern */}
      <motion.div variants={item} className="sketch-card-thin p-8 text-center">
        <div className="mb-4 text-5xl">{responsePattern.icon}</div>
        <h4 className="mb-3 font-[var(--font-display)] text-2xl font-black uppercase text-[var(--ink)]">
          {responsePattern.pattern} Response Pattern
        </h4>
        <p className="mx-auto max-w-lg text-lg text-[var(--ink-soft)]">
          {responsePattern.description}
        </p>
      </motion.div>

      {/* Aura Intelligence Case File */}
      <motion.div variants={item} className="sketch-card-ink relative overflow-hidden p-8 text-[var(--paper)]">
        <div className="crosshatch absolute inset-0 opacity-20" />
        <div className="relative z-10">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h3 className="font-[var(--font-display)] text-2xl font-black uppercase text-[var(--paper)] md:text-3xl">
              <span className="sketch-underline">Aura Intelligence Case File</span>
            </h3>
            <div className="sketch-card-thin border-[var(--paper)]/40 px-5 py-3 text-center">
              <p className="font-[var(--font-mono)] text-xs tracking-widest text-[var(--paper-deep)]">
                SIGNAL PURITY
              </p>
              <p className="font-[var(--font-mono)] text-3xl font-black text-[var(--paper)]">
                {reasoning.intelligence}
                <span className="text-lg text-[var(--paper-deep)]">/100</span>
              </p>
              <p className="font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--paper)]">
                {reasoning.intelligenceLabel}
              </p>
            </div>
          </div>

          <div className="meter-track mb-6">
            <motion.div
              className="meter-fill bg-[var(--paper)]"
              initial={{ width: 0 }}
              animate={{ width: `${reasoning.intelligence}%` }}
              transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
            />
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="stamp">{reasoning.dominantTrait.emoji}</span>
            <span className="font-[var(--font-mono)] text-lg font-black tracking-widest text-[var(--paper)]">
              DOMINANT TRAIT: {reasoning.dominantTrait.name}
            </span>
          </div>

          <p className="mb-8 max-w-3xl font-[var(--font-display)] text-lg italic leading-relaxed text-[var(--paper-deep)]">
            &ldquo;{reasoning.verdict}&rdquo;
          </p>

          <h4 className="mb-4 font-[var(--font-mono)] text-sm font-bold tracking-widest text-[var(--paper)]">
            EVIDENCE
          </h4>
          <ul className="mb-8 space-y-3">
            {reasoning.evidence.map((e, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-start gap-3 text-[var(--paper-deep)]"
              >
                <span className="mt-0.5 shrink-0 font-[var(--font-mono)] text-[var(--paper)]">
                  {e.type === "positive" ? "+" : e.type === "negative" ? "−" : "·"}
                </span>
                <span>
                  <span className="font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--paper)]">
                    {e.title}:
                  </span>{" "}
                  {e.detail}
                </span>
              </motion.li>
            ))}
          </ul>

          <h4 className="mb-3 font-[var(--font-mono)] text-sm font-bold tracking-widest text-[var(--paper)]">
            COUNTERMEASURE
          </h4>
          <p className="max-w-3xl text-[var(--paper-deep)]">{reasoning.countermeasure}</p>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 pb-8"
      >
        <motion.button
          onClick={onRestart}
          className="sketch-btn"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Retake the aura test"
        >
          <RotateCcw className="h-6 w-6" />
          RETAKE TEST
        </motion.button>

        <motion.button
          onClick={() => {
            const data = JSON.stringify({ score, tier, axes, breakdown }, null, 2);
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "aura-result.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="sketch-btn sketch-btn-outline"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Export aura results as JSON"
        >
          <Download className="h-6 w-6" />
          EXPORT RESULTS
        </motion.button>

        <motion.button
          onClick={async () => {
            const shareData = {
              title: `I'm a ${tierInfo.name}!`,
              text: `My aura score: ${score.toLocaleString()}. I'm a ${tierInfo.emoji} ${tierInfo.name}! Take the test yourself!`,
              url: window.location.href,
            };
            try {
              if (navigator.share) {
                await navigator.share(shareData);
              } else {
                await navigator.clipboard.writeText(
                  `${shareData.text}\n${shareData.url}`
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            } catch {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                // Final fallback
              }
            }
          }}
          className="sketch-btn sketch-btn-outline"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Share your aura result"
        >
          <Share2 className="h-6 w-6" />
          {copied ? "COPIED!" : "SHARE"}
        </motion.button>

        <motion.button
          onClick={async () => {
            try {
              await downloadAuraShareCard({
                score,
                tierName: tierInfo.name,
                emoji: tierInfo.emoji,
                color: tierInfo.color,
                mode: "full",
              });
            } catch {
              // canvas unavailable
            }
          }}
          className="sketch-btn sketch-btn-outline"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Save your aura share card image"
        >
          <ImageIcon className="h-6 w-6" />
          SAVE IMAGE
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
