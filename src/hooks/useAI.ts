// ── useAI — Ollama health + model availability ─────────────
import { useState, useEffect, useCallback } from 'react';
import { checkOllamaHealth, MODELS } from '../lib/ollamaClient';

export interface AIStatus {
  available: boolean;
  models: string[];
  checking: boolean;
  lastChecked: Date | null;
  error: string | null;
}

export function useAI() {
  const [status, setStatus] = useState<AIStatus>({
    available: false,
    models: [],
    checking: true,
    lastChecked: null,
    error: null,
  });

  const check = useCallback(async () => {
    setStatus((s) => ({ ...s, checking: true, error: null }));
    const result = await checkOllamaHealth();
    setStatus({
      available: result.ok,
      models: result.models,
      checking: false,
      lastChecked: new Date(),
      error: result.ok ? null : 'Ollama not reachable at http://localhost:11434',
    });
  }, []);

  useEffect(() => {
    check();
    // Re-check every 60 seconds
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [check]);

  const hasModel = (role: keyof typeof MODELS) =>
    status.models.some((m) => m.startsWith(MODELS[role].split(':')[0]));

  return { status, check, hasModel };
}
