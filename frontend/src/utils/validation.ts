// Shared format-validation helpers for the signup/login forms.
// These only check that a value is *shaped* correctly (e.g. "is this 6 digits?").
// Actual uniqueness checks (is this GR No already registered?) live in
// AuthContext, since that needs to check against the list of registered users.

export function isEmailFormatValid(email: string) {
  // Simple check: something@something.something — good enough for a
  // frontend-only mock. Real email verification has to happen server-side.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isGrNoFormatValid(grNo: string) {
  // GR No must be exactly 6 digits, numbers only — as you specified.
  return /^\d{6}$/.test(grNo.trim());
}

export function isPhoneFormatValid(phone: string) {
  // Standard 10-digit Indian mobile number, digits only.
  return /^\d{10}$/.test(phone.trim());
}