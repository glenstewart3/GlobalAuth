import { useState, useEffect, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";
import { Filter } from "lucide-react";

const ACTIONS = [
  "LOGIN", "LOGOUT", "FAILED_LOGIN", "PERMISSION_CHANGE",
  "USER_CREATED", "USER_UPDATED", "USER_DEACTIVATED", "USER_ACTIVATED",
  "APP_CREATED", "APP_UPDATED",
];

const ACTION_COLORS = {
  LOGIN: "bg-green-50 text-green-700 border-green-200",
  LOGOUT: "bg-slate-100 text-slate-600 border-slate-200",
  FAILED_LOGIN: "bg-red-50 text-red-700 border-red-200",
  PERMISSION_CHANGE: "bg-blue-50 text-blue-700 border-blue-200",
  USER_CREATED: "bg-purple-50 text-purple-700 border-purple-200",
  USER_UPDATED: "bg-gray-50 text-gray-600 border-gray-200",
  USER_DEACTIVATED: "bg-orange-50 text-orange-700 border-orange-200",
  USER_ACTIVATED: "bg-green-50 text-green-700 border-green-200",
  APP_CREATED: "bg-purple-50 text-purple-700 border-purple-200",
  APP_UPDATED: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function AuditLog() {
  const { request } = useApi();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: "", user_email: "" });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request("GET", "/audit/", null, {
        action: filters.action || undefined,
        user_email: filters.user_email || undefined,
        page,
        limit: 50,
      });
      setLogs(res.data.items);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [request, filters, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl tracking-tight font-bold font-heading">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} events recorded</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">Filter:</span>
        </div>
        <select
          value={filters.action}
          onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}
          className="h-9 px-3 rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="audit-action-filter"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
        <input
          type="text"
          value={filters.user_email}
          onChange={(e) => { setFilters({ ...filters, user_email: e.target.value }); setPage(1); }}
          placeholder="Filter by email…"
          className="h-9 px-3 w-52 rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="audit-email-filter"
        />
        {(filters.action || filters.user_email) && (
          <button
            onClick={() => { setFilters({ action: "", user_email: "" }); setPage(1); }}
            className="h-9 px-3 rounded-sm border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="audit-table">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Action</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">User</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Description</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">IP Address</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-5 py-3"><div className="h-4 bg-muted animate-pulse rounded-sm" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No audit events found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors" data-testid={`audit-row-${log.id}`}>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold border font-mono ${ACTION_COLORS[log.action] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {log.user_email || "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-xs truncate">
                      {log.description || "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {log.ip_address || "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground font-mono">Page {page} of {totalPages} ({total} total)</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-3 rounded-sm border border-border text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 px-3 rounded-sm border border-border text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
