import {
  BIRTH_SYMBOL,
  DEATH_SYMBOL,
  extractYearFromPersonDate,
} from "../lib/birthDate";

interface LifeDatesProps {
  birthDate?: string | null;
  deathDate?: string | null;
  className?: string;
  yearOnly?: boolean;
  stacked?: boolean;
}

function displayValue(
  date: string,
  yearOnly: boolean,
): string | null {
  if (!yearOnly) return date;
  return extractYearFromPersonDate(date);
}

export function LifeDates({
  birthDate,
  deathDate,
  className = "life-dates",
  yearOnly = false,
  stacked = false,
}: LifeDatesProps) {
  const birth = birthDate ? displayValue(birthDate, yearOnly) : null;
  const death = deathDate ? displayValue(deathDate, yearOnly) : null;

  if (!birth && !death) return null;

  if (stacked) {
    return (
      <div className={`${className} life-dates--stacked`}>
        {birth && (
          <span className="life-dates__item life-dates__item--birth">
            <span className="life-dates__symbol" aria-hidden>
              {BIRTH_SYMBOL}
            </span>
            <span className="life-dates__value">{birth}</span>
          </span>
        )}
        {death && (
          <span className="life-dates__item life-dates__item--death">
            <span className="life-dates__symbol" aria-hidden>
              {DEATH_SYMBOL}
            </span>
            <span className="life-dates__value">{death}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {birth && (
        <span className="life-dates__item life-dates__item--birth">
          <span className="life-dates__symbol" aria-hidden>
            {BIRTH_SYMBOL}
          </span>
          <span className="life-dates__value">{birth}</span>
        </span>
      )}
      {birth && death && (
        <span className="life-dates__sep" aria-hidden>
          –
        </span>
      )}
      {death && (
        <span className="life-dates__item life-dates__item--death">
          <span className="life-dates__symbol" aria-hidden>
            {DEATH_SYMBOL}
          </span>
          <span className="life-dates__value">{death}</span>
        </span>
      )}
    </div>
  );
}
