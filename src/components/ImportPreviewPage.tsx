import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { RecognizedTree } from "../api/types";
import { LifeDates } from "./LifeDates";

interface ImportPreviewPageProps {
  onBack: () => void;
  onOpenImport: () => void;
}

function personLabel(person: RecognizedTree["people"][number]): string {
  return [person.givenName, person.surname].filter(Boolean).join(" ") || person.tempId;
}

export function ImportPreviewPage({
  onBack,
  onOpenImport,
}: ImportPreviewPageProps) {
  const [tree, setTree] = useState<RecognizedTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getImportPreview()
      .then(setTree)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Önizleme yüklenemedi"),
      )
      .finally(() => setLoading(false));
  }, []);

  const peopleById = new Map((tree?.people ?? []).map((p) => [p.tempId, p]));

  return (
    <div className="import-preview">
      <div className="import-preview__toolbar">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← Ağaca dön
        </button>
        <button type="button" className="btn btn--secondary" onClick={onOpenImport}>
          Importu düzenle
        </button>
      </div>

      <h2 className="import-preview__title">İşlenen soy ağacı önizlemesi</h2>
      <p className="muted">
        Bu aşamada ağaç henüz kaydedilmez. Eşleştirme ve aktarma sonraki adımda
        gelecek.
      </p>

      {loading && <p>Yükleniyor…</p>}
      {error && <p className="person-form__error">{error}</p>}

      {tree && (
        <div className="import-preview__grid">
          <section className="import-preview__section">
            <h3>Kişiler ({tree.people.length})</h3>
            <ul className="import-preview__list">
              {tree.people.map((person) => (
                <li key={person.tempId} className="import-preview__person">
                  <div className="import-preview__person-name">
                    {personLabel(person)}
                  </div>
                  <LifeDates
                    birthDate={person.birthDate}
                    deathDate={person.deathDate}
                    yearOnly
                    className="life-dates"
                  />
                  <div className="muted import-preview__meta">
                    {person.tempId}
                    {person.sex ? ` · ${person.sex}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="import-preview__section">
            <h3>Aileler ({tree.families.length})</h3>
            <ul className="import-preview__list">
              {tree.families.map((family) => {
                const spouses = family.spouseTempIds
                  .map((id) => peopleById.get(id))
                  .filter(Boolean)
                  .map((p) => personLabel(p!))
                  .join(" & ");
                const children = family.childTempIds
                  .map((id) => peopleById.get(id))
                  .filter(Boolean)
                  .map((p) => personLabel(p!));

                return (
                  <li key={family.tempId} className="import-preview__family">
                    <div className="import-preview__person-name">
                      {spouses || "—"}
                    </div>
                    {children.length > 0 && (
                      <ul className="import-preview__children">
                        {children.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
