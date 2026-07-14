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
    if (!givenName.trim() && !surname.trim()) return;
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
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="person-form" onSubmit={handleSubmit}>
      <h3 className="person-form__title">Kişiyi düzenle</h3>
      {error && <p className="person-form__error">{error}</p>}
      <label className="person-form__field">
        Ad
        <input
          value={givenName}
          onChange={(e) => setGivenName(e.target.value)}
          required
          autoFocus
        />
      </label>
      <label className="person-form__field">
        Soyad
        <input
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
        />
      </label>
      <label className="person-form__field">
        Cinsiyet
        <select
          value={sex}
          onChange={(e) => setSex(e.target.value as Sex | "")}
        >
          <option value="">—</option>
          <option value="M">Erkek</option>
          <option value="F">Kadın</option>
          <option value="X">Diğer</option>
          <option value="U">Belirsiz</option>
        </select>
      </label>
      <label className="person-form__checkbox">
        <input
          type="checkbox"
          checked={isLiving}
          onChange={(e) => setIsLiving(e.target.checked)}
        />
        Yaşıyor
      </label>
      <div className="person-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          İptal
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={loading || (!givenName.trim() && !surname.trim())}
        >
          {loading ? "…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
