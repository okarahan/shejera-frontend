import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { InviteResponse, UserRole } from "../api/types";

interface InvitesAdminProps {
  onClose: () => void;
}

export function InvitesAdmin({ onClose }: InvitesAdminProps) {
  const [invites, setInvites] = useState<InviteResponse[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("contributor");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setInvites(await api.listInvites());
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Laden fehlgeschlagen"),
    );
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const created = await api.createInvite({ email, displayName, role, expiresInDays: 30 });
      setLastLink(
        created.inviteUrl ??
          (created.invitePath
            ? `${import.meta.env.VITE_INVITE_ORIGIN?.replace(/\/$/, "") || window.location.origin}${created.invitePath}`
            : null),
      );
      setEmail("");
      setDisplayName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anlegen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Einladungen</h2>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>
        <div className="modal__body">
          {error && <p className="error-banner">{error}</p>}
          {lastLink && (
            <p className="invite-link">
              Link: <code>{lastLink}</code>
            </p>
          )}
          <div className="form-grid">
            <label>
              Name
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label>
              E-Mail
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Rolle
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="contributor">Contributor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy || !email || !displayName}
              onClick={() => void create()}
            >
              Einladung erstellen
            </button>
          </div>
          <ul className="invite-list">
            {invites.map((inv) => (
              <li key={inv.id}>
                <strong>{inv.displayName}</strong> · {inv.email} · {inv.role} ·{" "}
                {inv.status}
                {inv.status === "pending" && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() =>
                        void api.revokeInvite(inv.id).then(refresh)
                      }
                    >
                      Widerrufen
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
