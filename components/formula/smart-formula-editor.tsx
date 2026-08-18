"use client";

import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Delete,
  RotateCcw,
  Sparkles,
  Trash2,
  Variable,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import {
  parseExpressionTextResult,
  tokenizeFriendlyText,
  tokensToFriendlyText,
  type VisualToken,
} from "@/lib/formula-engine";
import type { FormulaVariable, SalaryFormula } from "@/lib/types";

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

  // Tokenize the current formula text
  const tokens = useMemo(() => {
    return tokenizeFriendlyText(rawText);
  }, [rawText]);

  // Syntax validation
  const validationResult = useMemo(() => {
    return parseExpressionTextResult(rawText, variableNameMap);
  }, [rawText, variableNameMap]);

  const isValid = validationResult.errors.length === 0 && validationResult.expression !== null;

  // Insert token or text at position
  const insertToken = (tokenString: string) => {
    const currentTokens = [...tokens];
    const targetIdx = cursorIndex !== null && cursorIndex >= 0 && cursorIndex <= currentTokens.length
      ? cursorIndex
      : currentTokens.length;

    // Create new token representation
    const isOperator = ["+", "-", "*", "/", "×", "÷", "(", ")"].includes(tokenString);
    const newToken: VisualToken = {
      id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: isOperator ? "operator" : /^\d+(\.\d+)?$/.test(tokenString) ? "number" : "variable",
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

  // Backspace token before cursor
  const handleBackspace = () => {
    if (tokens.length === 0) return;
    const targetIdx = cursorIndex !== null && cursorIndex > 0 ? cursorIndex - 1 : tokens.length - 1;
    removeToken(targetIdx);
  };

  // Clear all
  const handleClearAll = () => {
    onChange("");
    setCursorIndex(null);
  };

  // All available variables (excluding self output variable to prevent self loop)
  const availableVariables = useMemo(() => {
    return variables.filter((v) => v.code !== formula.outputVariable);
  }, [variables, formula.outputVariable]);

  return (
    <div className="smart-formula-editor space-y-3.5">
      {/* 1. Header with Validation Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-primary" />
            Biểu thức tính toán:
          </span>
          <Badge tone={isValid ? "success" : "danger"}>
            {isValid ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Cú pháp hợp lệ
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Cần chỉnh sửa
              </span>
            )}
          </Badge>
        </div>
      </div>

      {/* 2. Main Formula Editor Canvas with Backspace Icon Button */}
      <div
        className={`smart-formula-canvas justify-between ${
          !isValid ? "invalid" : "valid"
        }`}
        onClick={() => {
          if (cursorIndex === null) setCursorIndex(tokens.length);
        }}
      >
        {tokens.length === 0 ? (
          <div className="smart-canvas-empty">
            <Sparkles className="w-4 h-4 text-primary/60" />
            <span>Chưa có phần tử nào. Bấm chọn biến từ danh sách hoặc bàn phím máy tính bên dưới để ghép công thức.</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 py-1 flex-1 pr-2">
            {tokens.map((tok, idx) => {
              const isSelected = cursorIndex === idx;

              if (tok.type === "operator") {
                return (
                  <div key={tok.id} className="inline-flex items-center gap-1">
                    {isSelected && <span className="smart-token-caret" />}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setCursorIndex(idx);
                      }}
                      className="smart-pill-operator cursor-pointer"
                      title="Toán tử"
                    >
                      <span className="font-mono font-extrabold">{tok.text}</span>
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
                        setCursorIndex(idx);
                      }}
                      className="smart-pill-number cursor-pointer"
                      title="Hằng số"
                    >
                      <span className="font-mono font-bold">{tok.text}</span>
                    </span>
                  </div>
                );
              }

              // Variable token (Clean neutral badge without icon or color)
              return (
                <div key={tok.id} className="inline-flex items-center gap-1">
                  {isSelected && <span className="smart-token-caret" />}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCursorIndex(idx);
                    }}
                    className="smart-pill smart-pill-neutral cursor-pointer"
                    title={tok.text}
                  >
                    <span className="font-semibold text-xs truncate max-w-[240px]">{tok.text}</span>
                  </span>
                </div>
              );
            })}

            {cursorIndex === tokens.length && <span className="smart-token-caret" />}
          </div>
        )}

        {/* Backspace Icon Button inside Input */}
        {tokens.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleBackspace();
            }}
            className="w-7 h-7 rounded-lg text-muted hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 flex items-center justify-center border border-transparent hover:border-destructive/20 active:scale-95 ml-auto"
            title="Xóa ký tự (Backspace)"
            aria-label="Xóa ký tự"
          >
            <Delete className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Validation Errors detail if any */}
      {!isValid && validationResult.errors.length > 0 && (
        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="font-bold">Lỗi cú pháp công thức:</strong>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              {validationResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 3. Grid Workspace: Available Variables Board (Left) & Basic Calculator (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
        {/* Left Column (7 cols): Available Variables Board (Matches Calculator Height) */}
        <div className="md:col-span-7 p-3.5 rounded-xl bg-secondary/30 border border-border flex flex-col space-y-2.5">
          <div className="flex items-center justify-between gap-2 pb-0.5 shrink-0">
            <strong className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Variable className="w-3.5 h-3.5 text-primary" />
              Danh mục biến số sẵn có ({availableVariables.length})
            </strong>
            <span className="text-[11px] text-muted">Bấm thẻ để chèn</span>
          </div>

          {/* Grid of all available variable cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
            {availableVariables.map((v) => {
              return (
                <button
                  key={v.code}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(v.name)}
                  className="p-2.5 rounded-lg bg-card hover:bg-secondary/70 hover:border-primary/50 border border-border text-left transition-all flex items-center justify-between text-xs group shadow-2xs hover:shadow-xs active:scale-[0.98]"
                  title={`Chèn biến: ${v.name} (${v.code})`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-foreground block truncate group-hover:text-primary text-xs">
                      {v.name}
                    </span>
                    <span className="font-mono text-[10px] text-muted block truncate">
                      {v.code}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                    + Chèn
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 cols): Basic Calculator Keypad */}
        <div className="md:col-span-5 p-3.5 rounded-xl bg-secondary/30 border border-border flex flex-col space-y-2.5">
          <div className="flex items-center justify-between pb-0.5 shrink-0">
            <strong className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-primary" />
              Bàn phím máy tính (Calculator)
            </strong>
          </div>

          {/* Calculator Keypad Grid */}
          <div className="space-y-1.5">
            {/* Row 1: Parentheses & High level operators */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "(", token: "(", cls: "bg-secondary text-foreground font-extrabold" },
                { label: ")", token: ")", cls: "bg-secondary text-foreground font-extrabold" },
                { label: "%", token: "/ 100", cls: "bg-secondary text-foreground font-extrabold" },
                { label: "÷", token: "/", cls: "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-extrabold" },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(btn.token)}
                  className={`h-9 rounded-lg hover:bg-primary hover:text-primary-foreground font-mono text-sm border border-border shadow-2xs transition-all active:scale-95 flex items-center justify-center ${btn.cls}`}
                  title={`Toán tử ${btn.label}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Row 2: 7, 8, 9, * */}
            <div className="grid grid-cols-4 gap-1.5">
              {["7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(num)}
                  className="h-9 rounded-lg bg-card hover:bg-primary hover:text-primary-foreground font-mono font-bold text-sm border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertToken("*")}
                className="h-9 rounded-lg bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 hover:bg-primary hover:text-primary-foreground font-mono font-extrabold text-sm border border-border shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                title="Toán tử nhân"
              >
                ×
              </button>
            </div>

            {/* Row 3: 4, 5, 6, - */}
            <div className="grid grid-cols-4 gap-1.5">
              {["4", "5", "6"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(num)}
                  className="h-9 rounded-lg bg-card hover:bg-primary hover:text-primary-foreground font-mono font-bold text-sm border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertToken("-")}
                className="h-9 rounded-lg bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 hover:bg-primary hover:text-primary-foreground font-mono font-extrabold text-sm border border-border shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                title="Toán tử trừ"
              >
                −
              </button>
            </div>

            {/* Row 4: 1, 2, 3, + */}
            <div className="grid grid-cols-4 gap-1.5">
              {["1", "2", "3"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(num)}
                  className="h-9 rounded-lg bg-card hover:bg-primary hover:text-primary-foreground font-mono font-bold text-sm border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertToken("+")}
                className="h-9 rounded-lg bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 hover:bg-primary hover:text-primary-foreground font-mono font-extrabold text-sm border border-border shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                title="Toán tử cộng"
              >
                +
              </button>
            </div>

            {/* Row 5: 0, ., 000, 00 */}
            <div className="grid grid-cols-4 gap-1.5">
              {["0", ".", "00", "000"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(num)}
                  className="h-9 rounded-lg bg-card hover:bg-primary hover:text-primary-foreground font-mono font-bold text-xs border border-border text-foreground shadow-2xs transition-all active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Action buttons: Backspace & Clear */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/60">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleBackspace}
                className="h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-bold text-xs border border-amber-500/20 transition-all flex items-center justify-center gap-1 active:scale-95"
                title="Xóa phần tử trước vị trí con trỏ"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Xóa ký tự
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClearAll}
                className="h-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold text-xs border border-destructive/20 transition-all flex items-center justify-center gap-1 active:scale-95"
                title="Xóa toàn bộ biểu thức"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa hết
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
