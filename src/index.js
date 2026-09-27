import { getConfig, validateConfig } from "./config.js";
import { fetchBiosInfo } from "./asus.js";
import { sendDiscordNotification } from "./discord.js";
import {
  loadStoredState,
  saveCurrentState,
  updateCheckedAtOnly
} from "./state.js";
import { compareVersions, jsonResponse } from "./utils.js";

export default {
  // Invoked by the Cloudflare cron trigger (schedule defined in wrangler.jsonc)
  async scheduled(controller, env, ctx) {
    // ctx.waitUntil keeps the Worker alive until runCheck has finished
    ctx.waitUntil(runCheck(env, { forceNotify: false, manual: false }));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/run") {
        const result = await runCheck(env, { forceNotify: false, manual: true });
        return jsonResponse(result, 200);
      }

      if (url.pathname === "/notify-test") {
        // Sends a Discord notification even if the version has not changed
        const result = await runCheck(env, { forceNotify: true, manual: true });
        return jsonResponse(result, 200);
      }

      if (url.pathname === "/state") {
        const config = getConfig(env);
        validateConfig(config);

        const states = await Promise.all(
          config.targets.map(async (target) => ({
            kvKey: target.kvKey,
            productName: target.productName,
            state: await loadStoredState(env, target.kvKey) || null
          }))
        );

        return jsonResponse({ ok: true, states }, 200);
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        },
        500
      );
    }
  }
};

async function runCheck(env, options = {}) {
  const config = getConfig(env);
  validateConfig(config);

  const forceNotify = options.forceNotify === true;
  const manual = options.manual === true;

  const results = [];

  // Each target is checked and notified independently, one target
  // failing does not stop the others from running.
  for (const target of config.targets) {
    try {
      results.push(await runCheckForTarget(env, target, forceNotify, manual));
    } catch (error) {
      results.push({
        ok: false,
        kvKey: target.kvKey,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    ok: results.every((result) => result.ok !== false),
    manual,
    results
  };
}

async function runCheckForTarget(env, target, forceNotify, manual) {
  const current = await fetchBiosInfo(target);

  // null on the very first run before any state has been saved
  const previous = await loadStoredState(env, target.kvKey);

  const currentState = {
    productName: target.productName,
    version: current.version,
    releaseDate: current.releaseDate,
    sha256: current.sha256,
    changelog: current.changelog,
    fileSize: current.fileSize,
    downloadUrl: current.downloadUrl,
    pageUrl: target.pageUrl,
    checkedAt: new Date().toISOString()
  };

  // First run: no previous version to compare against, just save and exit
  if (!previous) {
    await saveCurrentState(env, target.kvKey, currentState);

    return {
      ok: true,
      kvKey: target.kvKey,
      initialized: true,
      changed: false,
      notified: false,
      manual,
      previous: null,
      current: currentState
    };
  }

  // > 0 means current is newer than previous
  const versionDiff = compareVersions(current.version, previous.version);
  const changed = versionDiff > 0;
  const shouldNotify = changed || forceNotify;

  if (shouldNotify) {
    await sendDiscordNotification(target, {
      previousVersion: previous.version,
      currentVersion: current.version,
      releaseDate: current.releaseDate,
      sha256: current.sha256,
      changelog: current.changelog,
      fileSize: current.fileSize,
      downloadUrl: current.downloadUrl,
      forceNotify
    });
  }

  if (changed) {
    await saveCurrentState(env, target.kvKey, currentState);
  } else {
    // No version change, only update the timestamp
    await updateCheckedAtOnly(env, target.kvKey, previous);
  }

  return {
    ok: true,
    kvKey: target.kvKey,
    initialized: false,
    changed,
    notified: shouldNotify,
    manual,
    previous,
    current: currentState
  };
}
