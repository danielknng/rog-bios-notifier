/**
 * Fetches the ASUS support API and returns version, releaseDate,
 * sha256, changelog, fileSize and downloadUrl for the newest BIOS.
 */
export async function fetchBiosInfo(config) {
  const json = await fetchJson(buildApiUrl(config));
  const entry = extractLatestBios(json);

  if (!entry || !entry.Version) {
    throw new Error("Could not find a BIOS version in the ASUS API response");
  }

  return {
    productName: config.productName,
    version: entry.Version,
    releaseDate: entry.ReleaseDate || null,
    sha256: entry.sha256 || null,
    changelog: normalizeChangelog(entry.Description),
    fileSize: entry.FileSize || null,
    downloadUrl: normalizeDownloadUrl(entry.DownloadUrl && entry.DownloadUrl.Global),
    pageUrl: config.pageUrl
  };
}

// This is the same endpoint the ASUS helpdesk_bios page itself calls;
// asusModel/asusM1Id/asusLevelTagId are read off of that request, they
// are not documented anywhere and have no relation to the product name.
function buildApiUrl(config) {
  const params = new URLSearchParams({
    website: "global",
    model: config.asusModel,
    pdid: "0",
    m1id: config.asusM1Id,
    cpu: "",
    LevelTagId: config.asusLevelTagId,
    systemCode: "rog"
  });

  return "https://rog.asus.com/support/webapi/ProductV2/GetPDBIOS?" + params.toString();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "user-agent": "Mozilla/5.0 rog-bios-notifier/1.0",
      "accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to load ASUS BIOS API. HTTP " + response.status);
  }

  return await response.json();
}

/**
 * The "BIOS" group holds every historical release, newest first.
 */
function extractLatestBios(json) {
  const groups = json && json.Result && json.Result.Obj;
  if (!Array.isArray(groups)) return null;

  const biosGroup = groups.find((group) => group.Name === "BIOS");
  if (!biosGroup || !Array.isArray(biosGroup.Files) || !biosGroup.Files.length) {
    return null;
  }

  return biosGroup.Files[0];
}

function normalizeChangelog(rawDescription) {
  if (!rawDescription) return null;

  return rawDescription
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .trim()
    .replace(/^"+|"+$/g, "") // ASUS wraps the changelog text itself in literal quote characters
    .trim();
}

// Some products return an absolute URL, others a path relative to ASUS' CDN.
function normalizeDownloadUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : "https://dlcdnets.asus.com" + url;
}
