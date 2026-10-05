import { useState } from "react";

/**
 * Server-rendered counts already include everything saved before the page loaded. This tracks
 * what the user does afterwards (+1 / -1) on top, and drops the offset when fresh server data arrives.
 */
export function useCountDelta(server: number) {
  const [state, setState] = useState({ server, delta: 0 });
  if (state.server !== server) setState({ server, delta: 0 });
  const delta = state.server === server ? state.delta : 0;
  const bump = (by: number) => setState((s) => ({ server: s.server, delta: s.delta + by }));
  return [server + delta, bump] as const;
}
