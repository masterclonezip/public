import {
  getEnvSecretKeys,
  getAesSecret,
  encryptData,
  decryptData,
  safeEncrypt,
  safeDecrypt,
} from './cryptoUtils';

export { getEnvSecretKeys, getAesSecret, encryptData, decryptData, safeEncrypt, safeDecrypt };

export function encryptLinks(linksMap: Record<string, string>, secretKey?: string): string {
  return safeEncrypt(JSON.stringify(linksMap), secretKey);
}

export function decryptLinks(ciphertext: string, secretKey?: string): Record<string, string> {
  if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.trim()) return {};
  const dec = safeDecrypt(ciphertext.trim(), secretKey);
  if (!dec) return {};
  try {
    const parsed = JSON.parse(dec);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

export function generateSecureVaultFile(c: string, ts?: string): string {
  const defTs = "";
  return `export { getEnvSecretKeys, getAesSecret, encryptData, decryptData, safeEncrypt, safeDecrypt } from './cryptoUtils';\nexport const ENCRYPTED_LINKS = ${JSON.stringify(String(c || '').trim())};\nexport const ENCRYPTED_VAULT = ENCRYPTED_LINKS;\nexport const ENCRYPTED_TURNSTILE_SECRET = ${JSON.stringify(String(ts || defTs).trim())};\n`;
}

export const ENCRYPTED_LINKS = "v2.hQS5kwyKj7GsdBDQ.nfbGQJrc3PzY03GqyiOOMcefRgdBensCXIWGGbYimPQCVYYCE8DryNWsk2O88WIjiIdzdR6_eyiSr68yELrE7cgv1ZSLNgjH3BLWM_M7-IP3LK1MAc777p3qBkxHCjefpmk6Xy7htemkFgEt_ABh_zOGWRxzMru2XW6uyR0j650gWYsKqJqsbtSU1pxPt8ceicUWCTkmH1uib-mzUvHMabDHLRLS0-TSKIveq1tQlMGpb8S-f5a-czpRHk5HNM8gT3hgtYM6bsX5V35rTQJKgr5XogRtUnV3R54KYIgOMU8uoe6jHKrLFGaf2KoH5pqjmvc08LubNX6L6UWyx4RL3ySJixCXrQ3RH_mi0lkWrldpR4SXYp3lvbvserqDr8vB5onc6AaoX-Z70_rUc9bPfwJ0Cl8lOQIZNkeNNYMupb6VaPrcUBhl2E3ko2eItRmO0S12BbdwPgXdroO-z13CHideWfHkPptJs6nu3PXQLKOFIhqcWdWFu8YPawq3RzwIDV4xH70fV3NVjOprJxE-71HFuLJ1iuVn7DXFyqF94fgzh5VgMe53waJNnFoMDVgaRyCfvFCsBH3KV7mLQJx9ajqg-Tr63lsyM67AGhZJFsLD1SPoIiiuL_YP1vnNY9AE4vfQw0vBJIDHAwkXm45QWt-7rIdLsWlyivDrIV_-u3XiRn1_xSg1InjK2CSEZNu10pN3zee3PWbCg3SgygCYCOVC9cWaaoOWd8UM_KHYU2NTaYMdhHp18IfFOzYsf76g_4ceXhIL1vox1NOUIYhdyRMFAH08GRQ1dTypanP7bFQIbr4W2SFVpiiydtMg0XHN6d-_kHGlZCp-H5jKzYHsKoa9l_J5zOyyqgI4ZGm4cakZH6slue3KNqwUj0JSuaU2FlHw4VpcdcdDJ5MLddNKCp9NzwunBQG2Y8nVtW2erikzJ948mlCVtowq0UFKd1KAZC9olW40r27LPU4hKg5LNJfQcTgfjR9qjS4zcop14emTyGja_FNyPCv3m_eAjCKwPbyr-a4VB_X91mgC3obiCxmduGKn1_TBSYdjpI77FMokFI55mYxzabdPjtCjP514q4_bH_9brEls-587gwBPsICG8bVsOvPm4_N_fNo2V-CqWJRHlmZUcHdZxN-vLvq_uoW1-pXyNm_XRanKnavV1EQPZGZ0UsIhw2Fza64qQeo0kKsiIanwwJRYxITX7M13NfPQp4VWZSg6WsPccHuWz7LDDs5zKQhqSrKaXh03C9SkMvEbLw9s-h8kOsFYaYWMHj9xEffPB9qB0yeThU67xLfdsuzmwKxKOmU30cbMEHwg95oYyHfTEIBkpco5Kg-WK7wYU4ojddjZ9H67lpJAFCy16Ddj7-CdOS3kWJotAuv1ZK2TspZyqt1F6PqOojgt6hMmX1vdQ6evLATrRTxsXD6smPa6kHxK0_vN2Vq89Ng_nZLCDKKjnQGV24taMHYZZZn6ATnyMZDmftEXvL_mr0mt5RJUyQRd-KTht6acZ74fC44Qf3Uuxa_N5u6Zk7rmcpz2xDxjCf4My2JC7Syu1zzj4yl_6AqlW-MbCRNvuMPuM5IPctL5tNylvX2lvqm10-5b673_Sb8gDXNeaMRLKuM8_OXu-dJPEXQN5cGMl8SE0uMRqobFL8HI06Oy6kveW5KBSd1kRZj9jZ0SDHpRvy0DrohEePwmlguKAv_4nlGtGxhIzoV3YjtkRhZoveqWtBeJEsiiOxz0yytxICJW7piQwNdmFg";
export const ENCRYPTED_VAULT = ENCRYPTED_LINKS;
export const ENCRYPTED_TURNSTILE_SECRET = "";
