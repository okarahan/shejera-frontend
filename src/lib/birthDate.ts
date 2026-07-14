export const BIRTH_DATE_HINT = "TT.MM.JJJJ oder JJJJ";

const YEAR_ONLY = /^\d{4}$/;
const DAY_MONTH_YEAR = /^\d{2}\.\d{2}\.\d{4}$/;

export function isValidBirthDate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return YEAR_ONLY.test(trimmed) || DAY_MONTH_YEAR.test(trimmed);
}

export function birthDateError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isValidBirthDate(trimmed)) return null;
  return `Format: ${BIRTH_DATE_HINT}`;
}
