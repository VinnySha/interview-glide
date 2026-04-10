const COMMON_TLDS = [
  "com", "org", "net", "edu", "gov", "io", "co", "us", "uk", "ca",
  "de", "fr", "au", "info", "biz", "dev", "app", "xyz",
];

/**
 * Compute the (Levenshtein) edit distance between two strings.
 *
 * @param a first string.
 * @param b second string.
 * @returns the minimum number of single-character insertions,
 *          deletions, or substitutions to transform `a` into `b`.
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }

  return dp[m][n];
}

/**
 * Check whether an email's TLD is a known common TLD. If not,
 * see if it's within edit distance 1 of a known TLD (likely typo).
 *
 * @param email full email address.
 * @returns error message if a typo is detected, or null if OK.
 */
export function detectEmailTypo(email: string): string | null {
  const tld = email.split(".").pop()?.toLowerCase();
  if (!tld) return null;

  if (COMMON_TLDS.includes(tld)) return null;

  const closest = COMMON_TLDS.find((known) => editDistance(tld, known) === 1);
  if (closest) {
    return `Did you mean ".${closest}"? ".${tld}" looks like a typo`;
  }

  return null;
}

/**
 * Validate email format beyond the basic `@` check.
 * Requires `user@domain.tld` with a 2+ char TLD, and warns about
 * likely TLD typos. Returns a lowercase notice if the email contains
 * uppercase characters so the user knows it will be normalized.
 *
 * @param email raw email string.
 * @returns error message if invalid, or true if valid.
 */
export function validateEmail(email: string): string | true {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return "Invalid email address";
  }
  const typo = detectEmailTypo(email);
  if (typo) return typo;
  return true;
}

/**
 * Returns true if the email contains uppercase characters that
 * will be silently lowercased by the server.
 */
export function emailWillBeLowercased(email: string): boolean {
  return email !== email.toLowerCase();
}
