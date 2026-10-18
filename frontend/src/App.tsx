import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { Loading } from "./components/Loading";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { WorkItemDetailPage } from "./pages/WorkItemDetailPage";
import { WorkItemsPage } from "./pages/WorkItemsPage";

const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Restoring your session" />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/work-items" element={<WorkItemsPage />} />
        <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
