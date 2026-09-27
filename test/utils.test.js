import { test } from "node:test";
import assert from "node:assert/strict";
import { compareVersions } from "../src/utils.js";

test("compareVersions: newer, older, equal", () => {
  assert.equal(compareVersions("1201", "1102"), 1);
  assert.equal(compareVersions("1102", "1201"), -1);
  assert.equal(compareVersions("1201", "1201"), 0);
});

test("compareVersions: different segment counts", () => {
  assert.equal(compareVersions("12", "12.0.1"), -1);
  assert.equal(compareVersions("12.0.0", "12"), 0);
});

test("compareVersions: non-numeric segments fall back to 0", () => {
  assert.equal(compareVersions("12.x", "12.0"), 0);
});
