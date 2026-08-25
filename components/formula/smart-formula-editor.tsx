"use client";

import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Delete,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Variable,
  Wand2,
  X,
} from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui";
import {
  parseExpressionTextResult,
  tokenizeFriendlyText,
  tokensToFriendlyText,
  type VisualToken,
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
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  const [varSearch, setVarSearch] = useState<string>("");

  const canvasRef = useRef<HTMLDivElement>(null);

  // Tokenize the current formula text
  const tokens = useMemo(() => {
    return tokenizeFriendlyText(rawText);
  }, [rawText]);

  // Syntax validation
  const validationResult = useMemo(() => {
    return parseExpressionTextResult(rawText, variableNameMap);
  }, [rawText, variableNameMap]);

  const isEmpty = tokens.length === 0 || !rawText.trim();
  const isValid = !isEmpty && validationResult.errors.length === 0 && validationResult.expression !== null;
  const hasError = !isEmpty && (!isValid || validationResult.errors.length > 0);

  // Insert token or text with Smart Number Merging
  const insertToken = (tokenString: string, forceNew = false) => {
    const currentTokens = [...tokens];
    const targetIdx =
      cursorIndex !== null && cursorIndex >= 0 && cursorIndex <= currentTokens.length
        ? cursorIndex
        : currentTokens.length;

    const isDigitOrDec = /^[0-9]$/.test(tokenString) || tokenString === "00" || tokenString === "000" || tokenString === ".";
    const isPercent = tokenString === "%";

    // SMART MERGING: If inserting a digit / decimal right after an existing number token, merge it!
    if (!forceNew && (isDigitOrDec || isPercent) && targetIdx > 0 && currentTokens[targetIdx - 1]?.type === "number") {
      const prevTok = { ...currentTokens[targetIdx - 1] };

      if (tokenString === ".") {
        if (!prevTok.text.includes(".")) {
          prevTok.text += ".";
        }
      } else if (tokenString === "%") {
        if (!prevTok.text.endsWith("%")) {
          prevTok.text += "%";
        }
      } else {
        // Digits
        if (prevTok.text === "0" && tokenString !== ".") {
          prevTok.text = tokenString;
        } else {
          prevTok.text += tokenString;
        }
      }

      currentTokens[targetIdx - 1] = prevTok;
      const newRawText = tokensToFriendlyText(currentTokens);
      onChange(newRawText);
      // Cursor remains at targetIdx (right after this number token)
      return;
    }

    // Otherwise create a new token
    const isOperator = ["+", "-", "*", "/", "×", "÷", "(", ")"].includes(tokenString);
    const isNumber = /^\d+(\.\d*)?%?$/.test(tokenString) || /^\.\d+%?$/.test(tokenString);

    const newToken: VisualToken = {
      id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: isOperator ? "operator" : isNumber ? "number" : "variable",
      text: tokenString === "*" ? "×" : tokenString === "/" ? "÷" : tokenString,
    };

    currentTokens.splice(targetIdx, 0, newToken);
    const newRawText = tokensToFriendlyText(currentTokens);
    onChange(newRawText);
    setCursorIndex(targetIdx + 1);
  };


  // Remove token at specific index
  const removeToken = (indexToRemove: number) => {
    const nextTokens = tokens.filter((_, idx) => idx !== indexToRemove);
    const newRawText = tokensToFriendlyText(nextTokens);
    onChange(newRawText);
    if (cursorIndex !== null && cursorIndex > indexToRemove) {
      setCursorIndex(Math.max(0, cursorIndex - 1));
    }
  };

  // Smart Backspace: trims last character of number or removes whole token
  const handleBackspace = () => {
    if (tokens.length === 0) return;
    const currentTokens = [...tokens];
    const targetIdx = cursorIndex !== null && cursorIndex > 0 ? cursorIndex - 1 : currentTokens.length - 1;

    if (targetIdx < 0 || targetIdx >= currentTokens.length) return;

    const targetTok = currentTokens[targetIdx];
    if (targetTok.type === "number" && targetTok.text.length > 1) {
      // Remove just the last character from multi-digit number
      const updatedTok = { ...targetTok, text: targetTok.text.slice(0, -1) };
      currentTokens[targetIdx] = updatedTok;
      onChange(tokensToFriendlyText(currentTokens));
    } else {
      // Remove entire token
      currentTokens.splice(targetIdx, 1);
      onChange(tokensToFriendlyText(currentTokens));
      setCursorIndex(Math.max(0, targetIdx));
    }
  };

  // Keyboard navigation & typing on canvas
  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (/^[0-9]$/.test(e.key) || e.key === ".") {
      e.preventDefault();
      insertToken(e.key);
      return;
    }

    if (["+", "-", "*", "/", "(", ")"].includes(e.key)) {
      e.preventDefault();
      insertToken(e.key);
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      handleBackspace();
      return;
    }

    if (e.key === "Delete") {
      e.preventDefault();
      if (cursorIndex !== null && cursorIndex < tokens.length) {
        removeToken(cursorIndex);
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setCursorIndex(Math.max(0, (cursorIndex ?? tokens.length) - 1));
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      setCursorIndex(Math.min(tokens.length, (cursorIndex ?? tokens.length) + 1));
      return;
    }

    if (e.key === "Home") {
      e.preventDefault();
      setCursorIndex(0);
      return;
    }

    if (e.key === "End") {
      e.preventDefault();
      setCursorIndex(tokens.length);
      return;
    }
  };

  // Clear all
  const handleClearAll = () => {
    onChange("");
    setCursorIndex(null);
  };

  // All available variables (excluding self output variable to prevent self loop)
  const availableVariables = useMemo(() => {
    const list = variables.filter((v) => v.code !== formula.outputVariable);
    if (!varSearch.trim()) return list;
    const query = varSearch.toLowerCase();
    return list.filter(
      (v) => v.name.toLowerCase().includes(query) || v.code.toLowerCase().includes(query)
    );
  }, [variables, formula.outputVariable, varSearch]);

  return (
    <div className="smart-formula-editor space-y-3">
      {/* 1. Header with Quick Tips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-primary" />
            Biểu thức tính toán:
          </span>
        </div>

        <div className="text-[11px] text-muted-foreground">
          Gõ phím thật, bấm máy tính, hoặc chọn biến số bên dưới
        </div>
      </div>

      {/* 2. Main Formula Editor Canvas with Compact, Fixed-width Tokens */}
      <div
        ref={canvasRef}
        tabIndex={0}
        onKeyDown={handleCanvasKeyDown}
        className={`smart-formula-canvas relative justify-between focus:outline-none ${
          hasError ? "invalid" : ""
        }`}
        onClick={() => {
          if (cursorIndex === null) setCursorIndex(tokens.length);
        }}
      >
        {tokens.length === 0 ? (
          <div className="smart-canvas-empty">
            <span className="text-muted-foreground text-xs italic">
              Chưa có phần tử nào. Bạn có thể gõ trực tiếp bằng bàn phím máy tính hoặc bấm chọn biến/số bên dưới.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-10">
            {tokens.map((tok, idx) => {
              const isSelected = cursorIndex === idx;

              if (tok.type === "operator") {
                return (
                  <div key={tok.id} className="inline-flex items-center gap-1">
                    {isSelected && <span className="smart-token-caret" />}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setCursorIndex(idx + 1);
                      }}
                      className="smart-pill-operator cursor-pointer"
                      title={`Toán tử ${tok.text}`}
                    >
                      <OperatorSymbol op={tok.text} className="w-3.5 h-3.5" />
                    </span>
                  </div>
                );
              }

              if (tok.type === "number") {
                return (
                  <div key={tok.id} className="inline-flex items-center gap-1">
                    {isSelected && <span className="smart-token-caret" />}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setCursorIndex(idx + 1);
                      }}
                      className="smart-pill-number cursor-pointer"
                      title="Hằng số"
                    >
                      <span className="font-mono leading-none">{tok.text}</span>
                    </span>
                  </div>
                );
              }

              return (
                <div key={tok.id} className="inline-flex items-center gap-1">
                  {isSelected && <span className="smart-token-caret" />}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCursorIndex(idx + 1);
                    }}
                    className="smart-pill smart-pill-neutral cursor-pointer"
                    title={tok.text}
                  >
                    <span className="leading-none">{tok.text}</span>
                  </span>
                </div>
              );
            })}

            {cursorIndex === tokens.length && <span className="smart-token-caret" />}
          </div>
        )}

        {/* Quick Clear Button vertically centered at right of canvas */}
        {tokens.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center"
            title="Xóa toàn bộ biểu thức"
            aria-label="Xóa toàn bộ biểu thức"
          >
            <Delete className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Live Validation Alert under canvas */}
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
                Danh mục biến số sẵn có
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
                    onClick={() => insertToken(v.name)}
                    className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-primary/5 hover:border-primary/40 hover:text-primary border border-border text-left transition-all text-xs active:scale-[0.98] shadow-2xs flex items-center justify-between gap-1.5 group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {v.group === "custom" || v.isCustom ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" title="Tham số đầu vào" />
                      ) : null}
                      <span className="font-semibold truncate group-hover:text-primary">{v.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {v.group === "custom" || v.isCustom ? (
                        <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1 rounded">
                          Tham số
                        </span>
                      ) : null}
                      <span className="font-mono text-[9.5px] text-muted-foreground/80 bg-secondary/80 px-1.5 py-0.5 rounded">
                        {v.code}
                      </span>
                    </div>
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
                  onClick={() => insertToken("(")}
                  className="h-8 rounded-lg font-mono border border-border/80 bg-secondary/60 hover:bg-primary hover:text-white hover:border-primary text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center font-bold text-sm"
                  title="Mở ngoặc"
                >
                  (
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(")")}
                  className="h-8 rounded-lg font-mono border border-border/80 bg-secondary/60 hover:bg-primary hover:text-white hover:border-primary text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center font-bold text-sm"
                  title="Đóng ngoặc"
                >
                  )
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken("%")}
                  className="h-8 rounded-lg font-mono border border-border/80 bg-secondary/60 hover:bg-primary hover:text-white hover:border-primary text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center font-bold text-sm"
                  title="Phần trăm (%)"
                >
                  %
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken("/")}
                  className="h-8 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary hover:text-white text-primary dark:bg-primary/20 dark:hover:bg-primary dark:text-primary-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  title="Toán tử chia (÷)"
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
                    onClick={() => insertToken(num)}
                    className="h-8 rounded-lg bg-card hover:bg-amber-500/15 hover:text-amber-600 hover:border-amber-500/40 font-mono font-bold text-xs border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken("*")}
                  className="h-8 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary hover:text-white text-primary dark:bg-primary/20 dark:hover:bg-primary dark:text-primary-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  title="Toán tử nhân (×)"
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
                    onClick={() => insertToken(num)}
                    className="h-8 rounded-lg bg-card hover:bg-amber-500/15 hover:text-amber-600 hover:border-amber-500/40 font-mono font-bold text-xs border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken("-")}
                  className="h-8 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary hover:text-white text-primary dark:bg-primary/20 dark:hover:bg-primary dark:text-primary-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  title="Toán tử trừ (−)"
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
                    onClick={() => insertToken(num)}
                    className="h-8 rounded-lg bg-card hover:bg-amber-500/15 hover:text-amber-600 hover:border-amber-500/40 font-mono font-bold text-xs border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken("+")}
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
                    onClick={() => insertToken(num)}
                    className="h-8 rounded-lg bg-card hover:bg-amber-500/15 hover:text-amber-600 hover:border-amber-500/40 font-mono font-bold text-xs border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
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
