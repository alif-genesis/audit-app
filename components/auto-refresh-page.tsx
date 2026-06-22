"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshPageProps = {
  intervalMs?: number;
};

export function AutoRefreshPage({ intervalMs = 5000 }: AutoRefreshPageProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, router]);

  return null;
}
