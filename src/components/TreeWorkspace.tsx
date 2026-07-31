import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, setActiveTreeId } from "../api/client";
import type {
  Family,
  Individual,
  IndividualRelationships,
} from "../api/types";
import {
  canDeleteIndividual,
  deleteBlockedMessage,
} from "../api/relationships";
import { buildFullTreeGraph, personLabel } from "../tree/buildGraph";
import { FamilyTree } from "../tree/FamilyTree";
import { layoutTree } from "../tree/layoutTree";
import { TreeZoomControls } from "../tree/TreeZoomControls";
import { useZoom } from "../tree/useZoom";
import {
  CreatePersonForm,
  type PersonFormData,
} from "./CreatePersonForm";
import type { EditPersonFormData } from "./EditPersonForm";
import {
  partnerRoleFor,
  PersonPanel,
  spouseRoleForNewPartner,
  type PanelAction,
} from "./PersonPanel";

async function loadData(treeId: string): Promise<{
  individuals: Individual[];
  families: Family[];
}> {
  setActiveTreeId(treeId);
  const [individuals, families] = await Promise.all([
    api.listIndividuals(),
    api.listFamilies(),
  ]);
  return { individuals, families };
}

export type TreeWorkspaceMode = "full" | "contribution";

interface TreeWorkspaceProps {
  /** Bumps reload when the active tree header changes. */
  treeId: string;
  canWrite: boolean;
  /** @deprecated Ignored — both main and contrib use full editing when canWrite. */
  mode?: TreeWorkspaceMode;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
}

export function TreeWorkspace({
  treeId,
  canWrite,
  toolbar,
  emptyTitle = "Soy ağacını başlat",
  emptyHint = "İlk kişiyi ekle.",
}: TreeWorkspaceProps) {
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [relationships, setRelationships] =
    useState<IndividualRelationships | null>(null);
  const [panelAction, setPanelAction] = useState<PanelAction>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const treeAreaRef = useRef<HTMLDivElement>(null);
  const { zoom, zoomIn, zoomOut, resetZoom, applyFitIfNeeded } = useZoom();

  const allowStructure = canWrite;

  // Ensure header is set before any child effects / fetches (parent effects run later).
  useLayoutEffect(() => {
    setActiveTreeId(treeId);
  }, [treeId]);

  const refresh = useCallback(
    async (keepSelectedId?: string | null) => {
      setActiveTreeId(treeId);
      const data = await loadData(treeId);
      setIndividuals(data.individuals);
      setFamilies(data.families);

      const id = keepSelectedId ?? selectedId;
      if (id && data.individuals.some((i) => i.id === id)) {
        setActiveTreeId(treeId);
        const rel = await api.getIndividualRelationships(id);
        setRelationships(rel);
      } else {
        setRelationships(null);
      }

      return data;
    },
    [selectedId, treeId],
  );

  useEffect(() => {
    if (!selectedId) {
      setRelationships(null);
      return;
    }
    setActiveTreeId(treeId);
    api
      .getIndividualRelationships(selectedId)
      .then(setRelationships)
      .catch(() => setRelationships(null));
  }, [selectedId, treeId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setPanelAction(null);
    setActiveTreeId(treeId);
    refresh()
      .then((data) => {
        if (data.individuals.length > 0) {
          setSelectedId(data.individuals[0].id);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Yükleme başarısız"),
      )
      .finally(() => setLoading(false));
  }, [treeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    resetZoom();
  }, [resetZoom]);

  const selected = individuals.find((i) => i.id === selectedId) ?? null;

  async function handleCreateFirstPerson(data: PersonFormData) {
    if (!canWrite || !allowStructure) return;
    setActiveTreeId(treeId);
    const created = await api.createIndividual(data);
    await refresh();
    setSelectedId(created.id);
  }

  async function handleCreateRelated(
    data: PersonFormData,
    action: PanelAction,
  ) {
    if (!canWrite || !allowStructure || !selected || !action) return;

    setActiveTreeId(treeId);
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
    if (!canWrite || !selected) return;
    setActiveTreeId(treeId);
    await api.updateIndividual(selected.id, data);
    await refresh();
    setPanelAction(null);
  }

  async function handleDeletePerson() {
    if (!canWrite || !allowStructure || !selected) return;

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
      setActiveTreeId(treeId);
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
      <div className="tree-workspace tree-workspace--centered">
        <p>Yükleniyor…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tree-workspace tree-workspace--centered">
        <p className="error-banner">{error}</p>
      </div>
    );
  }

  return (
    <div className="tree-workspace">
      {toolbar}
      {individuals.length === 0 ? (
        <div className="empty-state">
          <h2>{emptyTitle}</h2>
          {canWrite && allowStructure ? (
            <>
              <p>{emptyHint}</p>
              <CreatePersonForm
                title="İlk kişi"
                submitLabel="Ekle"
                onSubmit={handleCreateFirstPerson}
              />
            </>
          ) : (
            <p className="muted">Bu ağaç boş veya salt okunur.</p>
          )}
        </div>
      ) : (
        <div className="workspace" data-panel-open={panelOpen}>
          <div className="workspace__main">
            <TreeZoomControls
              zoom={zoom}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onReset={handleResetZoom}
            />
            <div className="workspace__tree" ref={treeAreaRef}>
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
                activeAction={canWrite ? panelAction : null}
                onAction={canWrite ? setPanelAction : () => {}}
                onCreatePerson={handleCreateRelated}
                onUpdatePerson={handleUpdatePerson}
                onDeletePerson={handleDeletePerson}
                onCancelAction={() => setPanelAction(null)}
                readOnly={!canWrite}
                allowStructureEdits={allowStructure}
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
