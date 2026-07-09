"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Download, Upload, Loader2, History, FileJson, CheckCircle2,
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityLabel: string | null;
  createdAt: string;
}

export default function SeoToolsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/seopanel/audit?limit=100", { credentials: "include" });
    const data = await res.json();
    if (data.success) setLogs(data.logs);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    const res = await fetch("/api/seopanel/bulk", { credentials: "include" });
    const data = await res.json();
    if (data.success) {
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sarj-seo-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded successfully.");
      await fetchLogs();
    }
    setExporting(false);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setMessage("");
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch("/api/seopanel/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload.data ?? payload }),
      });
      const data = await res.json();
      if (!data.success) {
        setMessage(data.error || "Import failed");
      } else {
        setMessage(`Import complete: ${data.imported.pages} pages, ${data.imported.blogPosts} blog posts, ${data.imported.redirects} redirects.`);
        await fetchLogs();
      }
    } catch {
      setMessage("Invalid JSON file.");
    }
    setImporting(false);
  };

  const actionColors: Record<string, string> = {
    create: "bg-emerald-100 text-emerald-700",
    update: "bg-blue-100 text-blue-700",
    delete: "bg-red-100 text-red-700",
    import: "bg-purple-100 text-purple-700",
    export: "bg-amber-100 text-amber-700",
    sync: "bg-gray-100 text-gray-700",
    seed: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tools & Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">Bulk import/export and activity history</p>
      </div>

      {message && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 rounded-xl"><Download className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-900">Export SEO Data</h2>
              <p className="text-xs text-gray-500">Pages, blog, redirects, settings, cities & services</p>
            </div>
          </div>
          <button onClick={handleExport} disabled={exporting} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            Download JSON Export
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 rounded-xl"><Upload className="w-5 h-5 text-blue-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-900">Import SEO Data</h2>
              <p className="text-xs text-gray-500">Restore from a previous JSON export</p>
            </div>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload JSON File
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = "";
          }} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Audit Log</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : logs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">No activity recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="px-6 py-3 flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${actionColors[log.action] || "bg-gray-100 text-gray-600"}`}>
                    {log.action}
                  </span>
                  <span className="text-gray-500 shrink-0">{log.entityType}</span>
                  {log.entityLabel && <span className="text-gray-900 truncate">{log.entityLabel}</span>}
                </div>
                <span className="text-gray-400 text-xs shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
