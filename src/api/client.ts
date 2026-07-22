import type {
  AddChildRequest,
  CreateFamilyRequest,
  CreateIndividualRequest,
  Family,
  ImportScanResponse,
  ImportStatusResponse,
  ImportUploadResponse,
  Individual,
  IndividualRelationships,
  RecognizedTree,
  UpdateIndividualRequest,
} from "./types";

const BASE = "/api";

/** CV OCR can take several minutes on large images. */
const SCAN_TIMEOUT_MS = 10 * 60 * 1000;

/** Deduplicate overlapping scan calls (React Strict Mode double-mount). */
let inflightScan: Promise<ImportScanResponse> | null = null;

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listIndividuals: () => request<Individual[]>("/individuals"),

  createIndividual: (body: CreateIndividualRequest) =>
    request<Individual>("/individuals", {
      method: "POST",
      body: JSON.stringify({ surname: "", ...body }),
    }),

  updateIndividual: (id: string, body: UpdateIndividualRequest) =>
    request<Individual>(`/individuals/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteIndividual: (id: string) =>
    request<void>(`/individuals/${id}`, { method: "DELETE" }),

  getIndividualRelationships: (id: string) =>
    request<IndividualRelationships>(`/individuals/${id}/relationships`),

  listFamilies: () => request<Family[]>("/families"),

  createFamily: (body: CreateFamilyRequest) =>
    request<Family>("/families", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  addFamilyChild: (familyId: string, body: AddChildRequest) =>
    request<void>(`/families/${familyId}/children`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getImportStatus: () => request<ImportStatusResponse>("/imports/status"),

  uploadImportImage: async (file: File): Promise<ImportUploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/imports/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((body as { error?: string }).error ?? res.statusText);
    }
    return res.json() as Promise<ImportUploadResponse>;
  },

  scanImport: (): Promise<ImportScanResponse> => {
    if (!inflightScan) {
      inflightScan = request<ImportScanResponse>("/imports/scan", {
        method: "POST",
        signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
      }).finally(() => {
        inflightScan = null;
      });
    }
    return inflightScan;
  },

  getImportPreview: () => request<RecognizedTree>("/imports/preview"),
};
