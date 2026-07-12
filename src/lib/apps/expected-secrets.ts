// Expected secret keys the HappyKids app requires (mirror of the app's
// SECRET_KEYS / CRITICAL_SECRET_KEYS). Maintained here so the dashboard can
// validate completeness per environment. If the app's key set changes, update this list.

export const EXPECTED_SECRET_KEYS: string[] = [
  "API_KEY",
  "API_SECRET",
  "DEVELOPMENT_LEVEL",
  "API_ACCOUNT",
  "API_CONTENT",
  "API_ORDER",
  "API_PAYMENT",
  "API_APPOINTMENT",
  "API_ECOM",
  "CHANNEL_ID",
  "MEMBERSHIP_PRODUCT_ID",
  "KONSUL_CHAT_PRODUCT_ID",
  "STREAM_API_KEY",
  "STREAM_API_SECRET",
  "KONSUL_CHAT_1X_PRODUCT_ID",
  "OVO_UUID",
  "TELEKONSULTASI_BIDAN_PRODUCT_ID",
  "GOOGLE_MAPS_API_KEY",
];

// Critical keys — if any fail to exist/decrypt the app treats the cache as unusable.
export const CRITICAL_SECRET_KEYS: string[] = [
  "API_KEY",
  "API_SECRET",
  "API_ACCOUNT",
  "API_CONTENT",
  "API_ORDER",
  "API_PAYMENT",
  "API_APPOINTMENT",
  "API_ECOM",
  "CHANNEL_ID",
  "MEMBERSHIP_PRODUCT_ID",
  "KONSUL_CHAT_PRODUCT_ID",
  "STREAM_API_KEY",
  "STREAM_API_SECRET",
  "KONSUL_CHAT_1X_PRODUCT_ID",
  "OVO_UUID",
  "TELEKONSULTASI_BIDAN_PRODUCT_ID",
  "GOOGLE_MAPS_API_KEY",
];
