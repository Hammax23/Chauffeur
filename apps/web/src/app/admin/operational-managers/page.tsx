"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  AlertCircle,
  UserCog,
  Plus,
  Pencil,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";

type OpsRow = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const PANEL_PATH = "/operational-manager";

export default function OperationalManagersAdminPage() {
  const [rows, setRows] = useState<OpsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<OpsRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    isActive: true,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/operational-managers", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setRows(data.operationalManagers || []);
      } else {
        setError(data.error || "Failed to load");
      }
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setError("");
    setEditing(null);
    setForm({ name: "", email: "", password: "", isActive: true });
    setModal("add");
  };

  const openEdit = (r: OpsRow) => {
    setError("");
    setEditing(r);
    setForm({
      name: r.name || "",
      email: r.email,
      password: "",
      isActive: r.isActive,
    });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (modal === "add") {
        if (form.password.length < 8) {
          setError("Password must be at least 8 characters");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/admin/operational-managers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: form.name.trim() || null,
            email: form.email.trim(),
            password: form.password,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Failed to create");
          return;
        }
      } else if (modal === "edit" && editing) {
        const body: Record<string, unknown> = {
          name: form.name.trim() || null,
          email: form.email.trim(),
          isActive: form.isActive,
        };
        if (form.password.trim().length > 0) {
          if (form.password.length < 8) {
            setError("New password must be at least 8 characters");
            setSaving(false);
            return;
          }
          body.password = form.password;
        }
        const res = await fetch(`/api/admin/operational-managers/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Failed to update");
          return;
        }
      }
      closeModal();
      await load();
    } catch {
      setError("Request failed");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: string) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/operational-managers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setDeleteId(null);
        await load();
      } else {
        setError(data.error || "Delete failed");
      }
    } catch {
      setError("Delete failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A063]" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="w-8 h-8 text-[#C9A063]" />
            Operational Managers
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Create accounts for staff who may only assign drivers to reservations. They sign in at{" "}
            <a
              href={PANEL_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C9A063] font-semibold inline-flex items-center gap-1 hover:underline"
            >
              {PANEL_PATH}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>{" "}
            using <strong className="text-gray-700">email</strong> and{" "}
            <strong className="text-gray-700">password</strong> you set here.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C9A063] text-white font-semibold hover:bg-[#B8904F] shadow-sm shrink-0"
        >
          <Plus className="w-5 h-5" />
          Add operational manager
        </button>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <UserCog className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No operational managers yet. Add one to grant assignment-only access.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email (login)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{r.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                          r.isActive
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(r.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-100 text-red-700 hover:bg-red-50 text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6 max-h-[90dvh] overflow-y-auto text-gray-900 [color-scheme:light]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Add operational manager" : "Edit operational manager"}
              </h2>
              <button type="button" onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Display name (optional)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-600 bg-white focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25"
                  placeholder="e.g. Operations — Night shift"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-600 bg-white focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25"
                  placeholder="manager@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Password {modal === "add" && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-600 bg-white focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25"
                  placeholder={modal === "edit" ? "Leave blank to keep current password" : "Min 8 characters"}
                  required={modal === "add"}
                  minLength={modal === "add" ? 8 : undefined}
                />
              </div>
              {modal === "edit" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-[#C9A063] focus:ring-[#C9A063]"
                  />
                  <span className="text-sm font-medium text-gray-800">Account active (can sign in)</span>
                </label>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:flex-1 py-3 rounded-xl bg-[#C9A063] text-white font-semibold hover:bg-[#B8904F] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {modal === "add" ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <p className="text-gray-900 font-semibold mb-2">Remove this account?</p>
            <p className="text-sm text-gray-500 mb-4">
              They will no longer be able to sign in to the operational manager panel.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => doDelete(deleteId)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
