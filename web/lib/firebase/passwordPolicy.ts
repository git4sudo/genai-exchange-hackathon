export function checkPassword(pw: string) {
  const reasons: string[] = [];
  if (pw.length < 8) reasons.push("At least 8 characters");
  if (!/[a-z]/.test(pw)) reasons.push("At least one lowercase letter");
  if (!/[A-Z]/.test(pw)) reasons.push("At least one uppercase letter");
  if (!/[0-9]/.test(pw)) reasons.push("At least one number");
  if (!/[!@#$%^&*()[\]{}\-_=+,.?;:<>|/~`]/.test(pw)) reasons.push("At least one special character");
  return { ok: reasons.length === 0, reasons };
}
