import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { InviteResponse, MeResponse, UserRole } from "../api/types";
import { AppShell } from "./AppShell";

export type AdminSection = "list" | "invite";

interface AdminPageProps {
  me: MeResponse;
  section: AdminSection;
}

function inviteLink(inv: InviteResponse): string | null {
  if (inv.inviteUrl) return inv.inviteUrl;
  if (inv.invitePath) {
    const origin =
      (import.meta.env.VITE_INVITE_ORIGIN as string | undefined)?.replace(
        /\/$/,
        "",
      ) || window.location.origin;
    return `${origin}${inv.invitePath}`;
  }
  return null;
}

function acceptedLabel(status: string): string {
  if (status === "redeemed") return "Evet";
  if (status === "pending") return "Hayır";
  if (status === "revoked") return "İptal";
  return status;
}

function contributionLabel(status: string | null | undefined): string {
  if (!status) return "Hayır";
  if (status === "submitted" || status === "merged") return "Evet";
  if (status === "draft") return "Taslak";
  return status;
}

export function AdminPage({ me, section }: AdminPageProps) {
  const [invites, setInvites] = useState<InviteResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("contributor");
  const [lastCreated, setLastCreated] = useState<InviteResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setInvites(await api.listInvites());
  }, []);

  useEffect(() => {
    if (!me.canManageInvites) return;
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Yükleme başarısız"),
    );
  }, [me.canManageInvites, refresh]);

  const selected = useMemo(
    () => invites.find((i) => i.id === selectedId) ?? null,
    [invites, selectedId],
  );

  async function create() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const created = await api.createInvite({
        email,
        displayName,
        role,
        expiresInDays: 30,
      });
      setLastCreated(created);
      setEmail("");
      setDisplayName("");
      await refresh();
      window.location.assign("/admin/list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oluşturma başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Kopyalama başarısız");
    }
  }

  if (!me.canManageInvites) {
    return (
      <div className="app app--centered">
        <h1>Yönetici</h1>
        <p className="error-banner">Erişim yok.</p>
        <a className="btn btn--ghost" href="/">
          Geri
        </a>
      </div>
    );
  }

  return (
    <AppShell
      me={me}
      section={section === "invite" ? "admin-invite" : "admin-list"}
      defaultNavOpen
    >
      <div className="admin__main admin__main--shell">
        {error && <p className="error-banner">{error}</p>}

        {section === "invite" && (
          <div className="admin__panel">
            <h2>Yeni davet</h2>
            <p className="muted">
              Bağlantı <code>/import/…</code> adresine gider (Authelia yok).
            </p>
            <div className="form-grid">
              <label>
                Ad
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                />
              </label>
              <label>
                E-posta
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label>
                Rol
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="contributor">Katkıda bulunan</option>
                  <option value="admin">Yönetici</option>
                </select>
              </label>
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy || !email.trim() || !displayName.trim()}
                onClick={() => void create()}
              >
                {busy ? "…" : "Davet oluştur"}
              </button>
            </div>
            {lastCreated && inviteLink(lastCreated) && (
              <div className="invite-link-box">
                <p className="invite-link">
                  Bağlantı: <code>{inviteLink(lastCreated)}</code>
                </p>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    const link = inviteLink(lastCreated);
                    if (link) void copyText(link);
                  }}
                >
                  {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
                </button>
              </div>
            )}
          </div>
        )}

        {section === "list" && !selected && (
          <div className="admin__panel">
            <h2>Davet edilen kişiler</h2>
            <div className="admin__table-wrap">
              <table className="admin__table">
                <thead>
                  <tr>
                    <th>Ad</th>
                    <th>Kod</th>
                    <th>Kabul etti</th>
                    <th>Katkı gönderildi</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.length === 0 && (
                    <tr>
                      <td colSpan={4} className="muted">
                        Henüz davet yok.{" "}
                        <a href="/admin/invite">Şimdi davet et</a>
                      </td>
                    </tr>
                  )}
                  {invites.map((inv) => (
                    <tr
                      key={inv.id}
                      className="admin__table-row"
                      onClick={() => setSelectedId(inv.id)}
                    >
                      <td>{inv.displayName}</td>
                      <td>
                        <code>{inv.code ?? inv.id.slice(0, 8)}</code>
                      </td>
                      <td>{acceptedLabel(inv.status)}</td>
                      <td>{contributionLabel(inv.contributionTreeStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "list" && selected && (
          <div className="admin__panel">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setSelectedId(null)}
            >
              ← Listeye dön
            </button>
            <h2>{selected.displayName}</h2>
            <dl className="admin__dl">
              <div>
                <dt>E-posta</dt>
                <dd>{selected.email}</dd>
              </div>
              <div>
                <dt>Kod</dt>
                <dd>
                  <code>{selected.code ?? selected.id.slice(0, 8)}</code>
                </dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>
                  {selected.role === "admin" ? "Yönetici" : "Katkıda bulunan"}
                </dd>
              </div>
              <div>
                <dt>Kabul etti</dt>
                <dd>{acceptedLabel(selected.status)}</dd>
              </div>
              <div>
                <dt>Katkı gönderildi</dt>
                <dd>{contributionLabel(selected.contributionTreeStatus)}</dd>
              </div>
            </dl>

            {lastCreated?.id === selected.id && inviteLink(lastCreated) && (
              <div className="invite-link-box">
                <p className="invite-link">
                  Bağlantı: <code>{inviteLink(lastCreated)}</code>
                </p>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    const link = inviteLink(lastCreated);
                    if (link) void copyText(link);
                  }}
                >
                  {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
                </button>
              </div>
            )}

            {selected.status === "pending" && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() =>
                  void api
                    .revokeInvite(selected.id)
                    .then(refresh)
                    .then(() => setSelectedId(null))
                }
              >
                Daveti iptal et
              </button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
