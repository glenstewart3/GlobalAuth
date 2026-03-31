import { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";
import { Users, GraduationCap, AppWindow, Activity } from "lucide-react";

const ACTION_COLORS = {
  LOGIN: "badge-login",
  LOGOUT: "badge-logout",
  FAILED_LOGIN: "badge-failed-login",
  PERMISSION_CHANGE: "badge-permission-change",
  USER_CREATED: "badge-user-created",
  USER_DEACTIVATED: "badge-user-deactivated",
  USER_ACTIVATED: "badge-permission-change",
  APP_CREATED: "badge-user-created",
  APP_UPDATED: "badge-default",
  USER_UPDATED: "badge-default",
};

function StatCard({ label, value, icon: Icon, loading }) {
  return (
    <div className="bg-white border border-border rounded-sm p-5" data-testid={`stat-card-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-muted animate-pulse rounded-sm" />
      ) : (
        <p className="text-3xl font-heading font-bold text-foreground font-mono">{value}</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { request } = useApi();
  const [stats, setStats] = useState({ users: 0, students: 0, apps: 0 });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, studentsRes, appsRes, auditRes] = await Promise.all([
          request("GET", "/users/", null, { limit: 1 }),
          request("GET", "/students/", null, { limit: 1 }),
          request("GET", "/apps/"),
          request("GET", "/audit/", null, { limit: 10 }),
        ]);
        setStats({
          users: usersRes.data.total,
          students: studentsRes.data.total,
          apps: appsRes.data.length,
        });
        setAuditLogs(auditRes.data.items);
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [request]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl tracking-tight font-bold font-heading">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">System overview and recent activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.users} icon={Users} loading={loading} />
        <StatCard label="Total Students" value={stats.students} icon={GraduationCap} loading={loading} />
        <StatCard label="Registered Apps" value={stats.apps} icon={AppWindow} loading={loading} />
      </div>

      {/* Recent audit log */}
      <div className="bg-white border border-border rounded-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-heading font-semibold tracking-tight">Recent Activity</h2>
          </div>
          <span className="text-xs text-muted-foreground">Last 10 events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="recent-audit-table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2.5 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">
                  Action
                </th>
                <th className="text-left px-5 py-2.5 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">
                  User
                </th>
                <th className="text-left px-5 py-2.5 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">
                  IP
                </th>
                <th className="text-left px-5 py-2.5 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded-sm" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No activity yet
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold border font-mono ${
                          ACTION_COLORS[log.action] || "badge-default"
                        }`}
                      >
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {log.user_email || "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {log.ip_address || "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
