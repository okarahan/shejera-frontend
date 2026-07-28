import type {
  AddChildRequest,
  CreateContributionTreeRequest,
  CreateFamilyRequest,
  CreateIndividualRequest,
  CreateInviteRequest,
  Family,
  ImportCommitResponse,
  ImportScanResponse,
  ImportStatusResponse,
  ImportUploadResponse,
  Individual,
  IndividualRelationships,
  InvitePreviewResponse,
  InviteResponse,
  MeResponse,
  RecognizedTree,
  TreeResponse,
  UpdateIndividualRequest,
} from "./types";

const BASE = "/api";

/** CV OCR can take several minutes on large images. */
const SCAN_TIMEOUT_MS = 10 * 60 * 1000;

/** Deduplicate overlapping scan calls (React Strict Mode double-mount). */
let inflightScan: Promise<ImportScanResponse> | null = null;

let activeTreeId: string | null = null;

export function setActiveTreeId(treeId: string | null) {
  activeTreeId = treeId;
}

export function getActiveTreeId(): string | null {
  return activeTreeId;
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (activeTreeId) {
    headers.set("X-Shejera-Tree-Id", activeTreeId);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error((body as { error?: string }).error ?? res.statusText) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getMe: () => request<MeResponse>("/auth/me"),

  previewInvite: (token: string) =>
    request<InvitePreviewResponse>(`/auth/invite/${encodeURIComponent(token)}`),

  redeemInvite: (token: string) =>
    request<MeResponse>("/auth/redeem", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  listInvites: () => request<InviteResponse[]>("/invites"),

  createInvite: (body: CreateInviteRequest) =>
    request<InviteResponse>("/invites", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  revokeInvite: (id: string) =>
    request<void>(`/invites/${id}`, { method: "DELETE" }),

  listTrees: () => request<TreeResponse[]>("/trees"),

  createContributionTree: (body: CreateContributionTreeRequest) =>
    request<TreeResponse>("/trees/contributions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  submitContributionTree: (id: string) =>
    request<TreeResponse>(`/trees/${id}/submit`, { method: "POST" }),

  discardContributionTree: (id: string) =>
    request<void>(`/trees/${id}`, { method: "DELETE" }),

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
    const headers = new Headers();
    if (activeTreeId) headers.set("X-Shejera-Tree-Id", activeTreeId);
    const res = await fetch(`${BASE}/imports/upload`, {
      method: "POST",
      body: form,
      credentials: "include",
      headers,
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

  commitImport: (body?: {
    treeName?: string;
    expiresInDays?: number;
    treeId?: string;
  }) =>
    request<ImportCommitResponse>("/imports/commit", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
};
