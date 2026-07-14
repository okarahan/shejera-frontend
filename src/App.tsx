import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api/client";
import type { Family, Individual } from "./api/types";
import {
  CreatePersonForm,
  type PersonFormData,
} from "./components/CreatePersonForm";
import type { EditPersonFormData } from "./components/EditPersonForm";
import {
  partnerRoleFor,
  PersonPanel,
  spouseRoleForNewPartner,
  type PanelAction,
} from "./components/PersonPanel";
import { buildTreeGraph } from "./tree/buildGraph";
import { FamilyTree } from "./tree/FamilyTree";
import { TreeZoomControls } from "./tree/TreeZoomControls";
import { useZoom } from "./tree/useZoom";

async function loadData(): Promise<{
  individuals: Individual[];
  families: Family[];
}> {
  const [individuals, families] = await Promise.all([
    api.listIndividuals(),
    api.listFamilies(),
  ]);
  return { individuals, families };
}

export default function App() {
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [rootId, setRootId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelAction, setPanelAction] = useState<PanelAction>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { zoom, zoomIn, zoomOut, resetZoom } = useZoom();

  const refresh = useCallback(async () => {
    const data = await loadData();
    setIndividuals(data.individuals);
    setFamilies(data.families);
    return data;
  }, []);

  useEffect(() => {
    refresh()
      .then((data) => {
        if (data.individuals.length > 0) {
          setRootId((prev) => prev ?? data.individuals[0].id);
          setSelectedId((prev) => prev ?? data.individuals[0].id);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Laden fehlgeschlagen"),
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const effectiveRoot = rootId ?? selectedId;
  const graph = useMemo(() => {
    if (!effectiveRoot) return { nodes: [], edges: [] };
    return buildTreeGraph(effectiveRoot, individuals, families);
  }, [effectiveRoot, individuals, families]);

  const selected = individuals.find((i) => i.id === selectedId) ?? null;

  async function handleCreateFirstPerson(data: PersonFormData) {
    const created = await api.createIndividual(data);
    await refresh();
    setRootId(created.id);
    setSelectedId(created.id);
  }

  async function handleCreateRelated(
    data: PersonFormData,
    action: PanelAction,
  ) {
    if (!selected || !action) return;

    const created = await api.createIndividual(data);

    if (action === "add-partner") {
      await api.createFamily({
        spouses: [
          {
            individualId: selected.id,
            role: partnerRoleFor(selected),
          },
          {
            individualId: created.id,
            role: spouseRoleForNewPartner(selected),
          },
        ],
      });
    }

    if (action === "add-child") {
      const spouseFams = families.filter((f) =>
        f.spouses.some((s) => s.individualId === selected.id),
      );
      let familyId = spouseFams[0]?.id;
      if (!familyId) {
        const fam = await api.createFamily({
          spouses: [
            { individualId: selected.id, role: partnerRoleFor(selected) },
          ],
        });
        familyId = fam.id;
      }
      await api.addFamilyChild(familyId, { individualId: created.id });
    }

    if (action === "add-parent1") {
      const fam = await api.createFamily({
        spouses: [
          {
            individualId: created.id,
            role: partnerRoleFor(created),
          },
        ],
      });
      await api.addFamilyChild(fam.id, { individualId: selected.id });
      setRootId((prev) => prev ?? selected.id);
    }

    await refresh();
    setPanelAction(null);
    setSelectedId(created.id);
  }

  async function handleUpdatePerson(data: EditPersonFormData) {
    if (!selected) return;
    await api.updateIndividual(selected.id, data);
    await refresh();
    setPanelAction(null);
  }

  if (loading) {
    return (
      <div className="app app--centered">
        <p>Lade …</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app app--centered">
        <p className="error-banner">{error}</p>
        <p className="muted">
          Backend unter <code>/api</code> erreichbar?{" "}
          <code>task run</code> im Backend-Repo.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="header__title">Shejera</h1>
        {individuals.length > 0 && (
          <label className="header__root">
            Baumzentrum
            <select
              value={effectiveRoot ?? ""}
              onChange={(e) => setRootId(e.target.value)}
            >
              {individuals.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {[ind.givenName, ind.surname].filter(Boolean).join(" ") ||
                    ind.xref}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {individuals.length === 0 ? (
        <div className="empty-state">
          <h2>Stammbaum starten</h2>
          <p>Lege die erste Person an.</p>
          <CreatePersonForm
            title="Erste Person"
            submitLabel="Anlegen"
            onSubmit={handleCreateFirstPerson}
          />
        </div>
      ) : (
        <div
          className="workspace"
          data-panel-open={panelOpen}
        >
          <div className="workspace__tree">
            <TreeZoomControls
              zoom={zoom}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onReset={resetZoom}
            />
            {graph.nodes.length > 0 ? (
              <div className="tree-viewport">
                <FamilyTree
                  graph={graph}
                  selectedId={selectedId}
                  zoom={zoom}
                  onSelect={setSelectedId}
                />
              </div>
            ) : (
              <p className="muted">Keine Baumdaten für diese Person.</p>
            )}
          </div>

          <button
            type="button"
            className="workspace__panel-tab"
            aria-expanded={panelOpen}
            aria-controls="person-panel"
            onClick={() => setPanelOpen((open) => !open)}
          >
            <span className="workspace__panel-tab-icon" aria-hidden>
              {panelOpen ? "›" : "‹"}
            </span>
            <span className="workspace__panel-tab-label">Details</span>
          </button>

          <aside
            id="person-panel"
            className="workspace__panel"
            aria-hidden={!panelOpen}
          >
            {selected ? (
              <PersonPanel
                person={selected}
                families={families}
                activeAction={panelAction}
                onAction={setPanelAction}
                onCreatePerson={handleCreateRelated}
                onUpdatePerson={handleUpdatePerson}
                onCancelAction={() => setPanelAction(null)}
              />
            ) : (
              <p className="muted">Person im Baum auswählen.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
