import { useState, useEffect, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";

const YEAR_LEVELS = ["7", "8", "9", "10", "11", "12"];

export default function Students() {
  const { request } = useApi();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [form, setForm] = useState({ student_id: "", first_name: "", last_name: "", year_level: "7", class_group: "", is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request("GET", "/students/", null, {
        search: search || undefined,
        year_level: yearFilter || undefined,
        page,
        limit: 50,
      });
      setStudents(res.data.items);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [request, search, yearFilter, page]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const openCreate = () => {
    setEditStudent(null);
    setForm({ student_id: "", first_name: "", last_name: "", year_level: "7", class_group: "", is_active: true });
    setShowCreate(true);
  };

  const openEdit = (s) => {
    setEditStudent(s);
    setForm({ student_id: s.student_id, first_name: s.first_name, last_name: s.last_name, year_level: s.year_level, class_group: s.class_group, is_active: s.is_active });
    setShowCreate(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editStudent) {
        await request("PATCH", `/students/${editStudent.id}`, form);
        toast.success("Student updated");
      } else {
        await request("POST", "/students/", form);
        toast.success("Student created");
      }
      setShowCreate(false);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save student");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s) => {
    try {
      await request("PATCH", `/students/${s.id}`, { is_active: !s.is_active });
      toast.success(`Student ${s.is_active ? "deactivated" : "activated"}`);
      fetchStudents();
    } catch {
      toast.error("Action failed");
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete ${s.first_name} ${s.last_name}?`)) return;
    try {
      await request("DELETE", `/students/${s.id}`);
      toast.success("Student deleted");
      fetchStudents();
    } catch {
      toast.error("Failed to delete student");
    }
  };

  const totalPages = Math.ceil(total / 50);

  const inputClass = "w-full h-9 px-3 rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
  const labelClass = "block text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground mb-1.5";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl tracking-tight font-bold font-heading">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} records — shared database</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 h-9 px-4 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:bg-primary/90 transition-colors"
          data-testid="create-student-button"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search students…"
            className="h-9 pl-9 pr-4 w-64 rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="students-search-input"
          />
        </div>
        <select
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-sm border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="students-year-filter"
        >
          <option value="">All year levels</option>
          {YEAR_LEVELS.map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="students-table">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Student ID</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Name</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Year</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Class</th>
                <th className="text-left px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-5 py-3 text-xs tracking-[0.05em] uppercase font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-3"><div className="h-4 bg-muted animate-pulse rounded-sm" /></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No students found
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/30 transition-colors" data-testid={`student-row-${s.id}`}>
                    <td className="px-5 py-3 font-mono text-xs">{s.student_id}</td>
                    <td className="px-5 py-3 font-medium">{s.first_name} {s.last_name}</td>
                    <td className="px-5 py-3 font-mono text-xs">Year {s.year_level}</td>
                    <td className="px-5 py-3 text-xs">{s.class_group}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold border ${s.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 flex items-center justify-center rounded-sm hover:bg-muted transition-colors" data-testid={`student-actions-${s.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(s)} className={s.is_active ? "text-orange-600" : "text-green-700"}>
                            {s.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(s)} className="text-destructive">
                            Delete
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground font-mono">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-3 rounded-sm border border-border text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 px-3 rounded-sm border border-border text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editStudent ? "Edit Student" : "Add Student"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <label className={labelClass}>Student ID</label>
              <input type="text" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className={inputClass} placeholder="e.g. STU001" required disabled={!!editStudent} data-testid="student-id-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First Name</label>
                <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputClass} required data-testid="student-first-name-input" />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} required data-testid="student-last-name-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Year Level</label>
                <select value={form.year_level} onChange={(e) => setForm({ ...form, year_level: e.target.value })} className={inputClass} data-testid="student-year-select">
                  {YEAR_LEVELS.map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Class Group</label>
                <input type="text" value={form.class_group} onChange={(e) => setForm({ ...form, class_group: e.target.value })} className={inputClass} placeholder="e.g. 10A" required data-testid="student-class-input" />
              </div>
            </div>
            {editStudent && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <span className="text-sm font-medium">Active</span>
              </label>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-9 border border-border rounded-sm text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-9 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors" data-testid="save-student-button">
                {saving ? "Saving…" : editStudent ? "Update" : "Add Student"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
