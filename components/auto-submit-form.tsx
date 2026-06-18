"use client";

import { useRef } from "react";

type AutoSubmitFormProps = {
  action: string;
  className?: string;
  children: React.ReactNode;
};

export function AutoSubmitForm({
  action,
  className,
  children,
}: AutoSubmitFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function submitWithDelay(delay = 350) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      formRef.current?.requestSubmit();
    }, delay);
  }

  return (
    <form
      action={action}
      className={className}
      method="get"
      ref={formRef}
      onChange={() => submitWithDelay(0)}
      onInput={() => submitWithDelay()}
    >
      {children}
    </form>
  );
}
