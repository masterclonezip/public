import * as OTPAuth from 'otpauth';

/**
 * Generates a new random Base32 secret for TOTP.
 * @returns A random Base32 string.
 */
export function generateTOTPSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * Generates the TOTP Auth URI for QR code generation.
 * @param email The user's email address.
 * @param secret The Base32 secret string.
 * @returns The otpauth:// URI.
 */
export function getTOTPURI(email: string, secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: 'AdminVault',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  });
  return totp.toString();
}

/**
 * Verifies a TOTP token.
 * @param token The 6-digit code entered by the user.
 * @param secret The Base32 secret string.
 * @returns true if valid, false otherwise.
 */
export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'AdminVault',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });
    const delta = totp.validate({
      token: token.trim(),
      window: 1, // allow +/- 30 seconds clock drift
    });
    return delta !== null;
  } catch (err) {
    console.error('TOTP verification error:', err);
    return false;
  }
}
