import { useState, useEffect, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Search, UserCheck, UserX, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const ROLES = ["admin", "non-admin"];

export default function Users() {
  const { request } = useApi();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", full_name: "", password: "", is_admin: false });
  const [createLoading, setCreateLoading] = useState(false);

  // Permission modal
  const [showPerms, setShowPerms] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [perms, setPerms] = useState([]);
  const [permForm, setPermForm] = useState({ app_id: "", role: "non-admin" });
  const [permLoading, setPermLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request("GET", "/users/", null, { search: search || undefined, page, limit: 20 });
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [request, search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    request("GET", "/apps/").then((r) => setApps(r.data)).catch(() => {});
  }, [request]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await request("POST", "/users/", createForm);
      toast.success("User created");
      setShowCreate(false);
      setCreateForm({ email: "", full_name: "", password: "", is_admin: false });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      const action = user.is_active ? "deactivate" : "activate";
      await request("POST", `/users/${user.id}/${action}`);
      toast.success(`User ${user.is_active ? "deactivated" : "activated"}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  const openPerms = async (user) => {
    setSelectedUser(user);
    setShowPerms(true);
    try {
      const res = await request("GET", `/users/${user.id}/permissions`);
      setPerms(res.data);
    } catch {
      toast.error("Failed to load permissions");
    }
  };

  const assignPerm = async (e) => {
    e.preventDefault();
    if (!permForm.app_id) return toast.error("Select an app");
    setPermLoading(true);
    try {
      await request("POST", `/users/${selectedUser.id}/permissions`, permForm);
      toast.success("Permission assigned");
      const res = await request("GET", `/users/${selectedUser.id}/permissions`);
      setPerms(res.data);
      setPermForm({ app_id: "", role: "student" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to assign permission");
    } finally {
      setPermLoading(false);
    }
  };

  const removePerm = async (permId) => {
    try {
      await request("DELETE", `/users/${selectedUser.id}/permissions/${permId}`);
      toast.success("Permission removed");
      setPerms((p) => p.filter((x) => x.id !== permId));
    } catch {
      toast.error("Failed to remove permission");
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl tracking-tight font-bold font-heading">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} total accounts</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 h-9 px-4 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:bg-primary/90 transition-colors"
          data-testid="create-user-button"
        >
          <Plus className="h-4 w-4" />
          New User
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email…"
          className="h-9 pl-9 pr-4 w-full max-w-xs rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="users-search-input"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="users-table">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Name</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Email</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Role</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Created</th>
                <th className="text-right px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded-sm" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors" data-testid={`user-row-${u.id}`}>
                    <td className="px-5 py-3 font-medium">{u.full_name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3">
                      {u.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-sm text-xs font-semibold bg-muted text-muted-foreground border border-border">
                          Staff
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold border ${
                          u.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {u.is_active ? (
                          <><UserCheck className="h-3 w-3" />Active</>
                        ) : (
                          <><UserX className="h-3 w-3" />Inactive</>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 flex items-center justify-center rounded-sm hover:bg-muted transition-colors" data-testid={`user-actions-${u.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openPerms(u)} data-testid={`manage-perms-${u.id}`}>
                            Manage Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleActive(u)}
                            className={u.is_active ? "text-destructive" : "text-green-700"}
                            data-testid={`toggle-active-${u.id}`}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground font-mono">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 px-3 rounded-sm border border-border text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 px-3 rounded-sm border border-border text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Create New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            {[
              { key: "full_name", label: "Full name", type: "text", ph: "Jane Smith" },
              { key: "email", label: "Email", type: "email", ph: "jane@school.edu.au" },
              { key: "password", label: "Password", type: "password", ph: "Min. 8 characters" },
            ].map(({ key, label, type, ph }) => (
              <div key={key}>
                <label className="block text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground mb-1.5">
                  {label}
                </label>
                <input
                  type={type}
                  value={createForm[key]}
                  onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
                  placeholder={ph}
                  required
                  className="w-full h-9 px-3 rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  data-testid={`create-user-${key}`}
                />
              </div>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.is_admin}
                onChange={(e) => setCreateForm({ ...createForm, is_admin: e.target.checked })}
                className="rounded-sm"
                data-testid="create-user-is-admin"
              />
              <span className="text-sm font-medium">Admin user</span>
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 h-9 border border-border rounded-sm text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="flex-1 h-9 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                data-testid="create-user-submit"
              >
                {createLoading ? "Creating…" : "Create User"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPerms} onOpenChange={setShowPerms}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              App Permissions — {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>

          {/* Current permissions */}
          <div className="mt-2 space-y-2">
            {perms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No permissions assigned yet.</p>
            ) : (
              perms.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 bg-muted/30 border border-border rounded-sm"
                  data-testid={`perm-row-${p.id}`}
                >
                  <div>
                    <span className="text-sm font-medium">{p.app_name}</span>
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
                      {p.role}
                    </span>
                  </div>
                  <button
                    onClick={() => removePerm(p.id)}
                    className="text-xs text-destructive hover:underline"
                    data-testid={`remove-perm-${p.id}`}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Assign new permission */}
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground mb-3">
              Assign to app
            </p>
            <form onSubmit={assignPerm} className="flex gap-2">
              <select
                value={permForm.app_id}
                onChange={(e) => setPermForm({ ...permForm, app_id: e.target.value })}
                className="flex-1 h-9 px-3 rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="perm-app-select"
              >
                <option value="">Select app…</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <select
                value={permForm.role}
                onChange={(e) => setPermForm({ ...permForm, role: e.target.value })}
                className="w-32 h-9 px-3 rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="perm-role-select"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                type="submit"
                disabled={permLoading}
                className="h-9 px-4 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                data-testid="assign-perm-submit"
              >
                Assign
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
