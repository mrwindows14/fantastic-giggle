"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Bot, User } from "lucide-react";
import { QuizQuestion } from "@/lib/questions-new";

type ChatMessage = {
  id: string;
  type: "system" | "user" | "typing";
  text: string;
  timestamp: number;
  optionId?: string;
  variant?: "recall";
};

type Phase2ChatProps = {
  question: QuizQuestion;
  onAnswer: (questionId: number, optionId: string) => void;
  questionNumber: number;
  totalQuestions: number;
  previousChoices?: string[];
};

// Typing indicator component
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      className="flex items-start gap-3 mb-4"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-[var(--ink)] bg-[var(--ink)]">
        <Bot className="h-4 w-4 text-[var(--paper)]" />
      </div>
      <div className="sketch-card-thin rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            className="h-2 w-2 rounded-full bg-[var(--ink)]"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            className="h-2 w-2 rounded-full bg-[var(--ink)]"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            className="h-2 w-2 rounded-full bg-[var(--ink)]"
          />
        </div>
      </div>
    </motion.div>
  );
}

// Chat message bubble component
function ChatBubble({ message }: { message: ChatMessage }) {
  const isSystem = message.type === "system";
  const isUser = message.type === "user";

  return (
    <motion.div
      initial={{ opacity: 0, x: isSystem ? -20 : 20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={`flex items-end gap-3 mb-4 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-[var(--ink)] ${
          isSystem ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-card)] text-[var(--ink)]"
        }`}
      >
        {isSystem ? (
          <Bot className="h-4 w-4" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`sketch-card-thin max-w-[80%] ${
          isUser ? "rounded-tr-sm" : "rounded-tl-sm"
        }`}
      >
        {/* Sender label */}
        <div
          className={`px-4 pt-2 font-[var(--font-mono)] text-xs font-bold tracking-widest ${
            message.variant === "recall"
              ? "text-[var(--ink-muted)]"
              : isSystem
                ? "text-[var(--ink)]"
                : "text-[var(--ink-muted)]"
          }`}
        >
          {message.variant === "recall"
            ? "SYSTEM · RECALL"
            : isSystem
              ? "SYSTEM"
              : "YOU"}
        </div>

        {/* Message content */}
        <div className="px-4 pb-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          {message.variant === "recall" ? (
            <>
              You previously answered: <span className="font-semibold text-[var(--ink)]">&ldquo;{message.text}&rdquo;</span>{" "}
              — the System never forgets.
            </>
          ) : (
            message.text
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Phase2Chat({ question, onAnswer, questionNumber, totalQuestions, previousChoices }: Phase2ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [recallCount, setRecallCount] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show typing indicator, then reveal the question
  useEffect(() => {
    setIsTyping(true);
    setSelectedOption(null);

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Aura System recall: reference an earlier answer before the next question
    const recalled =
      previousChoices && previousChoices.length > 0 && questionNumber > 1
        ? previousChoices[(questionNumber - 2) % previousChoices.length]
        : null;
    if (recalled) {
      setRecallCount((c) => c + 1);
      setMessages((prev) => [
        ...prev,
        {
          id: `recall-${question.id}`,
          type: "system",
          text: recalled,
          timestamp: Date.now(),
          variant: "recall",
        },
      ]);
    }

    // Add typing delay based on question length
    const typingDuration = Math.min(1000 + question.text.length * 15, 2500);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${question.id}`,
          type: "system",
          text: question.text,
          timestamp: Date.now(),
        },
      ]);
    }, typingDuration);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [question.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  const handleOptionSelect = (optionId: string) => {
    if (selectedOption) return; // Prevent double-clicks

    setSelectedOption(optionId);
    const selectedOptionData = question.options.find((o) => o.id === optionId);

    if (selectedOptionData) {
      // Add user message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${question.id}-${optionId}`,
          type: "user",
          text: selectedOptionData.text,
          timestamp: Date.now(),
          optionId,
        },
      ]);

      // Trigger the answer after a brief delay for the animation
      setTimeout(() => {
        onAnswer(question.id, optionId);
      }, 500);
    }
  };

  // ===== KEYBOARD ANSWERS (1-4) =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping || selectedOption) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const index = parseInt(e.key, 10) - 1;
      if (index < 0 || index >= question.options.length) return;
      const option = question.options[index];
      if (!option) return;
      e.preventDefault();
      handleOptionSelect(option.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, isTyping, selectedOption, handleOptionSelect]);

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="sketch-card-thin flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-[var(--ink)] bg-[var(--ink)]">
            <MessageSquare className="h-5 w-5 text-[var(--paper)]" />
          </div>
          <div>
            <div className="font-[var(--font-mono)] text-sm font-bold tracking-widest text-[var(--ink)]">
              AURA SYSTEM
            </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse bg-[var(--ink)]" />
          <span className="font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">ONLINE</span>
          {recallCount > 0 && (
            <span className="border border-dashed border-[var(--ink)] px-1.5 font-[var(--font-mono)] text-[10px] font-bold text-[var(--ink)]">
              RECALL×{recallCount}
            </span>
          )}
        </div>
          </div>
        </div>
        <div className="font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">
          Q{questionNumber}/{totalQuestions}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div
        ref={chatContainerRef}
        className="sketch-card-thin flex-1 space-y-2 overflow-y-auto p-4"
        style={{ maxHeight: "calc(100vh - 320px)" }}
      >
        {/* Welcome message (only show on first question) */}
        {questionNumber === 1 && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 py-2 text-center font-[var(--font-mono)] text-xs text-[var(--ink-faint)]"
          >
            CHAT HISTORY IS SAVED. PREVIOUS MESSAGES SCROLL UP.
          </motion.div>
        )}

        {/* Previous messages */}
        <AnimatePresence>
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>
      </div>

      {/* Options as Chat Input Buttons */}
      <div className="sketch-card-thin mt-2 p-4">
        <div className="mb-3 font-[var(--font-mono)] text-xs font-bold text-[var(--ink-muted)]">
          SELECT YOUR RESPONSE:
        </div>
        <div className="grid grid-cols-1 gap-2">
          {question.options.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.1, type: "spring" }}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOptionSelect(option.id)}
              disabled={selectedOption !== null}
              className={`w-full p-3 text-left transition-all duration-300 group ${
                selectedOption === option.id
                  ? "sketch-option sketch-option-selected"
                  : selectedOption !== null
                    ? "sketch-option opacity-50"
                    : "sketch-option"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="sketch-letter">{String.fromCharCode(65 + index)}</span>
                <span
                  className={`text-sm ${
                    selectedOption === option.id
                      ? "text-[var(--paper)]"
                      : "text-[var(--ink-soft)]"
                  }`}
                >
                  {option.text}
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Phase warning */}
        <div className="mt-4 flex items-center gap-2 font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">
          <span className="inline-block h-2 w-2 bg-[var(--ink)]" />
          <span>RESPONSE TIME AFFECTS YOUR SCORE. ANSWER NATURALLY.</span>
          <span className="ml-auto font-bold text-[var(--ink)]">PRESS 1-4</span>
        </div>
      </div>
    </div>
  );
}
