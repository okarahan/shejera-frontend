import { useState, type FormEvent } from "react";
import type { Individual, Sex } from "../api/types";

export interface EditPersonFormData {
  givenName: string;
  surname: string;
  sex?: Sex;
  isLiving: boolean;
}

interface EditPersonFormProps {
  person: Individual;
  onSubmit: (data: EditPersonFormData) => Promise<void>;
  onCancel: () => void;
}

export function EditPersonForm({
  person,
  onSubmit,
  onCancel,
}: EditPersonFormProps) {
  const [givenName, setGivenName] = useState(person.givenName ?? "");
  const [surname, setSurname] = useState(person.surname ?? "");
  const [sex, setSex] = useState<Sex | "">(person.sex ?? "");
  const [isLiving, setIsLiving] = useState(person.isLiving);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!givenName.trim() || !surname.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        givenName: givenName.trim(),
        surname: surname.trim(),
        sex: sex || undefined,
        isLiving,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="person-form" onSubmit={handleSubmit}>
      <h3 className="person-form__title">Person bearbeiten</h3>
      {error && <p className="person-form__error">{error}</p>}
      <label className="person-form__field">
        Vorname
        <input
          value={givenName}
          onChange={(e) => setGivenName(e.target.value)}
          required
          autoFocus
        />
      </label>
      <label className="person-form__field">
        Nachname
        <input
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          required
        />
      </label>
      <label className="person-form__field">
        Geschlecht
        <select
          value={sex}
          onChange={(e) => setSex(e.target.value as Sex | "")}
        >
          <option value="">—</option>
          <option value="M">Männlich</option>
          <option value="F">Weiblich</option>
          <option value="X">Divers</option>
          <option value="U">Unbekannt</option>
        </select>
      </label>
      <label className="person-form__checkbox">
        <input
          type="checkbox"
          checked={isLiving}
          onChange={(e) => setIsLiving(e.target.checked)}
        />
        Lebt
      </label>
      <div className="person-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Abbrechen
        </button>
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? "…" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
