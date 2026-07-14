import type { Individual, IndividualRelationships, SpouseRole } from "../api/types";
import {
  canDeleteIndividual,
  deleteBlockedMessage,
  relatedDisplayName,
  relationshipsByFamily,
} from "../api/relationships";
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
  relationships: IndividualRelationships | null;
  onAction: (action: PanelAction) => void;
  activeAction: PanelAction;
  onCreatePerson: (data: PersonFormData, action: PanelAction) => Promise<void>;
  onUpdatePerson: (data: EditPersonFormData) => Promise<void>;
  onDeletePerson: () => Promise<void>;
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

function sexLabel(sex: Individual["sex"]): string {
  if (sex === "M") return "Erkek";
  if (sex === "F") return "Kadın";
  if (sex === "X") return "Diğer";
  if (sex === "U") return "Belirsiz";
  return sex ?? "";
}

export function PersonPanel({
  person,
  relationships,
  onAction,
  activeAction,
  onCreatePerson,
  onUpdatePerson,
  onDeletePerson,
  onCancelAction,
}: PersonPanelProps) {
  const familyGroups = relationships
    ? [...relationshipsByFamily(relationships).entries()]
    : [];
  const hasParents = (relationships?.parents.length ?? 0) > 0;

  const formTitles: Record<Exclude<PanelAction, null | "edit">, string> = {
    "add-child": "Çocuk ekle",
    "add-partner": "Eş ekle",
    "add-parent1": "Ebeveyn ekle",
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
        submitLabel="Ekle"
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
            <dt>Cinsiyet</dt>
            <dd>{sexLabel(person.sex)}</dd>
          </>
        )}
        <dt>Durum</dt>
        <dd>{person.isLiving ? "Yaşıyor" : "Vefat etmiş"}</dd>
      </dl>

      {person.biography && (
        <p className="person-panel__bio">{person.biography}</p>
      )}

      {relationships && relationships.parents.length > 0 && (
        <section className="person-panel__section">
          <h3>Ebeveynler</h3>
          <ul className="person-panel__simple-list">
            {relationships.parents.map((p) => (
              <li key={p.individualId}>{relatedDisplayName(p)}</li>
            ))}
          </ul>
        </section>
      )}

      {familyGroups.length > 0 && (
        <section className="person-panel__section">
          <h3>Evlilikler</h3>
          {familyGroups.map(([familyId, group]) => (
            <div key={familyId} className="person-panel__family">
              <p className="person-panel__family-partners">
                {group.spouses.map(relatedDisplayName).join(" & ") || "—"}
              </p>
              {group.children.length > 0 && (
                <ul className="person-panel__simple-list">
                  {group.children.map((c) => (
                    <li key={c.individualId}>{relatedDisplayName(c)}</li>
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
          Düzenle
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => onAction("add-child")}
        >
          + Çocuk
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => onAction("add-partner")}
        >
          + Eş
        </button>
        {!hasParents && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => onAction("add-parent1")}
          >
            + Ebeveyn
          </button>
        )}
      </div>

      <button
        type="button"
        className="btn btn--danger btn--delete"
        onClick={onDeletePerson}
      >
        Sil
      </button>

      {relationships && !canDeleteIndividual(relationships) && (
        <p className="person-panel__delete-hint">
          {deleteBlockedMessage(relationships)}
        </p>
      )}

      <p className="person-panel__hint">
        Yeni evlilikte rol: {partnerRoleFor(person)} / Eş:{" "}
        {spouseRoleForNewPartner(person)}
      </p>
    </div>
  );
}

export { partnerRoleFor, spouseRoleForNewPartner };
