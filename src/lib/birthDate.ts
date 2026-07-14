export const PERSON_DATE_HINT = "TT.MM.JJJJ oder JJJJ";
export const BIRTH_DATE_HINT = PERSON_DATE_HINT;
export const BIRTH_SYMBOL = "*";
export const DEATH_SYMBOL = "†";

const YEAR_ONLY = /^\d{4}$/;
const DAY_MONTH_YEAR = /^(\d{2})\.(\d{2})\.(\d{4})$/;

export function isValidPersonDate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return YEAR_ONLY.test(trimmed) || DAY_MONTH_YEAR.test(trimmed);
}

export const isValidBirthDate = isValidPersonDate;

export function personDateError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isValidPersonDate(trimmed)) return null;
  return `Format: ${PERSON_DATE_HINT}`;
}

export const birthDateError = personDateError;

export function extractYearFromPersonDate(
  value?: string | null,
): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (YEAR_ONLY.test(trimmed)) return trimmed;
  const match = DAY_MONTH_YEAR.exec(trimmed);
  if (match) return match[3];
  return null;
}

export function lifeSpanLabel(
  birthDate?: string | null,
  deathDate?: string | null,
  yearOnly = false,
): string | null {
  const birth = yearOnly
    ? extractYearFromPersonDate(birthDate)
    : birthDate?.trim() || null;
  const death = yearOnly
    ? extractYearFromPersonDate(deathDate)
    : deathDate?.trim() || null;

  if (birth && death) {
    return `${BIRTH_SYMBOL} ${birth} – ${DEATH_SYMBOL} ${death}`;
  }
  if (birth) return `${BIRTH_SYMBOL} ${birth}`;
  if (death) return `${DEATH_SYMBOL} ${death}`;
  return null;
}

export const lifeSpanYearLabel = (
  birthDate?: string | null,
  deathDate?: string | null,
) => lifeSpanLabel(birthDate, deathDate, true);
