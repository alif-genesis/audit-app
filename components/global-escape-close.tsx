"use client";

import { useEffect } from "react";

export function GlobalEscapeClose() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (document.querySelector(".custom-select-menu")) {
        return;
      }

      const closeButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".modal-backdrop .modal-close"),
      );
      closeButtons.at(-1)?.click();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
