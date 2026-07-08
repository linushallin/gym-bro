"use client";

import type { ReactNode } from "react";

export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
  ariaLabel,
}: {
  confirmMessage: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
