/** Valid US state and territory 2-letter codes. */
export const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "VI", "GU", "AS", "MP",
]);

/**
 * Validate a 2-letter US state/territory code.
 *
 * @param code uppercase 2-letter string from user input.
 * @returns true if valid, or an error message string.
 */
export function validateStateCode(code: string): string | true {
  const upper = code.toUpperCase();
  if (!US_STATE_CODES.has(upper)) {
    return "Invalid US state code";
  }
  return true;
}
