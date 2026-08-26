"use client";

import {
  Delete,
  Search,
  Variable,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  findVariableAtCursor,
  parseExpressionTextResult,
} from "@/lib/formula-engine";
import type { FormulaVariable, SalaryFormula } from "@/lib/types";
import { OperatorSymbol } from "@/components/tabs/formula-tab";

interface SmartFormulaEditorProps {
  formula: SalaryFormula;
  rawText: string;
  variables: FormulaVariable[];
  variableNameMap: Map<string, string>;
  onChange: (newRawText: string) => void;
}

export function SmartFormulaEditor({
  formula,
  rawText,
  variables,
  variableNameMap,
  onChange,
}: SmartFormulaEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  const [varSearch, setVarSearch] = useState<string>("");

  // Mention State for @ autocomplete
  const [mentionState, setMentionState] = useState<{
    isOpen: boolean;
    query: string;
    atIndex: number;
    selectedIndex: number;
  }>({
    isOpen: false,
    query: "",
    atIndex: -1,
    selectedIndex: 0,
  });

  const customNames = useMemo(() => {
    return variables.map((v) => v.name);
  }, [variables]);

  // Syntax validation
  const validationResult = useMemo(() => {
    return parseExpressionTextResult(rawText, variableNameMap);
  }, [rawText, variableNameMap]);

  const isEmpty = !rawText.trim();
  const isValid = !isEmpty && validationResult.errors.length === 0 && validationResult.expression !== null;
  const hasError = !isEmpty && (!isValid || validationResult.errors.length > 0);

  // All available variables (excluding the formula's output variable itself)
  const availableVariables = useMemo(() => {
    const list = variables.filter((v) => v.code !== formula.outputVariable);
    if (!varSearch.trim()) return list;
    const query = varSearch.toLowerCase();
    return list.filter(
      (v) => v.name.toLowerCase().includes(query) || v.code.toLowerCase().includes(query)
    );
  }, [variables, formula.outputVariable, varSearch]);

  // Filtered variables for @ mention popup
  const mentionFilteredVariables = useMemo(() => {
    const list = variables.filter((v) => v.code !== formula.outputVariable);
    if (!mentionState.query.trim()) return list.slice(0, 8);
    const query = mentionState.query.toLowerCase().trim();
    return list
      .filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.code.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [variables, formula.outputVariable, mentionState.query]);

  // Reset selectedIndex when filtered list changes
  useEffect(() => {
    if (mentionState.selectedIndex >= mentionFilteredVariables.length) {
      setMentionState((prev) => ({
        ...prev,
        selectedIndex: Math.max(0, mentionFilteredVariables.length - 1),
      }));
    }
  }, [mentionFilteredVariables.length, mentionState.selectedIndex]);

  // Helper to set cursor position on next animation frame
  const setSelectionRangeAsync = (start: number, end: number) => {
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, end);
      }
    });
  };

  // Insert text at current cursor in textarea
  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(rawText + textToInsert);
      return;
    }

    const start = textarea.selectionStart ?? rawText.length;
    const end = textarea.selectionEnd ?? rawText.length;
    const before = rawText.slice(0, start);
    const after = rawText.slice(end);
    const updated = before + textToInsert + after;

    onChange(updated);
    const newCursor = start + textToInsert.length;
    setSelectionRangeAsync(newCursor, newCursor);
  };

  // Select a variable from @ mention dropdown
  const selectMentionVariable = (v: FormulaVariable) => {
    if (mentionState.atIndex < 0) return;

    const before = rawText.slice(0, mentionState.atIndex);
    const after = rawText.slice(mentionState.atIndex + 1 + mentionState.query.length);
    const formatted = `[${v.name}] `;
    const updated = before + formatted + after;

    onChange(updated);
    setMentionState({
      isOpen: false,
      query: "",
      atIndex: -1,
      selectedIndex: 0,
    });

    const newCursor = before.length + formatted.length;
    setSelectionRangeAsync(newCursor, newCursor);
  };

  // Handle keydown in textarea (Atomic deletion & Mention keyboard navigation)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 1. Navigation when Mention Dropdown is open
    if (mentionState.isOpen && mentionFilteredVariables.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % mentionFilteredVariables.length,
        }));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          selectedIndex:
            (prev.selectedIndex - 1 + mentionFilteredVariables.length) %
            mentionFilteredVariables.length,
        }));
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = mentionFilteredVariables[mentionState.selectedIndex];
        if (selected) {
          selectMentionVariable(selected);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setMentionState((prev) => ({ ...prev, isOpen: false }));
        return;
      }
    }

    const { selectionStart, selectionEnd } = textarea;

    // 2. Atomic Backspace: Delete whole variable token at once
    if (e.key === "Backspace" && selectionStart === selectionEnd && selectionStart > 0) {
      const match = findVariableAtCursor(rawText, selectionStart, customNames);
      if (match && (match.action === "backspace" || match.action === "inside")) {
        e.preventDefault();
        const before = rawText.slice(0, match.range.start);
        const after = rawText.slice(match.range.end);
        const updated = before + after;
        onChange(updated);
        setSelectionRangeAsync(match.range.start, match.range.start);
        return;
      }
    }

    // 3. Atomic Delete: Delete whole variable token at once
    if (e.key === "Delete" && selectionStart === selectionEnd && selectionStart < rawText.length) {
      const match = findVariableAtCursor(rawText, selectionStart, customNames);
      if (match && match.action === "delete") {
        e.preventDefault();
        const before = rawText.slice(0, match.range.start);
        const after = rawText.slice(match.range.end);
        const updated = before + after;
        onChange(updated);
        setSelectionRangeAsync(match.range.start, match.range.start);
        return;
      }
    }
  };

  // Handle textarea text change and @ trigger detection
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = e.target.value;
    const cursor = e.target.selectionStart ?? nextText.length;

    onChange(nextText);

    // Detect if cursor is right after an '@' mention query
    const textBeforeCursor = nextText.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      // Ensure query does not contain line breaks or operator separators
      if (!/[\r\n+\-*/()[\];,><=]/.test(query) && query.length <= 30) {
        setMentionState({
          isOpen: true,
          query,
          atIndex: lastAtIndex,
          selectedIndex: 0,
        });
        return;
      }
    }

    if (mentionState.isOpen) {
      setMentionState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Clear all
  const handleClearAll = () => {
    onChange("");
    setMentionState({ isOpen: false, query: "", atIndex: -1, selectedIndex: 0 });
    setSelectionRangeAsync(0, 0);
  };

  return (
    <div className="smart-formula-editor space-y-2.5">
      {/* 1. Header: Formula Bar label on left, clean hint on right */}
      <div className="flex items-center justify-between gap-2 pb-0.5">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <span
            style={{ backgroundColor: "var(--primary, #038b8c)", color: "#ffffff" }}
            className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] tracking-tight"
          >
            fx
          </span>
          Biểu thức tính toán:
        </span>

        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          Gõ <code className="font-bold text-primary">@</code> để chèn biến
        </span>
      </div>

      {/* 2. Main Freeform Excel Formula Input with Floating @ Mention Dropdown */}
      <div className="relative">
        <div
          className={`relative rounded-xl border bg-card shadow-2xs transition-all ${hasError
            ? "border-rose-500 ring-2 ring-rose-500/20"
            : "border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
            }`}
        >
          <textarea
            ref={textareaRef}
            rows={3}
            value={rawText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Gõ @ để chèn biến"
            className="w-full px-3.5 pr-10 py-2.5 !border-0 !outline-none !shadow-none !ring-0 focus:!ring-0 focus:!border-0 !bg-transparent font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 placeholder:text-xs placeholder:font-sans resize-y min-h-[72px]"
          />

          {rawText && (
            <button
              type="button"
              onClick={handleClearAll}
              className="absolute right-2.5 top-2.5 p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Xóa toàn bộ công thức"
              aria-label="Xóa toàn bộ"
            >
              <Delete className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Floating @ Mention Autocomplete Popup */}
        {mentionState.isOpen && (
          <div
            ref={mentionDropdownRef}
            className="absolute left-6 top-full mt-1.5 z-50 w-72 max-w-[90vw] rounded-xl bg-card border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-3 py-2 bg-secondary/70 border-b border-border/80 flex items-center justify-between text-[11px] font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Variable className="w-3.5 h-3.5 text-primary" />
                <span>Chèn biến số (@)</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {mentionFilteredVariables.length} kết quả
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
              {mentionFilteredVariables.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground italic">
                  Không tìm thấy biến khớp &ldquo;{mentionState.query}&rdquo;
                </div>
              ) : (
                mentionFilteredVariables.map((v, idx) => {
                  const isSelected = idx === mentionState.selectedIndex;
                  return (
                    <button
                      key={v.code}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectMentionVariable(v);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 ${isSelected
                        ? "bg-primary text-white font-medium"
                        : "hover:bg-secondary text-foreground"
                        }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-primary"
                            }`}
                        />
                        <span className="font-semibold truncate">{v.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono shrink-0 ${isSelected ? "text-white/80" : "text-muted-foreground"
                          }`}
                      >
                        {v.code}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-2.5 py-1.5 bg-secondary/40 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
              <span>↑ ↓ duyệt • Enter / Tab chọn</span>
              <span>Esc đóng</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Validation Alert under input */}
      {hasError && (
        <div className="flex items-center gap-1.5 px-1 text-[11.5px] text-rose-600 dark:text-rose-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>{validationResult.errors.join(" • ")}</span>
        </div>
      )}

      {/* 3. Unified Workspace: Variable Catalog & Calculator Keypad combined into 1 single card */}
      <div className="rounded-xl bg-secondary/30 border border-border p-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* Left Column: Variable Catalog (md:col-span-7) */}
          <div className="md:col-span-7 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between pb-0.5 shrink-0">
              <strong className="text-xs font-bold text-foreground">
                Danh mục biến số
              </strong>
            </div>

            {/* Variable Search Filter (Full Width) */}
            <label className="search-field w-full search-field-full shrink-0 h-8 min-h-[32px] gap-2 px-2.5">
              <Search className="w-3.5 h-3.5 text-muted shrink-0" />
              <input
                type="text"
                value={varSearch}
                onChange={(e) => setVarSearch(e.target.value)}
                placeholder="Tìm kiếm biến số (VD: lương, phụ cấp, OT)..."
                className="text-xs"
              />
              {varSearch && (
                <button
                  type="button"
                  onClick={() => setVarSearch("")}
                  className="p-0.5 rounded text-muted hover:text-foreground shrink-0"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 flex-1 min-h-[175px] max-h-[195px] overflow-y-auto pr-1">
              {availableVariables.length === 0 ? (
                <div className="col-span-2 text-center py-6 text-xs text-muted-foreground italic">
                  Không tìm thấy biến số nào phù hợp với từ khóa &ldquo;{varSearch}&rdquo;
                </div>
              ) : (
                availableVariables.map((v) => (
                  <button
                    key={v.code}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertAtCursor(`[${v.name}] `)}
                    className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-primary/5 hover:border-primary/40 hover:text-primary border border-border text-left transition-all text-xs active:scale-[0.98] shadow-2xs flex items-center justify-between gap-1.5 group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {v.group === "custom" || v.isCustom ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Tham số đầu vào" />
                      ) : null}
                      <span className="font-semibold truncate group-hover:text-primary">{v.name}</span>
                    </div>
                    {v.group === "custom" || v.isCustom ? (
                      <span className="text-[9px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1 rounded shrink-0">
                        Tham số
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Calculator Keypad (md:col-span-5 with vertical divider) */}
          <div className="md:col-span-5 md:pl-4 md:border-l md:border-border flex flex-col space-y-2 pt-3 md:pt-0 border-t md:border-t-0 border-border justify-between">
            <div className="flex items-center justify-between pb-0.5 shrink-0">
              <strong className="text-xs font-bold text-foreground">
                Bàn phím máy tính
              </strong>
              <span className="text-[11px] text-muted">Toán tử & Số</span>
            </div>

            <div className="space-y-1 flex-1 flex flex-col justify-between">
              {/* Row 1: (, ), %, ÷ */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertAtCursor(" ( ")}
                  className="h-8 rounded-lg font-mono border border-border/80 bg-secondary/60 hover:bg-primary hover:text-white hover:border-primary text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center font-bold text-sm"
                  title="Mở ngoặc"
                >
                  (
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertAtCursor(" ) ")}
                  className="h-8 rounded-lg font-mono border border-border/80 bg-secondary/60 hover:bg-primary hover:text-white hover:border-primary text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center font-bold text-sm"
                  title="Đóng ngoặc"
                >
                  )
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertAtCursor("%")}
                  className="h-8 rounded-lg font-mono border border-border/80 bg-secondary/60 hover:bg-primary hover:text-white hover:border-primary text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center font-bold text-sm"
                  title="Phần trăm (%)"
                >
                  %
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertAtCursor(" / ")}
                  className="h-8 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary hover:text-white text-primary dark:bg-primary/20 dark:hover:bg-primary dark:text-primary-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  title="Toán tử chia (/)"
                >
                  <OperatorSymbol op="/" className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Row 2: 7, 8, 9, * */}
              <div className="grid grid-cols-4 gap-1">
                {["7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertAtCursor(num)}
                    className="h-8 rounded-lg bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 font-mono font-bold text-xs border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertAtCursor(" * ")}
                  className="h-8 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary hover:text-white text-primary dark:bg-primary/20 dark:hover:bg-primary dark:text-primary-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  title="Toán tử nhân (*)"
                >
                  <OperatorSymbol op="*" className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Row 3: 4, 5, 6, - */}
              <div className="grid grid-cols-4 gap-1">
                {["4", "5", "6"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertAtCursor(num)}
                    className="h-8 rounded-lg bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 font-mono font-bold text-xs border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertAtCursor(" - ")}
                  className="h-8 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary hover:text-white text-primary dark:bg-primary/20 dark:hover:bg-primary dark:text-primary-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  title="Toán tử trừ (-)"
                >
                  <OperatorSymbol op="-" className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Row 4: 1, 2, 3, + */}
              <div className="grid grid-cols-4 gap-1">
                {["1", "2", "3"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertAtCursor(num)}
                    className="h-8 rounded-lg bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 font-mono font-bold text-xs border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertAtCursor(" + ")}
                  className="h-8 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary hover:text-white text-primary dark:bg-primary/20 dark:hover:bg-primary dark:text-primary-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  title="Toán tử cộng (+)"
                >
                  <OperatorSymbol op="+" className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Row 5: 0, ., 00, 000 */}
              <div className="grid grid-cols-4 gap-1">
                {["0", ".", "00", "000"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertAtCursor(num)}
                    className="h-8 rounded-lg bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 font-mono font-bold text-xs border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
