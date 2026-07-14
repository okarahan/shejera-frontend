import { forwardRef } from "react";
import type { Individual } from "../api/types";
import { personLabel } from "./buildGraph";
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
    return (
      <button
        ref={ref}
        type="button"
        className={`person-card${selected ? " person-card--selected" : ""}${person.isLiving ? "" : " person-card--deceased"}`}
        style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
        onClick={onClick}
      >
        <div
          className="person-card__avatar"
          style={{ background: avatarColor(person.sex) }}
        >
          {initials(person)}
        </div>
        <div className="person-card__name">{person.givenName ?? "—"}</div>
        <div className="person-card__surname">{person.surname ?? ""}</div>
        <span className="person-card__sr-only">{personLabel(person)}</span>
      </button>
    );
  },
);
