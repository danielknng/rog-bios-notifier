/**
 * Loads the last known state from KV.
 * Returns null if no entry exists yet (first run).
 */
export async function loadStoredState(env, kvKey) {
  return await env.STATE.get(kvKey, "json"); // "json" tells Cloudflare to parse the value directly
}

/**
 * Writes a full state snapshot to KV.
 */
export async function saveCurrentState(env, kvKey, state) {
  await env.STATE.put(kvKey, JSON.stringify(state));
}

/**
 * Updates only checkedAt without touching the rest of the state.
 * Called when the version has not changed.
 */
export async function updateCheckedAtOnly(env, kvKey, previousState) {
  const updated = {
    ...previousState,
    checkedAt: new Date().toISOString()
  };

  await env.STATE.put(kvKey, JSON.stringify(updated));
}
