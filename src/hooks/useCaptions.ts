/**
 * useCaptions — Load and parse VTT caption data for narration sync (P2-3).
 *
 * Fetches caption JSON from staticFile path, returns parsed Caption[] array.
 * Uses delayRender/continueRender to block rendering until captions are loaded.
 * Returns empty array on failure (graceful fallback).
 */

import { useState, useEffect, useCallback } from "react";
import { staticFile, delayRender, continueRender } from "remotion";
import type { Caption } from "@remotion/captions";

export function useCaptions(captionsFile?: string): Caption[] {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [handle] = useState(() =>
    captionsFile ? delayRender("Loading captions for narration sync") : null,
  );

  const load = useCallback(async () => {
    if (!captionsFile || !handle) return;
    try {
      const res = await fetch(staticFile(captionsFile));
      const data = await res.json();
      // Caption JSON is array of { text, startMs, endMs, ... }
      setCaptions(Array.isArray(data) ? data : []);
    } catch {
      setCaptions([]);
    }
    continueRender(handle);
  }, [captionsFile, handle]);

  useEffect(() => {
    load();
  }, [load]);

  return captions;
}
