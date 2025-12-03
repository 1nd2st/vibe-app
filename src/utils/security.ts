// Password security utilities
import * as Crypto from "expo-crypto";

// Generate a random salt
export async function generateSalt(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Hash password with salt using SHA-256
export async function hashPassword(
  password: string,
  salt: string
): Promise<string> {
  const combined = password + salt;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
  return hash;
}

// Verify password
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash === hash;
}

// Generate random temporary password
export function generateTempPassword(length: number = 12): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  const all = uppercase + lowercase + numbers + special;

  let password = "";
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// Validate password against policy
export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special_char: boolean;
}

export function validatePassword(
  password: string,
  policy: PasswordPolicy
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < policy.min_length) {
    errors.push(`Password must be at least ${policy.min_length} characters`);
  }

  if (policy.require_uppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (policy.require_lowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (policy.require_number && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (policy.require_special_char && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Generate UUID (for items, collections, etc.)
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get device info for audit trail
export async function getDeviceInfo(): Promise<{
  deviceId: string;
  appVersion: string;
}> {
  // In a real app, you'd use expo-device and expo-application
  // For now, return placeholder values
  return {
    deviceId: "DEVICE_ID", // Replace with actual device ID
    appVersion: "1.0.0", // Replace with actual app version
  };
}

// Get session ID (generate once per login, store in memory)
let currentSessionId: string | null = null;

export function generateSessionId(): string {
  currentSessionId = generateUUID();
  return currentSessionId;
}

export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

export function clearSessionId(): void {
  currentSessionId = null;
}
