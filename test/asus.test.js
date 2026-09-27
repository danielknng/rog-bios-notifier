import { test } from "node:test";
import assert from "node:assert/strict";
import { extractLatestBios, normalizeChangelog, normalizeDownloadUrl } from "../src/asus.js";

function makeApiResponse(files) {
  return { Result: { Obj: [{ Name: "BIOS", Files: files }] } };
}

test("extractLatestBios: picks the first entry with IsRelease \"1\", not just index 0", () => {
  const json = makeApiResponse([
    { Version: "1301", IsRelease: "0" }, // beta, listed first
    { Version: "1201", IsRelease: "1" }, // latest stable
    { Version: "1102", IsRelease: "1" }
  ]);

  assert.equal(extractLatestBios(json).Version, "1201");
});

test("extractLatestBios: falls back to the first entry when none are marked IsRelease \"1\"", () => {
  const json = makeApiResponse([
    { Version: "1301", IsRelease: "0" },
    { Version: "1201", IsRelease: "0" }
  ]);

  assert.equal(extractLatestBios(json).Version, "1301");
});

test("extractLatestBios: returns null when the BIOS group is missing", () => {
  const json = { Result: { Obj: [{ Name: "VGA", Files: [{ Version: "1" }] }] } };
  assert.equal(extractLatestBios(json), null);
});

test("extractLatestBios: returns null on a malformed response", () => {
  assert.equal(extractLatestBios({}), null);
  assert.equal(extractLatestBios(null), null);
  assert.equal(extractLatestBios(makeApiResponse([])), null);
});

test("normalizeChangelog: strips <br> tags, other tags, entities and wrapping quotes", () => {
  const raw = "\"Improve<br/>system &amp; memory<br>stability.\"";
  assert.equal(normalizeChangelog(raw), "Improve\nsystem & memory\nstability.");
});

test("normalizeChangelog: returns null for empty input", () => {
  assert.equal(normalizeChangelog(""), null);
  assert.equal(normalizeChangelog(null), null);
});

test("normalizeDownloadUrl: prefixes a relative path with the ASUS CDN host", () => {
  assert.equal(
    normalizeDownloadUrl("/path/to/bios.zip"),
    "https://dlcdnets.asus.com/path/to/bios.zip"
  );
});

test("normalizeDownloadUrl: keeps an already-absolute URL as-is", () => {
  assert.equal(
    normalizeDownloadUrl("https://example.com/bios.zip"),
    "https://example.com/bios.zip"
  );
});

test("normalizeDownloadUrl: returns null for empty input", () => {
  assert.equal(normalizeDownloadUrl(null), null);
  assert.equal(normalizeDownloadUrl(undefined), null);
});
