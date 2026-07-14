import { useState, type FormEvent } from "react";
import type { Individual, Sex } from "../api/types";
import { BIRTH_DATE_HINT, BIRTH_SYMBOL, DEATH_SYMBOL, birthDateError } from "../lib/birthDate";

export interface EditPersonFormData {
  givenName: string;
  surname: string;
  sex?: Sex;
  isLiving: boolean;
  birthDate: string;
  deathDate: string;
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
  const [birthDate, setBirthDate] = useState(person.birthDate ?? "");
  const [deathDate, setDeathDate] = useState(person.deathDate ?? "");
  const [sex, setSex] = useState<Sex | "">(person.sex ?? "");
  const [isLiving, setIsLiving] = useState(person.isLiving);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const birthDateValidationError = birthDateError(birthDate);
  const deathDateValidationError = birthDateError(deathDate);
  const hasDeathDate = deathDate.trim().length > 0;

  function handleDeathDateChange(value: string) {
    setDeathDate(value);
    if (value.trim()) {
      setIsLiving(false);
    }
  }

  function handleIsLivingChange(checked: boolean) {
    setIsLiving(checked);
    if (checked) {
      setDeathDate("");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!givenName.trim() && !surname.trim()) return;
    if (birthDateValidationError || deathDateValidationError) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        givenName: givenName.trim(),
        surname: surname.trim(),
        birthDate: birthDate.trim(),
        deathDate: deathDate.trim(),
        sex: sex || undefined,
        isLiving: hasDeathDate ? false : isLiving,
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
        <span className="person-form__label">
          <span className="life-dates__symbol life-dates__symbol--birth" aria-hidden>
            {BIRTH_SYMBOL}
          </span>{" "}
          Doğum tarihi
        </span>
        <input
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          placeholder={BIRTH_DATE_HINT}
          inputMode="numeric"
        />
        {birthDateValidationError && (
          <span className="person-form__field-error">{birthDateValidationError}</span>
        )}
      </label>
      <label className="person-form__field">
        <span className="person-form__label">
          <span className="life-dates__symbol life-dates__symbol--death" aria-hidden>
            {DEATH_SYMBOL}
          </span>{" "}
          Ölüm tarihi
        </span>
        <input
          value={deathDate}
          onChange={(e) => handleDeathDateChange(e.target.value)}
          placeholder={BIRTH_DATE_HINT}
          inputMode="numeric"
        />
        {deathDateValidationError && (
          <span className="person-form__field-error">{deathDateValidationError}</span>
        )}
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
          disabled={hasDeathDate}
          onChange={(e) => handleIsLivingChange(e.target.checked)}
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
          disabled={
            loading ||
            (!givenName.trim() && !surname.trim()) ||
            !!birthDateValidationError ||
            !!deathDateValidationError
          }
        >
          {loading ? "…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
