import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  AppWindow,
  ShieldCheck,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: Users },
  { to: "/apps", label: "Apps", icon: AppWindow },
  { to: "/audit", label: "Audit Log", icon: ScrollText },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      {/* Top navigation */}
      <header className="h-14 bg-white border-b border-border flex items-center px-6 gap-8 sticky top-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-heading font-black text-xl tracking-tight text-foreground">
            MPS Auth
          </span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors duration-150 ${
                  isActive
                    ? "text-primary bg-primary/5 border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right: user + logout */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {user?.full_name?.[0]?.toUpperCase() || "A"}
              </span>
            </div>
            <span className="font-medium text-foreground">{user?.full_name}</span>
            {user?.is_admin && (
              <span className="text-xs px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-semibold uppercase tracking-wide">
                Admin
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors duration-150"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center gap-1 px-4 py-2 bg-white border-b border-border overflow-x-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm whitespace-nowrap transition-colors duration-150 ${
                isActive ? "text-primary bg-primary/5" : "text-muted-foreground"
              }`
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Page content */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
