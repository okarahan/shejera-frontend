import type { Family, Individual, SpouseRole } from "../api/types";
import { personLabel } from "../tree/buildGraph";
import {
  CreatePersonForm,
  type PersonFormData,
} from "./CreatePersonForm";
import { EditPersonForm, type EditPersonFormData } from "./EditPersonForm";

export type PanelAction =
  | "add-child"
  | "add-partner"
  | "add-parent1"
  | "edit"
  | null;

interface PersonPanelProps {
  person: Individual;
  families: Family[];
  onAction: (action: PanelAction) => void;
  activeAction: PanelAction;
  onCreatePerson: (data: PersonFormData, action: PanelAction) => Promise<void>;
  onUpdatePerson: (data: EditPersonFormData) => Promise<void>;
  onCancelAction: () => void;
}

function spouseRoleForNewPartner(person: Individual): SpouseRole {
  if (person.sex === "M") return "WIFE";
  if (person.sex === "F") return "HUSB";
  return "WIFE";
}

function partnerRoleFor(person: Individual): SpouseRole {
  if (person.sex === "M") return "HUSB";
  if (person.sex === "F") return "WIFE";
  return "HUSB";
}

export function PersonPanel({
  person,
  families,
  onAction,
  activeAction,
  onCreatePerson,
  onUpdatePerson,
  onCancelAction,
}: PersonPanelProps) {
  const asSpouse = families.filter((f) =>
    f.spouses.some((s) => s.individualId === person.id),
  );
  const asChild = families.find((f) =>
    f.children.some((c) => c.individualId === person.id),
  );

  const formTitles: Record<Exclude<PanelAction, null | "edit">, string> = {
    "add-child": "Kind hinzufügen",
    "add-partner": "Partner/in hinzufügen",
    "add-parent1": "Elternteil hinzufügen",
  };

  if (activeAction === "edit") {
    return (
      <EditPersonForm
        key={person.id}
        person={person}
        onSubmit={onUpdatePerson}
        onCancel={onCancelAction}
      />
    );
  }

  if (activeAction) {
    return (
      <CreatePersonForm
        title={formTitles[activeAction]}
        submitLabel="Anlegen"
        defaultSurname={
          activeAction === "add-child" ? (person.surname ?? "") : ""
        }
        onSubmit={(data) => onCreatePerson(data, activeAction)}
        onCancel={onCancelAction}
      />
    );
  }

  return (
    <div className="person-panel">
      <h2 className="person-panel__title">{personLabel(person)}</h2>
      <dl className="person-panel__meta">
        <dt>XRef</dt>
        <dd>{person.xref}</dd>
        {person.sex && (
          <>
            <dt>Geschlecht</dt>
            <dd>{person.sex}</dd>
          </>
        )}
        <dt>Status</dt>
        <dd>{person.isLiving ? "Lebt" : "Verstorben"}</dd>
      </dl>

      {person.biography && (
        <p className="person-panel__bio">{person.biography}</p>
      )}

      {asChild && (
        <section className="person-panel__section">
          <h3>Eltern</h3>
          <ul>
            {asChild.spouses.map((s) => (
              <li key={s.individualId}>
                {[s.givenName, s.surname].filter(Boolean).join(" ") || s.xref}
              </li>
            ))}
          </ul>
        </section>
      )}

      {asSpouse.length > 0 && (
        <section className="person-panel__section">
          <h3>Partnerschaften</h3>
          {asSpouse.map((fam) => (
            <div key={fam.id} className="person-panel__family">
              <p className="person-panel__family-partners">
                {fam.spouses
                  .map((s) =>
                    s.individualId === person.id
                      ? null
                      : [s.givenName, s.surname].filter(Boolean).join(" ") ||
                        s.xref,
                  )
                  .filter(Boolean)
                  .join(" & ") || "—"}
              </p>
              {fam.children.length > 0 && (
                <ul>
                  {fam.children.map((c) => (
                    <li key={c.individualId}>
                      {[c.givenName, c.surname].filter(Boolean).join(" ") ||
                        c.xref}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="person-panel__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => onAction("edit")}
        >
          Bearbeiten
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => onAction("add-child")}
        >
          + Kind
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => onAction("add-partner")}
        >
          + Partner/in
        </button>
        {!asChild && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => onAction("add-parent1")}
          >
            + Elternteil
          </button>
        )}
      </div>

      <p className="person-panel__hint">
        Rolle bei neuer Partnerschaft:{" "}
        {partnerRoleFor(person)} / Partner: {spouseRoleForNewPartner(person)}
      </p>
    </div>
  );
}

export { partnerRoleFor, spouseRoleForNewPartner };
