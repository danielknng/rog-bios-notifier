/**
 * Compares two version strings (e.g. "2503").
 * Returns 1 if a is newer, -1 if older, 0 if equal.
 */
export function compareVersions(leftVersion, rightVersion) {
  const left = String(leftVersion)
    .split(".")
    .map((part) => parseInt(part, 10) || 0);

  const right = String(rightVersion)
    .split(".")
    .map((part) => parseInt(part, 10) || 0);

  // Use the longer array length so we don't miss trailing segments
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index++) {
    // || 0 because the shorter array returns undefined at this index
    const leftValue = left[index] || 0;
    const rightValue = right[index] || 0;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

/**
 * Returns a consistent JSON response.
 */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8"
    }
  });
}
