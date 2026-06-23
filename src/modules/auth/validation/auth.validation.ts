import { RegisterInput } from "../schema/auth.schema.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): { ok: true; value: string } | { ok: false; message: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { ok: false, message: "Email is required" };
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return { ok: false, message: "Invalid email address" };
  }
  return { ok: true, value: trimmed };
}

export function validatePassword(
  password: string,
  minLength: number
): { ok: true } | { ok: false; message: string } {
  if (!password || password.length < minLength) {
    return { ok: false, message: `Password must be at least ${minLength} characters` };
  }
  return { ok: true };
}

export function validateRegisterInput(
  input: RegisterInput,
  minLength: number
): { ok: true; email: string; password: string } | { ok: false; message: string } {
  const emailResult = validateEmail(input.email);
  if (!emailResult.ok) {
    return emailResult;
  }
  const passwordResult = validatePassword(input.password, minLength);
  if (!passwordResult.ok) {
    return passwordResult;
  }
  return { ok: true, email: emailResult.value, password: input.password };
}
