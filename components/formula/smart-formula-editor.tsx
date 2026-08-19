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
            <span className="text-muted-foreground text-xs italic">
              Chưa có phần tử nào. Bấm chọn biến từ danh sách hoặc bàn phím máy tính bên dưới để ghép công thức.
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
                        setCursorIndex(idx);
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
                        setCursorIndex(idx);
                      }}
                      className="smart-pill-number cursor-pointer"
                      title="Hằng số"
                    >
                      <span>{tok.text}</span>
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
                      setCursorIndex(idx);
                    }}
                    className="smart-pill smart-pill-neutral"
                    title={tok.text}
                  >
                    <span>{tok.text}</span>
                  </span>
                </div>
              );
            })}

            {cursorIndex === tokens.length && <span className="smart-token-caret" />}
          </div>
        )}

        {/* Quick Clear Button at top right of canvas */}
        {tokens.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="absolute right-2.5 top-2.5 p-1 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Xóa nhanh toàn bộ biểu thức"
            aria-label="Xóa nhanh toàn bộ biểu thức"
          >
            <Delete className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Live Validation Alert under canvas */}
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
        <div className="md:col-span-7 p-3.5 rounded-xl bg-secondary/30 border border-border flex flex-col space-y-2.5">
          <div className="flex items-center justify-between gap-2 pb-0.5 shrink-0">
            <strong className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Variable className="w-3.5 h-3.5 text-primary" />
              Danh mục biến số sẵn có ({availableVariables.length})
            </strong>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
            {availableVariables.map((v) => (
              <button
                key={v.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertToken(v.name)}
                className="p-2.5 rounded-lg bg-card hover:bg-secondary/70 border border-border text-left transition-all text-xs"
              >
                <span className="font-semibold block truncate">{v.name}</span>
                <span className="font-mono text-[10px] text-muted block truncate">{v.code}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-5 p-3.5 rounded-xl bg-secondary/30 border border-border flex flex-col space-y-2.5">
          <div className="flex items-center justify-between pb-0.5 shrink-0">
            <strong className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-primary" />
              Bàn phím máy tính (Calculator)
            </strong>
            <span className="text-[11px] text-muted">Toán tử & Số</span>
          </div>

          <div className="space-y-1.5 flex-1 flex flex-col justify-between">
            {/* Row 1: (, ), %, ÷ */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertToken("(")}
                className="h-9 rounded-lg font-mono border shadow-2xs transition-all active:scale-95 flex items-center justify-center bg-primary/15 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground font-black text-sm"
                title="Mở ngoặc"
              >
                (
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertToken(")")}
                className="h-9 rounded-lg font-mono border shadow-2xs transition-all active:scale-95 flex items-center justify-center bg-primary/15 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground font-black text-sm"
                title="Đóng ngoặc"
              >
                )
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertToken("/ 100")}
                className="h-9 rounded-lg font-mono border shadow-2xs transition-all active:scale-95 flex items-center justify-center bg-primary/15 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground font-black text-sm"
                title="Phần trăm (%)"
              >
                %
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertToken("/")}
                className="h-9 rounded-lg border shadow-xs transition-all active:scale-95 flex items-center justify-center bg-primary text-white hover:bg-primary-hover border-primary/40"
                style={{ backgroundColor: "#038b8c", color: "#ffffff" }}
                title="Toán tử chia"
              >
                <OperatorSymbol op="/" className="w-4 h-4 text-white" />
              </button>
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
                className="h-9 rounded-lg border shadow-xs transition-all active:scale-95 flex items-center justify-center bg-primary text-white hover:bg-primary-hover border-primary/40"
                style={{ backgroundColor: "#038b8c", color: "#ffffff" }}
                title="Toán tử nhân"
              >
                <OperatorSymbol op="*" className="w-4 h-4 text-white" />
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
                className="h-9 rounded-lg border shadow-xs transition-all active:scale-95 flex items-center justify-center bg-primary text-white hover:bg-primary-hover border-primary/40"
                style={{ backgroundColor: "#038b8c", color: "#ffffff" }}
                title="Toán tử trừ"
              >
                <OperatorSymbol op="-" className="w-4 h-4 text-white" />
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
                className="h-9 rounded-lg border shadow-xs transition-all active:scale-95 flex items-center justify-center bg-primary text-white hover:bg-primary-hover border-primary/40"
                style={{ backgroundColor: "#038b8c", color: "#ffffff" }}
                title="Toán tử cộng"
              >
                <OperatorSymbol op="+" className="w-4 h-4 text-white" />
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
            <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/80">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleBackspace}
                className="h-8 rounded-lg bg-secondary hover:bg-secondary-hover text-foreground font-semibold text-xs border border-border transition-all flex items-center justify-center gap-1 active:scale-95 shadow-2xs"
                title="Xóa phần tử trước vị trí con trỏ"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" /> Xóa ký tự
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClearAll}
                className="h-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold text-xs border border-destructive/20 transition-all flex items-center justify-center gap-1 active:scale-95 shadow-2xs"
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
