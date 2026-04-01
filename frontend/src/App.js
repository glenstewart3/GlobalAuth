import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Students from "./pages/Students";
import AuditLog from "./pages/AuditLog";
import Apps from "./pages/Apps";
import { Toaster } from "./components/ui/sonner";
import "./App.css";

function App() {
  // Redirect to /auth/login if the user lands on a non-auth path (e.g. root /)
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
    window.location.replace("/auth/login");
    return null;
  }

  return (
    <BrowserRouter basename="/auth">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="students" element={<Students />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="apps" element={<Apps />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
