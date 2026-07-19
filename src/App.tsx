import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api/client";
import type { Family, Individual, IndividualRelationships } from "./api/types";
import { AppMenu } from "./components/AppMenu";
import {
  CreatePersonForm,
  type PersonFormData,
} from "./components/CreatePersonForm";
import type { EditPersonFormData } from "./components/EditPersonForm";
import { ImportDialog } from "./components/ImportDialog";
import { ImportProcessingDialog } from "./components/ImportProcessingDialog";
import { ImportPreviewPage } from "./components/ImportPreviewPage";
import {
  partnerRoleFor,
  PersonPanel,
  spouseRoleForNewPartner,
  type PanelAction,
} from "./components/PersonPanel";
import { buildFullTreeGraph, personLabel } from "./tree/buildGraph";
import {
  canDeleteIndividual,
  deleteBlockedMessage,
} from "./api/relationships";
import { FamilyTree } from "./tree/FamilyTree";
import { layoutTree } from "./tree/layoutTree";
import { TreeZoomControls } from "./tree/TreeZoomControls";
import { useZoom } from "./tree/useZoom";

type AppView = "tree" | "import-preview";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [relationships, setRelationships] =
    useState<IndividualRelationships | null>(null);
  const [panelAction, setPanelAction] = useState<PanelAction>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("tree");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [processingDialogOpen, setProcessingDialogOpen] = useState(false);
  const treeAreaRef = useRef<HTMLDivElement>(null);
  const { zoom, zoomIn, zoomOut, resetZoom, applyFitIfNeeded } = useZoom();

  const refresh = useCallback(async (keepSelectedId?: string | null) => {
    const data = await loadData();
    setIndividuals(data.individuals);
    setFamilies(data.families);

    const id = keepSelectedId ?? selectedId;
    if (id && data.individuals.some((i) => i.id === id)) {
      const rel = await api.getIndividualRelationships(id);
      setRelationships(rel);
    } else {
      setRelationships(null);
    }

    return data;
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setRelationships(null);
      return;
    }
    api
      .getIndividualRelationships(selectedId)
      .then(setRelationships)
      .catch(() => setRelationships(null));
  }, [selectedId]);

  useEffect(() => {
    refresh()
      .then((data) => {
        if (data.individuals.length > 0) {
          setSelectedId((prev) => prev ?? data.individuals[0].id);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Yükleme başarısız"),
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const graph = useMemo(
    () => buildFullTreeGraph(individuals, families),
    [individuals, families],
  );

  const treeLayout = useMemo(
    () => layoutTree(graph.nodes, graph.edges),
    [graph],
  );

  const treePadding = 64;
  const treeContentWidth = treeLayout.width + treePadding;
  const treeContentHeight = treeLayout.height + treePadding;

  useEffect(() => {
    const el = treeAreaRef.current;
    if (!el || graph.nodes.length === 0) return;

    const updateFit = () => {
      applyFitIfNeeded(
        treeContentWidth,
        treeContentHeight,
        el.clientWidth,
        el.clientHeight,
      );
    };

    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    applyFitIfNeeded,
    graph.nodes.length,
    treeContentWidth,
    treeContentHeight,
  ]);

  const handleResetZoom = useCallback(() => {
    const el = treeAreaRef.current;
    if (!el) return;
    resetZoom(
      treeContentWidth,
      treeContentHeight,
      el.clientWidth,
      el.clientHeight,
    );
  }, [resetZoom, treeContentWidth, treeContentHeight]);

  const selected = individuals.find((i) => i.id === selectedId) ?? null;

  async function handleCreateFirstPerson(data: PersonFormData) {
    const created = await api.createIndividual(data);
    await refresh();
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

  async function handleDeletePerson() {
    if (!selected) return;

    const eligibility = relationships;
    if (!eligibility || !canDeleteIndividual(eligibility)) {
      window.alert(
        eligibility
          ? deleteBlockedMessage(eligibility)
          : "İlişkiler yüklenemedi",
      );
      return;
    }

    const name = personLabel(selected);
    const ok = window.confirm(
      `"${name}" kişisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
    );
    if (!ok) return;

    try {
      await api.deleteIndividual(selected.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Silme başarısız");
      return;
    }

    const data = await refresh(selected.id);
    setPanelAction(null);

    const fallback = data.individuals[0]?.id ?? null;
    setSelectedId(fallback);
  }

  if (loading) {
    return (
      <div className="app app--centered">
        <p>Yükleniyor…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app app--centered">
        <p className="error-banner">{error}</p>
        <p className="muted">
          Backend <code>/api</code> altında erişilebilir mi? Backend
          deposunda <code>task run</code> çalıştırın.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="header__title">Shejera</h1>
        <AppMenu
          onImport={() => {
            setImportDialogOpen(true);
          }}
        />
      </header>

      {importDialogOpen && (
        <ImportDialog
          onClose={() => setImportDialogOpen(false)}
          onStartProcessing={() => {
            setImportDialogOpen(false);
            setProcessingDialogOpen(true);
          }}
        />
      )}

      {processingDialogOpen && (
        <ImportProcessingDialog
          onClose={() => setProcessingDialogOpen(false)}
          onPreview={() => {
            setProcessingDialogOpen(false);
            setView("import-preview");
          }}
        />
      )}

      {view === "import-preview" ? (
        <ImportPreviewPage
          onBack={() => setView("tree")}
          onOpenImport={() => setImportDialogOpen(true)}
        />
      ) : individuals.length === 0 ? (
        <div className="empty-state">
          <h2>Soy ağacını başlat</h2>
          <p>İlk kişiyi ekle.</p>
          <CreatePersonForm
            title="İlk kişi"
            submitLabel="Ekle"
            onSubmit={handleCreateFirstPerson}
          />
        </div>
      ) : (
        <div
          className="workspace"
          data-panel-open={panelOpen}
        >
          <div className="workspace__tree" ref={treeAreaRef}>
            <TreeZoomControls
              zoom={zoom}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onReset={handleResetZoom}
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
              <p className="muted">Henüz kişi yok.</p>
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
            <span className="workspace__panel-tab-label">Detaylar</span>
          </button>

          <aside
            id="person-panel"
            className="workspace__panel"
            aria-hidden={!panelOpen}
          >
            {selected ? (
              <PersonPanel
                person={selected}
                relationships={relationships}
                activeAction={panelAction}
                onAction={setPanelAction}
                onCreatePerson={handleCreateRelated}
                onUpdatePerson={handleUpdatePerson}
                onDeletePerson={handleDeletePerson}
                onCancelAction={() => setPanelAction(null)}
              />
            ) : (
              <p className="muted">Ağaçtan bir kişi seçin.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
