declare global {
  var __aegisChaosMossDown: boolean | undefined;
  var __aegisChaosResetTimer: ReturnType<typeof setTimeout> | undefined;
}

/**
 * A demo-only "chaos toggle" that simulates a full Moss outage on command,
 * independent of whether Moss is actually reachable. This exists so the
 * reliability/failover story (see src/lib/moss.ts, guardrails.ts, agent.ts)
 * is demonstrable on demand — for a recorded walkthrough, or for a judge who
 * wants to poke at the claim themselves — rather than depending on Moss's
 * real uptime at that exact moment.
 *
 * Auto-resets so a forgotten toggle can't strand the public demo in a
 * permanently degraded state.
 */
export const CHAOS_AUTO_RESET_MS = 90_000;

export function isChaosMossDown(): boolean {
  return globalThis.__aegisChaosMossDown === true;
}

export function setChaosMossDown(down: boolean): void {
  globalThis.__aegisChaosMossDown = down;
  if (globalThis.__aegisChaosResetTimer) {
    clearTimeout(globalThis.__aegisChaosResetTimer);
    globalThis.__aegisChaosResetTimer = undefined;
  }
  if (down) {
    globalThis.__aegisChaosResetTimer = setTimeout(() => {
      globalThis.__aegisChaosMossDown = false;
    }, CHAOS_AUTO_RESET_MS);
  }
}
