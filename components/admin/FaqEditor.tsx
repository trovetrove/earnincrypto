"use client";
/**
 * components/admin/FaqEditor.tsx
 * Fixed: single hidden input, stable state, no conflicts with parent forms.
 * Also hardened: always serializes to valid JSON (never empty string or undefined).
 */

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FaqItem = { question: string; answer: string };

function safeStringify(items: FaqItem[]): string {
  try {
    return JSON.stringify(items);
  } catch {
    return "[]";
  }
}

export function FaqEditor({ defaultValue = [] }: { defaultValue?: FaqItem[] }) {
  const [items, setItems] = useState<FaqItem[]>(defaultValue);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const add = () => {
    setItems(p => [...p, { question: "", answer: "" }]);
  };

  const remove = (i: number) => {
    setItems(p => p.filter((_, idx) => idx !== i));
    setCollapsed(p => {
      const s = new Set(p);
      s.delete(i);
      return s;
    });
  };

  const update = (i: number, field: "question" | "answer", val: string) => {
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };

  const toggle = (i: number) => {
    setCollapsed(p => {
      const s = new Set(p);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  };

  // Only include items that have at least a question — prevents sending
  // empty objects that could cause JSON parse issues on the server
  const validItems = items.filter(item => item.question.trim() !== "");

  return (
    <div className="space-y-2">
      {/* Always a valid JSON string — never empty, never undefined */}
      <input type="hidden" name="faqItems" value={safeStringify(validItems)} />

      {items.length === 0 && (
        <p className="text-xs text-white/20 pb-1">
          FAQ items appear on the tool page and in Google FAQ rich results. Add at least 3 for best SEO impact.
        </p>
      )}

      {items.map((item, i) => (
        <div key={i} className="border border-white/[0.08] bg-white/[0.02]">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-white/[0.08] font-mono text-[10px] font-bold text-white/40">
              {i + 1}
            </span>
            <span className="flex-1 truncate text-xs text-white/50">
              {item.question || <span className="italic text-white/25">Question {i + 1}</span>}
            </span>
            <button type="button" onClick={() => toggle(i)} className="text-white/20 hover:text-white/60 transition-colors p-1">
              {collapsed.has(i) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => remove(i)} className="text-white/20 hover:text-red-400 transition-colors p-1">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body — collapsible */}
          {!collapsed.has(i) && (
            <div className="space-y-2 border-t border-white/[0.06] p-3">
              <Input
                placeholder="Question — e.g. Is Swagbucks legit?"
                value={item.question}
                onChange={e => update(i, "question", e.target.value)}
                className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20"
              />
              <Textarea
                placeholder="Answer — clear, helpful, 1–3 sentences"
                value={item.answer}
                onChange={e => update(i, "answer", e.target.value)}
                rows={3}
                className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20 resize-y"
              />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 border border-dashed border-white/20 px-4 py-2.5 text-sm font-medium text-white/50 transition-colors hover:border-emerald-500/50 hover:text-emerald-400 w-full justify-center"
      >
        <Plus className="h-4 w-4" /> Add FAQ Item
      </button>
    </div>
  );
}
