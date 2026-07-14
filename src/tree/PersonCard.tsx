import { forwardRef } from "react";
import type { Individual } from "../api/types";
import { LifeDates } from "../components/LifeDates";
import { personLabel } from "./buildGraph";
import { lifeSpanYearLabel } from "../lib/birthDate";
import { CARD_HEIGHT, CARD_WIDTH } from "./layoutTree";

interface PersonCardProps {
  person: Individual;
  x: number;
  y: number;
  selected: boolean;
  onClick: () => void;
}

function initials(person: Individual): string {
  const g = person.givenName?.[0] ?? "";
  const s = person.surname?.[0] ?? "";
  return (g + s).toUpperCase() || "?";
}

function avatarColor(sex?: Individual["sex"]): string {
  if (sex === "F") return "#f8bbd0";
  if (sex === "M") return "#bbdefb";
  return "#e0e0e0";
}

export const PersonCard = forwardRef<HTMLButtonElement, PersonCardProps>(
  function PersonCard({ person, x, y, selected, onClick }, ref) {
    const dates = lifeSpanYearLabel(person.birthDate, person.deathDate);

    return (
      <button
        ref={ref}
        type="button"
        className={`person-card${selected ? " person-card--selected" : ""}${person.isLiving ? "" : " person-card--deceased"}`}
        style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
        onClick={onClick}
      >
        <div className="person-card__content">
          <div className="person-card__photo" aria-hidden>
            <span
              className="person-card__photo-placeholder"
              style={{ background: avatarColor(person.sex) }}
            >
              {initials(person)}
            </span>
          </div>
          <div className="person-card__body">
            <div className="person-card__name">{person.givenName ?? "—"}</div>
            {person.surname && (
              <div className="person-card__surname">{person.surname}</div>
            )}
            <LifeDates
              birthDate={person.birthDate}
              deathDate={person.deathDate}
              yearOnly
              stacked
              className="person-card__dates life-dates"
            />
          </div>
        </div>
        <span className="person-card__sr-only">
          {personLabel(person)}
          {dates ? `, ${dates}` : ""}
        </span>
      </button>
    );
  },
);
