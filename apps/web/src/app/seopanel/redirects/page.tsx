"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Loader2, ToggleLeft, ToggleRight } from "lucide-react";

interface Redirect {
  id: string;
  sourcePath: string;
  destinationPath: string;
  redirectType: number;
  isActive: boolean;
  notes: string | null;
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

export default function SeoRedirects() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [type, setType] = useState(301);
  const [adding, setAdding] = useState(false);

  const fetchRedirects = useCallback(async () => {
    const res = await fetch("/api/seopanel/redirects", { credentials: "include" });
    const data = await res.json();
    if (data.success) setRedirects(data.redirects);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRedirects(); }, [fetchRedirects]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/seopanel/redirects", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePath: source, destinationPath: destination, redirectType: type }),
    });
    const data = await res.json();
    if (data.success) {
      setSource("");
      setDestination("");
      fetchRedirects();
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/seopanel/redirects/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchRedirects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this redirect?")) return;
    await fetch(`/api/seopanel/redirects/${id}`, { method: "DELETE", credentials: "include" });
    fetchRedirects();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">URL Redirects</h1>
        <p className="text-gray-500 text-sm mt-1">Manage 301 (permanent) and 302 (temporary) redirects</p>
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Add New Redirect</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <input className={inputCls} value={source} onChange={(e) => setSource(e.target.value)} placeholder="/old-page" required />
          <input className={inputCls} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="/new-page or https://..." required />
          <select className={inputCls} value={type} onChange={(e) => setType(Number(e.target.value))}>
            <option value={301}>301 Permanent</option>
            <option value={302}>302 Temporary</option>
          </select>
          <button type="submit" disabled={adding} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">From</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">To</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Active</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {redirects.map((r) => (
                <tr key={r.id} className={!r.isActive ? "opacity-50" : ""}>
                  <td className="px-4 py-3 font-mono text-gray-800">{r.sourcePath}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 truncate max-w-xs">{r.destinationPath}</td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-bold">{r.redirectType}</span></td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(r.id, r.isActive)} className="text-gray-500 hover:text-emerald-600">
                      {r.isActive ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {redirects.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No redirects configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
