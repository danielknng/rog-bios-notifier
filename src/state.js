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

/**
 * Loads the last error message that was already reported to Discord for
 * this target, so a still-broken check isn't re-reported on every run.
 */
export async function loadStoredError(env, kvKey) {
  return await env.STATE.get(errorKey(kvKey));
}

export async function saveStoredError(env, kvKey, message) {
  await env.STATE.put(errorKey(kvKey), message);
}

/**
 * Called once a check succeeds again, so the next failure (even an
 * identical one) gets reported instead of being treated as already known.
 */
export async function clearStoredError(env, kvKey) {
  await env.STATE.delete(errorKey(kvKey));
}

function errorKey(kvKey) {
  return kvKey + "-last-error";
}
