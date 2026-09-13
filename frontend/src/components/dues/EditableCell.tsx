import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string | number | null | undefined;
  type: "text" | "number";
  disabled?: boolean;
  onSave: (newValue: string) => void;
  className?: string;
}

export const EditableCell = ({
  value,
  type,
  disabled = false,
  onSave,
  className,
}: EditableCellProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value ?? ""));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleCommit = () => {
    setEditing(false);
    const original = String(value ?? "");
    const trimmed = draft.trim();

    if (trimmed && trimmed !== original) {
      onSave(trimmed);
      return;
    }

    setDraft(original);
  };

  const handleCancel = () => {
    setDraft(String(value ?? ""));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleCommit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            handleCancel();
          }
        }}
        className={cn(
          "h-8 w-full rounded-md border border-input bg-background px-2 text-xs sm:text-sm",
          className
        )}
      />
    );
  }

  const displayValue = String(value ?? "").trim();

  return (
    <span
      onClick={() => {
        if (!disabled) setEditing(true);
      }}
      className={cn(
        "inline-flex min-h-8 w-full items-center rounded-md px-2 py-1 text-xs sm:text-sm",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-text hover:bg-muted/40",
        className
      )}
    >
      {displayValue || "-"}
    </span>
  );
};
