// Add or remove entries here to change which ASUS motherboard BIOS pages are watched.
// Each target needs a Discord webhook secret in Cloudflare named
// DISCORD_WEBHOOK_URL_<ID> (uppercase, hyphens replaced with underscores),
// e.g. id "x870e-e-wifi" reads DISCORD_WEBHOOK_URL_X870E_E_WIFI.
// Comma-separate multiple webhooks per secret.
//
// asusModel, asusM1Id and asusLevelTagId aren't shown anywhere on the page
// itself. To find them, open the motherboard's helpdesk_bios page with your
// browser's network tab open and look for the request to
// rog.asus.com/support/webapi/ProductV2/GetPDBIOS, its query string has
// all three (model, m1id, LevelTagId).
const TARGETS = [
  {
    id: "x870e-e-wifi",
    productName: "ROG STRIX X870E-E GAMING WIFI BIOS",
    pageUrl: "https://rog.asus.com/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi/helpdesk_bios/",
    asusModel: "rog-strix-x870e-e-gaming-wifi",
    asusM1Id: "28607",
    asusLevelTagId: "231962"
  }
];

/**
 * Builds the config object from TARGETS and the Cloudflare Worker env
 * context. env only supplies the webhook secrets and the KV binding.
 */
export function getConfig(env) {
  return {
    targets: TARGETS.map((target) => ({
      asusModel: target.asusModel,
      asusM1Id: target.asusM1Id,
      asusLevelTagId: target.asusLevelTagId,
      productName: target.productName,
      pageUrl: target.pageUrl,
      kvKey: "asus-" + target.id + "-bios-version",
      // Cloudflare secret names can't contain hyphens, env vars can only use A-Z, 0-9 and _
      discordWebhookUrls: (env["DISCORD_WEBHOOK_URL_" + target.id.toUpperCase().replace(/-/g, "_")] || "")
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean)
    })),
    stateBinding: env.STATE // the KV namespace object itself, not just a name
  };
}

/**
 * Throws if a required config value is missing.
 * Called right after getConfig so problems surface before any requests are made.
 */
export function validateConfig(config) {
  if (!config.stateBinding) {
    throw new Error("KV binding STATE is missing");
  }

  if (!config.targets.length) {
    throw new Error("No targets configured in TARGETS");
  }

  config.targets.forEach((target) => {
    if (!target.discordWebhookUrls.length) {
      throw new Error("Missing Discord webhook secret for target with kvKey " + target.kvKey);
    }

    if (!target.asusModel || !target.asusM1Id || !target.asusLevelTagId) {
      throw new Error(
        "Target with kvKey " + target.kvKey + " is missing asusModel, asusM1Id or asusLevelTagId"
      );
    }
  });
}
