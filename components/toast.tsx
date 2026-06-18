"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  type?: "success" | "error";
  message?: string;
  id?: string | number;
};

export function Toast({ type = "success", message, id }: ToastProps) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));

    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [id, message, type]);

  if (!message || !visible) {
    return null;
  }

  return <div className={`toast ${type}-toast`}>{message}</div>;
}
