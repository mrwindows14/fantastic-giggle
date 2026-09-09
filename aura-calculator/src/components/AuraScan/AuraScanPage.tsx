/* eslint-disable react-hooks/purity -- visual variety uses Math.random() */
/* eslint-disable @next/next/no-img-element -- local blob URLs can't use next/image */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, ScanLine, RefreshCw, Share2, Check, X, Camera, Video, Aperture, ImageDown } from "lucide-react";
import { analyzeImage, AuraReading } from "@/lib/auraScan";
import { saveAuraEntry } from "@/lib/auraHallOfFame";
import { downloadAuraShareCard } from "@/lib/auraShareCard";

type Phase = "upload" | "scanning" | "result";

const METERS = [
  { key: "energy" as const, label: "AURA ENERGY" },
  { key: "saturation" as const, label: "VIBRANCY" },
  { key: "brightness" as const, label: "PRESENCE" },
  { key: "stability" as const, label: "STABILITY" },
];

export function AuraScanPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reading, setReading] = useState<AuraReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Release the camera stream when the page unmounts
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Log completed readings to the Hall of Fame once
  const savedScanRef = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== "result" || !reading) return;
    const key = `${reading.seed}-${reading.chadPoints}`;
    if (savedScanRef.current === key) return;
    savedScanRef.current = key;
    saveAuraEntry({
      mode: "scan",
      tier: reading.auraName,
      emoji: reading.elements[0] || "👁️",
      label: reading.auraName,
      score: reading.chadPoints,
    });
  }, [phase, reading]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera not supported in this browser. Upload a photo instead.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setError("Camera access denied. Grant permission or upload a photo instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const handleFile = useCallback((f: File | null | undefined) => {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("That's not an image. The scanner only reads images.");
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setError("Image too large (max 12MB).");
      return;
    }
    const url = URL.createObjectURL(f);
    setImageUrl(url);
    setFile(f);
    setPhase("upload");
    setReading(null);
    setProgress(0);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "aura-snapshot.png", { type: "image/png" });
      stopCamera();
      handleFile(file);
    }, "image/png");
  }, [stopCamera, handleFile]);

  const handleScan = useCallback(async () => {
    if (!file) return;
    setPhase("scanning");
    setProgress(0);

    // Scanning animation
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + Math.random() * 18;
          if (next >= 100) {
            clearInterval(interval);
            setTimeout(resolve, 250);
            return 100;
          }
          return next;
        });
      }, 130);
    });

    try {
      const result = await analyzeImage(file);
      setReading(result);
      setPhase("result");
    } catch {
      setError("The scanner failed to read your aura. Try another image.");
      setPhase("upload");
    }
  }, [file]);

  const handleShare = async () => {
    if (!reading) return;
    const text = `I scanned my aura: ${reading.auraName} — ${reading.chadPoints.toLocaleString()} Chad Points!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Aura Scan", text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled share
    }
  };

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setFile(null);
    setReading(null);
    setProgress(0);
    setPhase("upload");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--paper)] paper-grain">
      {/* Ambient sketch backdrop */}
      <div className="halftone absolute inset-0 opacity-30" />
      <div className="crosshatch-soft absolute inset-0" />

      <div className="relative z-10 mx-auto max-w-3xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="sketch-btn sketch-btn-outline text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> BACK
          </button>
          <span className="stamp">AURA SCAN v1.0</span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-center font-[var(--font-display)] text-5xl font-black uppercase md:text-7xl"
        >
          <span className="sketch-underline">Scan your aura</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mb-12 max-w-xl text-center text-[var(--ink-soft)]"
        >
          Upload a photo. The scanner reads the{" "}
          <span className="font-bold text-[var(--ink)]">energy wavelengths</span> in your
          image and converts them into{" "}
          <span className="font-bold text-[var(--ink)]">Chad Points</span>.{" "}
          <span className="font-[var(--font-mono)] text-sm text-[var(--ink-muted)]">
            100% CLIENT-SIDE — NOTHING IS UPLOADED.
          </span>
        </motion.p>

        <AnimatePresence mode="wait">
          {/* ===== UPLOAD ===== */}
          {phase === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className={`relative cursor-pointer rounded-[2rem] border-2 border-dashed p-12 text-center transition-all duration-300 ${
                  dragOver
                    ? "border-[var(--ink)] bg-[var(--paper-deep)] shadow-[0_20px_40px_-18px_rgba(23,19,12,0.35)] scale-[1.01]"
                    : "border-[var(--ink-line)] bg-[var(--paper-card)] hover:bg-[var(--paper-deep)]"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {imageUrl ? (
                  <div className="flex flex-col items-center gap-4">
                    <img
                      src={imageUrl}
                      alt="Selected"
                      className="sketch-card h-40 w-40 object-cover"
                    />
                    <p className="font-bold text-[var(--ink)]">{file?.name}</p>
                    <span className="font-[var(--font-mono)] text-sm text-[var(--ink-muted)]">
                      CLICK TO CHANGE IMAGE
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--paper)] shadow-[0_14px_28px_-12px_rgba(23,19,12,0.45)]"
                    >
                      <Camera className="h-9 w-9" />
                    </motion.div>
                    <div>
                      <p className="text-xl font-black text-[var(--ink)]">DROP YOUR PHOTO HERE</p>
                      <p className="mt-1 font-[var(--font-mono)] text-sm text-[var(--ink-muted)]">
                        OR CLICK TO BROWSE — JPG, PNG, GIF, WEBP
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-center gap-2 text-sm text-[var(--ink)]"
                >
                  <X className="h-4 w-4" /> {error}
                </motion.p>
              )}

              <motion.button
                onClick={handleScan}
                disabled={!file}
                whileHover={file ? { scale: 1.04 } : {}}
                whileTap={file ? { scale: 0.96 } : {}}
                className={`w-full py-5 text-xl font-black ${
                  file
                    ? "sketch-btn text-lg"
                    : "cursor-not-allowed rounded-full border border-[var(--ink-line-faint)] bg-transparent text-[var(--ink-faint)]"
                }`}
              >
                <ScanLine className="h-6 w-6" /> SCAN MY AURA
              </motion.button>

              <motion.button
                onClick={startCamera}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="sketch-btn sketch-btn-outline w-full py-4 text-base"
              >
                <Video className="h-5 w-5" /> USE LIVE CAMERA
              </motion.button>
            </motion.div>
          )}

          {/* ===== SCANNING ===== */}
          {phase === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 text-center"
            >
              <div className="relative mx-auto mb-10 h-56 w-56 overflow-hidden sketch-card">
                {imageUrl && <img src={imageUrl} alt="Scanning" className="h-full w-full object-cover" />}
                <div className="animate-scan-beam absolute left-0 right-0 h-1 bg-[var(--ink)] shadow-[0_0_16px_rgba(20,17,12,0.6)]" />
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--paper-deep)]/40">
                  <div className="h-16 w-16 animate-spin border-4 border-[var(--ink)] border-t-transparent" />
                </div>
              </div>

              <div className="mx-auto max-w-md">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-[var(--font-mono)] text-sm tracking-widest text-[var(--ink)]">
                    READING WAVELENGTHS...
                  </span>
                  <span className="font-[var(--font-mono)] text-[var(--ink-soft)]">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="meter-track w-full">
                  <motion.div
                    className="meter-fill"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <div className="mt-4 flex justify-between font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">
                  <span>CALIBRATING... DONE</span>
                  <span>PIXEL ENERGY... DONE</span>
                  <span>CHAD CONVERSION... {progress > 80 ? "DONE" : "RUNNING"}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== RESULT ===== */}
          {phase === "result" && reading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Aura color card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="sketch-card p-8 text-center"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${reading.auraColor}1f, var(--paper-card) 70%)`,
                }}
              >
                {/* Aura orb */}
                <div className="relative mx-auto mb-6 h-40 w-40">
                  <div
                    className="animate-breathe absolute inset-0 rounded-full opacity-70 blur-2xl"
                    style={{ backgroundColor: reading.auraColor }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: reading.auraColor,
                      boxShadow: `0 0 60px ${reading.auraColor}, 0 0 120px ${reading.auraColor}66`,
                    }}
                    animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: `${reading.auraColor}80` }}
                  />
                </div>

                <h2
                  className="mb-2 font-[var(--font-display)] text-4xl font-black md:text-5xl"
                  style={{ color: reading.auraColor, textShadow: `0 0 30px ${reading.auraColor}66` }}
                >
                  {reading.auraName}
                </h2>
                <div className="mb-4 flex justify-center gap-2 text-2xl">
                  {reading.elements.map((e, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.15, type: "spring" }}
                    >
                      {e}
                    </motion.span>
                  ))}
                </div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mx-auto max-w-lg font-[var(--font-display)] italic text-[var(--ink-soft)]"
                >
                  &ldquo;{reading.verdict}&rdquo;
                </motion.p>
              </motion.div>

              {/* Chad points */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="sketch-card p-8 text-center"
              >
                <p className="stamp mb-4">CALCULATED CHAD POINTS</p>
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1, type: "spring", stiffness: 120 }}
                  className="font-[var(--font-mono)] text-6xl font-black text-[var(--ink)] md:text-7xl"
                >
                  {reading.chadPoints.toLocaleString()}
                </motion.p>
                <p className="mt-2 text-sm text-[var(--ink-muted)]">
                  Chad Points earned from your aura wavelengths
                </p>
              </motion.div>

              {/* Meters */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {METERS.map((meter, i) => (
                  <motion.div
                    key={meter.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 + i * 0.1 }}
                    className="sketch-card-thin p-5"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-[var(--font-mono)] text-xs font-bold tracking-widest text-[var(--ink-muted)]">
                        {meter.label}
                      </span>
                      <span className="font-[var(--font-mono)] text-sm font-bold" style={{ color: reading.auraColor }}>
                        {Math.round(reading[meter.key] * 100)}%
                      </span>
                    </div>
                    <div className="meter-track">
                      <motion.div
                        className="meter-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${reading[meter.key] * 100}%` }}
                        transition={{ delay: 1.3 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Spectral readout */}
              {reading.spectrum.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="sketch-card p-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-[var(--font-mono)] text-sm font-bold tracking-widest text-[var(--ink)]">
                      SPECTRAL READOUT
                    </h3>
                    <span className="font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">
                      DOMINANT WAVELENGTHS
                    </span>
                  </div>
                  <div className="space-y-3">
                    {reading.spectrum.map((band, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-[var(--ink-line)]"
                          style={{ backgroundColor: band.color }}
                        />
                        <span className="w-16 shrink-0 font-[var(--font-mono)] text-xs font-bold text-[var(--ink)]">
                          {Math.round(band.hue)}°
                        </span>
                        <div className="meter-track flex-1">
                          <motion.div
                            className="meter-fill"
                            style={{ backgroundColor: band.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${band.weight * 100}%` }}
                            transition={{ delay: 1.6 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">
                          {Math.round(band.weight * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Strengths / Weaknesses */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.4 }}
                  className="sketch-card p-6"
                >
                  <h3 className="mb-4 text-lg font-black text-[var(--ink)]">STRENGTHS</h3>
                  <ul className="space-y-3">
                    {reading.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[var(--ink-soft)]">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink)]" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 }}
                  className="sketch-card p-6"
                >
                  <h3 className="mb-4 text-lg font-black text-[var(--ink)]">DETECTED FLAWS</h3>
                  <ul className="space-y-3">
                    {reading.weaknesses.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[var(--ink-soft)]">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink)]" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <motion.button
                  onClick={handleShare}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="sketch-btn flex-1"
                >
                  <Share2 className="h-5 w-5" /> {copied ? "COPIED!" : "SHARE RESULT"}
                </motion.button>
                <motion.button
                  onClick={async () => {
                    try {
                      await downloadAuraShareCard({
                        score: reading.chadPoints,
                        tierName: reading.auraName,
                        emoji: reading.elements[0] || "👁️",
                        color: reading.auraColor,
                        mode: "scan",
                        label: "CHAD POINTS",
                      });
                    } catch {
                      // card generation unsupported — ignore
                    }
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="sketch-btn flex-1"
                >
                  <ImageDown className="h-5 w-5" /> SAVE IMAGE
                </motion.button>
                <motion.button
                  onClick={reset}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="sketch-btn sketch-btn-outline flex-1"
                >
                  <RefreshCw className="h-5 w-5" /> SCAN ANOTHER
                </motion.button>
                <motion.button
                  onClick={() => router.push("/")}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="sketch-btn flex-1"
                >
                  <Upload className="h-5 w-5" /> TAKE THE EXAM
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== LIVE CAMERA OVERLAY ===== */}
      <AnimatePresence>
        {cameraActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--ink)]"
          >
            <div className="flex items-center justify-between p-4">
              <span className="stamp">LIVE CAMERA</span>
              <button
                onClick={stopCamera}
                className="sketch-btn sketch-btn-outline text-sm text-[var(--paper)]"
                aria-label="Close camera"
              >
                <X className="h-4 w-4" /> CANCEL
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current) {
                    el.srcObject = streamRef.current;
                  }
                }}
                autoPlay
                playsInline
                muted
                className="max-h-full w-full object-contain"
              />
              <div className="pointer-events-none absolute inset-4 border-2 border-dashed border-[var(--paper)]/50" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 border-2 border-[var(--paper)]/70">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[var(--ink)] px-2 font-[var(--font-mono)] text-[10px] font-bold tracking-widest text-[var(--paper)]">
                  CENTER YOUR AURA
                </span>
              </div>
              <canvas ref={captureCanvasRef} className="hidden" />
            </div>

            <div className="flex items-center justify-center gap-6 p-6">
              <motion.button
                onClick={capturePhoto}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--paper)] bg-[var(--paper)] shadow-[0_0_0_6px_rgba(251,250,246,0.25)]"
                aria-label="Capture photo"
              >
                <Aperture className="h-9 w-9 text-[var(--ink)]" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
