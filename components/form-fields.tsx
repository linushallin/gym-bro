"use client";

import { useId, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle } from "lucide-react";
import type { AuthFormState } from "@/lib/auth-schemas";

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none transition-colors focus:border-accent aria-[invalid=true]:border-critical";

export function TextField({
  label,
  name,
  type = "text",
  errors,
  hint,
  ...inputProps
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  errors?: string[];
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type">) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const describedBy = errors?.length ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT_CLASS} ${isPassword ? "pr-11" : ""}`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-subtle hover:text-foreground"
            aria-label={revealed ? "Dölj lösenord" : "Visa lösenord"}
          >
            {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {errors?.length ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-critical">
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: ReactNode;
  variant?: "primary" | "danger";
}) {
  const { pending } = useFormStatus();
  const colors =
    variant === "danger"
      ? "bg-critical/15 text-critical hover:bg-critical/25"
      : "bg-accent text-accent-foreground hover:bg-accent-hover";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 ${colors}`}
    >
      {pending && <LoaderCircle size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function FormAlert({ state }: { state: AuthFormState }) {
  if (state?.error) {
    return (
      <div role="alert" className="flex gap-2.5 rounded-lg border border-critical/30 bg-critical/10 p-3 text-sm text-critical">
        <CircleAlert size={17} className="mt-px shrink-0" />
        <p>{state.error}</p>
      </div>
    );
  }
  if (state?.success) {
    return (
      <div role="status" className="flex gap-2.5 rounded-lg border border-good/30 bg-good/10 p-3 text-sm text-good">
        <CircleCheck size={17} className="mt-px shrink-0" />
        <p>{state.success}</p>
      </div>
    );
  }
  return null;
}
