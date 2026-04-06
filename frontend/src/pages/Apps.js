import { useState, useEffect, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Server } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";

export default function Apps() {
  const { request } = useApi();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editApp, setEditApp] = useState(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving] = useState(false);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request("GET", "/apps/");
      setApps(res.data);
    } catch {
      toast.error("Failed to load apps");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const openCreate = () => {
    setEditApp(null);
    setForm({ name: "", slug: "", description: "" });
    setShowCreate(true);
  };

  const openEdit = (app) => {
    setEditApp(app);
    setForm({ name: app.name, slug: app.slug, description: app.description || "" });
    setShowCreate(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editApp) {
        await request("PATCH", `/apps/${editApp.id}`, { name: form.name, description: form.description });
        toast.success("App updated");
      } else {
        await request("POST", "/apps/", form);
        toast.success("App created");
      }
      setShowCreate(false);
      fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save app");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (app) => {
    try {
      await request("PATCH", `/apps/${app.id}`, { is_active: !app.is_active });
      toast.success(`App ${app.is_active ? "deactivated" : "activated"}`);
      fetchApps();
    } catch {
      toast.error("Action failed");
    }
  };

  const handleDelete = async (app) => {
    if (!window.confirm(`Permanently delete "${app.name}"? This cannot be undone.`)) return;
    try {
      await request("DELETE", `/apps/${app.id}`);
      toast.success(`${app.name} deleted`);
      fetchApps();
    } catch {
      toast.error("Failed to delete app");
    }
  };

  const inputClass = "w-full h-9 px-3 rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
  const labelClass = "block text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground mb-1.5";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl tracking-tight font-bold font-heading">Apps</h1>
          <p className="text-sm text-muted-foreground mt-1">Registered applications — stored in database</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 h-9 px-4 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:bg-primary/90 transition-colors"
          data-testid="create-app-button"
        >
          <Plus className="h-4 w-4" />
          New App
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-sm p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-white border border-border rounded-sm p-12 text-center">
          <Server className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No apps registered yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-white border border-border rounded-sm p-5 flex flex-col"
              data-testid={`app-card-${app.slug}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-sm bg-primary/10 flex items-center justify-center">
                    <Server className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm">{app.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground">{app.slug}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-7 w-7 flex items-center justify-center rounded-sm hover:bg-muted transition-colors" data-testid={`app-actions-${app.slug}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(app)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleActive(app)}
                      className={app.is_active ? "text-orange-600" : "text-green-700"}
                    >
                      {app.is_active ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(app)}
                      className="text-destructive"
                      data-testid={`delete-app-${app.slug}`}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {app.description && (
                <p className="text-xs text-muted-foreground mb-3 flex-1">{app.description}</p>
              )}

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                <span
                  className={`px-2 py-0.5 rounded-sm text-xs font-semibold border ${
                    app.is_active
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {app.is_active ? "Active" : "Inactive"}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {app.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editApp ? "Edit App" : "Register New App"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <label className={labelClass}>App Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. WellTrack" required data-testid="app-name-input" />
            </div>
            <div>
              <label className={labelClass}>Slug (unique identifier)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                className={inputClass}
                placeholder="e.g. welltrack"
                required
                disabled={!!editApp}
                data-testid="app-slug-input"
              />
            </div>
            <div>
              <label className={labelClass}>Description (optional)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                rows={2}
                placeholder="Brief description…"
                data-testid="app-description-input"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-9 border border-border rounded-sm text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-9 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors" data-testid="save-app-button">
                {saving ? "Saving…" : editApp ? "Update App" : "Create App"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
