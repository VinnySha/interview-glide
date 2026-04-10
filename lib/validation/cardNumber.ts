/**
 * Validate a card number using the Luhn algorithm.
 *
 * @param cardNumber string of digits to validate.
 * @returns true if the number passes the Luhn checksum.
 */
export function luhnCheck(cardNumber: string): boolean {
  if (!/^\d+$/.test(cardNumber)) return false;

  let sum = 0;
  let alternate = false;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Check whether a card number has a recognized issuer prefix
 * and valid length.
 *
 * Covers Visa, Mastercard, Amex, Discover, and JCB.
 *
 * @param cardNumber string of digits.
 * @returns true if prefix and length match a known issuer.
 */
export function isRecognizedCard(cardNumber: string): boolean {
  const len = cardNumber.length;

  if (/^4/.test(cardNumber) && (len === 13 || len === 16)) return true;                 // Visa
  if (/^5[1-5]/.test(cardNumber) && len === 16) return true;                            // Mastercard
  if (/^3[47]/.test(cardNumber) && len === 15) return true;                             // Amex
  if (/^6(?:011|5)/.test(cardNumber) && len === 16) return true;                        // Discover
  if (/^35(?:2[89]|[3-8])/.test(cardNumber) && (len === 15 || len === 16)) return true; // JCB

  return false;
}

/**
 * Full card number validation: recognized issuer + Luhn checksum.
 *
 * @param cardNumber raw digit string from user input.
 * @returns true if the card is structurally valid.
 */
export function isValidCardNumber(cardNumber: string): boolean {
  return isRecognizedCard(cardNumber) && luhnCheck(cardNumber);
}
