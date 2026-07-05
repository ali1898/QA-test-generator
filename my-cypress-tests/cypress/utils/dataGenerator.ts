export function randomString(length = 8): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

export function randomEmail(domain = "test.com"): string {
  return `user_${randomString()}@${domain}`;
}

export function nationalCodeGenerator(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const sum = digits.reduce((acc, d, i) => acc + d * (10 - i), 0);
  const remainder = sum % 11;
  const control = remainder < 2 ? 0 : 11 - remainder;
  return [...digits, control].join("");
}

export function phoneNumberGenerator(): string {
  const prefix = "0912";
  const rest = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join("");
  return `${prefix}${rest}`;
}
