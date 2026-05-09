"use client";
/**
 * components/admin/RichEditor.tsx
 *
 * FIXED: Hidden input is now a controlled React input (value + onChange).
 * Previously it used an uncontrolled ref approach — React could remount
 * the hidden input on re-render and reset it to defaultValue, causing the
 * server to receive an empty/short description and fail Zod's min(50) check.
 *
 * The contentEditable div still uses refs for cursor stability (no state on
 * every keystroke), but after each change we sync into React state so the
 * controlled hidden input always reflects the current content at submit time.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Quote, Link as LinkIcon, Undo2, Redo2, Minus, Type,
} from "lucide-react";

interface RichEditorProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  minHeight?: number;
}

function stripStyles(el: Element) {
  el.removeAttribute("style");
  el.removeAttribute("color");
  el.removeAttribute("bgcolor");
  el.removeAttribute("face");
  el.removeAttribute("size");
  for (const c of Array.from(el.children)) stripStyles(c);
}

function sanitize(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const els: Element[] = [];
  let n = walker.nextNode();
  while (n) { els.push(n as Element); n = walker.nextNode(); }
  for (const el of els) {
    stripStyles(el);
    el.removeAttribute("class");
    if (el.tagName.toLowerCase() === "a") {
      Array.from(el.attributes).forEach(a => {
        if (!["href", "target", "rel"].includes(a.name)) el.removeAttribute(a.name);
      });
    }
  }
  return doc.body.innerHTML;
}

const GROUPS = [
  [
    { icon: Heading2, title: "Heading 2",  cmd: "formatBlock",         val: "h2" },
    { icon: Heading3, title: "Heading 3",  cmd: "formatBlock",         val: "h3" },
    { icon: Type,     title: "Paragraph",  cmd: "formatBlock",         val: "p"  },
  ],
  [
    { icon: Bold,   title: "Bold",   cmd: "bold",   val: undefined },
    { icon: Italic, title: "Italic", cmd: "italic", val: undefined },
  ],
  [
    { icon: List,        title: "Bullets", cmd: "insertUnorderedList", val: undefined },
    { icon: ListOrdered, title: "Numbers", cmd: "insertOrderedList",   val: undefined },
  ],
  [
    { icon: Quote, title: "Blockquote", cmd: "formatBlock", val: "blockquote" },
    { icon: Minus, title: "Divider",    cmd: "insertHTML",  val: "<hr/>"      },
  ],
  [
    { icon: Undo2, title: "Undo (Ctrl+Z)", cmd: "undo", val: undefined },
    { icon: Redo2, title: "Redo",          cmd: "redo", val: undefined },
  ],
];

export function RichEditor({
  name,
  defaultValue = "",
  placeholder = "Write your content here...",
  minHeight = 300,
}: RichEditorProps) {
  const editorRef  = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const initRef    = useRef(false);

  // ── Controlled value — survives React re-renders & form submission ──
  const [htmlValue, setHtmlValue] = useState(defaultValue);

  // Sync contentEditable → state → controlled hidden input
  const sync = useCallback(() => {
    if (!editorRef.current) return;
    const clean = sanitize(editorRef.current.innerHTML);
    setHtmlValue(clean);

    // Update char counter via DOM — zero re-renders
    if (counterRef.current) {
      const chars = editorRef.current.innerText.trim().replace(/\s+/g, "").length;
      if (chars === 0) {
        counterRef.current.textContent = "";
        counterRef.current.style.color = "rgba(255,255,255,0.2)";
      } else if (chars < 50) {
        counterRef.current.textContent = `${chars} / 50 min`;
        counterRef.current.style.color = "rgba(251,191,36,0.9)";
      } else {
        counterRef.current.textContent = `${chars} chars`;
        counterRef.current.style.color = "rgba(255,255,255,0.2)";
      }
    }
  }, []);

  // Init ONCE — sets contentEditable content from defaultValue
  useEffect(() => {
    if (initRef.current || !editorRef.current) return;
    initRef.current = true;
    if (defaultValue) {
      editorRef.current.innerHTML = defaultValue;
      sync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? undefined);
    if (editorRef.current) stripStyles(editorRef.current);
    sync();
  };

  const insertLink = () => {
    const url = prompt("URL (e.g. https://example.com):");
    if (!url) return;
    const text = window.getSelection()?.toString().trim() || url;
    document.execCommand(
      "insertHTML",
      false,
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
    );
    sync();
  };

  return (
    <div
      style={{ border: "2px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
      onFocus={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 2px rgba(10,191,170,0.25)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.2)";
      }}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
        }
      }}
    >
      {/*
        Controlled hidden input — value is React state, always current.
        This guarantees FormData at submit time has the real content,
        even if React remounted this component between edits and submit.
      */}
      <input
        type="hidden"
        name={name}
        value={htmlValue}
        onChange={() => {
          // onChange required by React for controlled inputs but the real
          // updates come from sync() called by the contentEditable events.
        }}
      />

      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)" }}
      >
        {GROUPS.map((group, gi) => (
          <span key={gi} className="flex items-center">
            {group.map(({ icon: Icon, title, cmd, val }) => (
              <button
                key={title}
                type="button"
                title={title}
                onMouseDown={e => { e.preventDefault(); exec(cmd, val); }}
                className="flex h-7 w-7 items-center justify-center text-white/40 transition-colors hover:bg-white/[0.12] hover:text-white/90 active:bg-white/20 rounded-[2px]"
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
            {gi < GROUPS.length - 1 && <span className="mx-1 h-4 w-px bg-white/10" />}
          </span>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        <button
          type="button"
          title="Insert link"
          onMouseDown={e => { e.preventDefault(); insertLink(); }}
          className="flex h-7 w-7 items-center justify-center text-white/40 transition-colors hover:bg-white/[0.12] hover:text-white/90 rounded-[2px]"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
        <span className="ml-auto flex items-center gap-2">
          <span ref={counterRef} className="text-[10px] font-mono tabular-nums" />
          <button
            type="button"
            title="Clear formatting"
            onMouseDown={e => {
              e.preventDefault();
              document.execCommand("removeFormat");
              document.execCommand("formatBlock", false, "p");
              if (editorRef.current) stripStyles(editorRef.current);
              sync();
            }}
            className="px-2 py-0.5 text-[10px] font-mono text-white/20 hover:text-red-400/70 transition-colors"
          >
            ¶ clear
          </button>
        </span>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          if (editorRef.current) stripStyles(editorRef.current);
          sync();
        }}
        onPaste={e => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
          sync();
        }}
        data-placeholder={placeholder}
        className="rich-editor-area outline-none"
        style={{
          minHeight: `${minHeight}px`,
          padding: "16px",
          color: "rgba(255,255,255,0.85)",
          fontSize: "14px",
          lineHeight: "1.75",
        }}
      />

      <style>{`
        .rich-editor-area:empty:before { content: attr(data-placeholder); color: rgba(255,255,255,0.16); pointer-events: none; }
        .rich-editor-area h2 { font-size: 1.2rem; font-weight: 800; color: rgba(255,255,255,0.92) !important; margin: 1.4em 0 0.5em; font-family: var(--font-display,'Syne',sans-serif); border-bottom: 1px solid rgba(245,200,66,0.25); padding-bottom: 0.25em; }
        .rich-editor-area h3 { font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.86) !important; margin: 1.1em 0 0.3em; font-family: var(--font-display,'Syne',sans-serif); }
        .rich-editor-area p { margin: 0 0 0.8em; color: rgba(255,255,255,0.72) !important; }
        .rich-editor-area ul { list-style: disc; padding-left: 1.4em; margin: 0.5em 0 0.8em; }
        .rich-editor-area ol { list-style: decimal; padding-left: 1.4em; margin: 0.5em 0 0.8em; }
        .rich-editor-area li { margin-bottom: 0.3em; color: rgba(255,255,255,0.72) !important; }
        .rich-editor-area blockquote { border-left: 3px solid #F5C842; padding: 0.5em 1em; margin: 0.8em 0; color: rgba(255,255,255,0.5) !important; font-style: italic; background: rgba(245,200,66,0.06); }
        .rich-editor-area a { color: #0ABFAA !important; text-decoration: underline; }
        .rich-editor-area hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1em 0; }
        .rich-editor-area strong, .rich-editor-area b { color: rgba(255,255,255,0.95) !important; font-weight: 700; }
        .rich-editor-area em, .rich-editor-area i { color: rgba(255,255,255,0.62) !important; }
        .rich-editor-area [style] { color: inherit !important; background: transparent !important; font-family: inherit !important; font-size: inherit !important; }
      `}</style>
    </div>
  );
}
