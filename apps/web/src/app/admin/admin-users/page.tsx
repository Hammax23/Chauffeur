// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  AlertCircle,
  ShieldCheck,
  Plus,
  Pencil,
  Check,
  X,
  RefreshCw,
  KeyRound,
  Info,
} from "lucide-react";

type AdminRow = {
  id: string;
  email: string;
  name: string | null;
  role?: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [legacyActive, setLegacyActive] = useState(false);

  const [modal, setModal] = useState<"add" | "edit" | "password" | null>(null);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "OWNER",
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      setError("");
      const res = await fetch("/api/admin/admin-users", { credentials: "include" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to load admins");
        return;
      }
      setRows(data.admins || []);
      setLegacyActive(!!data.legacyActive);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setInitialLoad(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setModalError("");
    setEditing(null);
    setForm({ email: "", name: "", password: "", role: "OWNER" });
    setModal("add");
  };

  const openEditName = (row: AdminRow) => {
    setModalError("");
    setEditing(row);
    setForm({
      email: row.email,
      name: row.name || "",
      password: "",
      role: row.role === "BILLING_ASSISTANT" ? "BILLING_ASSISTANT" : "OWNER",
    });
    setModal("edit");
  };

  const openPassword = (row: AdminRow) => {
    setModalError("");
    setEditing(row);
    setForm({
      email: row.email,
      name: row.name || "",
      password: "",
      role: row.role === "BILLING_ASSISTANT" ? "BILLING_ASSISTANT" : "OWNER",
    });
    setModal("password");
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
    setModalError("");
    setForm({ email: "", name: "", password: "", role: "OWNER" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError("");
    try {
      if (modal === "add") {
        const res = await fetch("/api/admin/admin-users", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email.trim(),
            name: form.name.trim() || null,
            password: form.password,
            role: form.role,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setModalError(data.error || "Failed to create admin");
          return;
        }
      } else if (modal === "edit" && editing) {
        const res = await fetch("/api/admin/admin-users", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing.id,
            // Send as string (API trims + nulls empty) so admins can clear the name.
            name: form.name.trim(),
            role: form.role,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setModalError(data.error || "Failed to update admin");
          return;
        }
      } else if (modal === "password" && editing) {
        if (form.password.length < 10) {
          setModalError("Password must be at least 10 characters");
          return;
        }
        const res = await fetch("/api/admin/admin-users", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing.id,
            newPassword: form.password,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setModalError(data.error || "Failed to change password");
          return;
        }
      }
      closeModal();
      await load();
    } catch {
      setModalError("Request failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: AdminRow) => {
    setRowBusy(row.id);
    try {
      const res = await fetch("/api/admin/admin-users", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, isActive: !row.isActive }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to update admin");
        return;
      }
      await load();
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 tracking-tight">
            <ShieldCheck className="w-8 h-8 text-[#C9A063]" />
            Admin Users
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the humans who can sign in to the SARJ admin panel. Each admin has their own
            email + password, audit trail, and can be deactivated without losing history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing || initialLoad}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#C9A063] text-[#1a1a1a] font-semibold hover:brightness-95 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add admin
          </button>
        </div>
      </div>

      {legacyActive ? (
        <div className="mb-5 p-4 bg-[#C9A063]/10 border border-[#C9A063]/30 rounded-xl flex items-start gap-3 text-sm">
          <Info className="w-5 h-5 shrink-0 text-[#8B6914] mt-0.5" />
          <div className="text-[#5C4218]">
            <div className="font-semibold text-[#8B6914]">Legacy admin bootstrap is active</div>
            <p className="mt-1 leading-relaxed">
              No admin accounts exist yet — the server is falling back to the{" "}
              <code className="font-mono bg-white/60 px-1.5 py-0.5 rounded">ADMIN_PASSWORD</code>{" "}
              environment variable. Create your first admin above to retire the legacy flow and
              enable per-user audit tracking.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200/80 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {initialLoad ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading admins…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">
              No admin accounts yet. Add one to retire the legacy env password.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3">Email (login)</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Last login</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] bg-gray-100 px-2 py-0.5 rounded">
                        {row.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {row.name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {row.role === "BILLING_ASSISTANT" ? "Billing Assistant" : "Owner"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          row.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {row.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 tabular-nums">
                      {formatWhen(row.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditName(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit name
                        </button>
                        <button
                          type="button"
                          onClick={() => openPassword(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-[#8B6914] bg-[#C9A063]/15 hover:bg-[#C9A063]/25"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Password
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy === row.id}
                          onClick={() => void toggleActive(row)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50 ${
                            row.isActive
                              ? "text-red-700 bg-red-50 hover:bg-red-100"
                              : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          }`}
                        >
                          {rowBusy === row.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : row.isActive ? (
                            <X className="w-3.5 h-3.5" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          {row.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal ? (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {modal === "add"
                    ? "Add admin user"
                    : modal === "edit"
                      ? "Edit admin"
                      : "Change password"}
                </h3>
                {editing ? (
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{editing.email}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-md hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              {modalError ? (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              ) : null}

              {modal === "add" ? (
                <>
                  <label className="text-xs text-gray-600 flex flex-col gap-1">
                    Email <span className="text-red-500">*</span>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25"
                      placeholder="admin@sarjworldwide.com"
                    />
                  </label>
                  <label className="text-xs text-gray-600 flex flex-col gap-1">
                    Display name (optional)
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25"
                      placeholder="Jane Doe"
                      maxLength={120}
                    />
                  </label>
                  <label className="text-xs text-gray-600 flex flex-col gap-1">
                    Password <span className="text-red-500">*</span>
                    <input
                      type="password"
                      required
                      minLength={10}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25"
                      placeholder="At least 10 characters"
                    />
                    <span className="text-[11px] text-gray-400">
                      Minimum 10 characters. Choose something unique — admins have full access.
                    </span>
                  </label>
                  <label className="text-xs text-gray-600 flex flex-col gap-1">
                    Role
                    <select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                      className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25"
                    >
                      <option value="OWNER">Owner (full admin)</option>
                      <option value="BILLING_ASSISTANT">Billing Assistant (invoices only)</option>
                    </select>
                  </label>
                </>
              ) : modal === "edit" ? (
                <>
                <label className="text-xs text-gray-600 flex flex-col gap-1">
                  Display name
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25"
                    placeholder="Jane Doe"
                    maxLength={120}
                  />
                </label>
                <label className="text-xs text-gray-600 flex flex-col gap-1">
                  Role
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25"
                  >
                    <option value="OWNER">Owner (full admin)</option>
                    <option value="BILLING_ASSISTANT">Billing Assistant (invoices only)</option>
                  </select>
                </label>
                </>
              ) : (
                <label className="text-xs text-gray-600 flex flex-col gap-1">
                  New password
                  <input
                    type="password"
                    required
                    minLength={10}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25"
                    placeholder="At least 10 characters"
                  />
                  <span className="text-[11px] text-gray-400">
                    Minimum 10 characters. The admin will need to sign in again with the new
                    password.
                  </span>
                </label>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-[#C9A063] text-[#1a1a1a] text-sm font-semibold hover:brightness-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {modal === "add"
                    ? "Create admin"
                    : modal === "edit"
                      ? "Save"
                      : "Change password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
