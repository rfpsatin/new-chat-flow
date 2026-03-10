import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { SuperAdminProvider } from "@/contexts/SuperAdminContext";
import { SuperAdminGuard } from "@/components/SuperAdminGuard";
import LoginPage from "./pages/LoginPage";
import FilaPage from "./pages/FilaPage";
import ContatosPage from "./pages/ContatosPage";
import HistoricoPage from "./pages/HistoricoPage";
import DashboardAtendimentosPage from "./pages/DashboardAtendimentosPage";
import ConexaoPage from "./pages/ConexaoPage";
import CampanhasPage from "./pages/CampanhasPage";
import UsuariosPage from "./pages/admin/UsuariosPage";
import MotivosPage from "./pages/admin/MotivosPage";
import EmpresaPage from "./pages/admin/EmpresaPage";
import SuperAdminEmpresasPage from "./pages/superadmin/EmpresasPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Login unificado */}
          <Route path="/login" element={<LoginPage />} />

          {/* Super Admin routes */}
          <Route path="/superadmin" element={<SuperAdminProvider><SuperAdminGuard><SuperAdminEmpresasPage /></SuperAdminGuard></SuperAdminProvider>} />
          <Route path="/superadmin/empresas" element={<SuperAdminProvider><SuperAdminGuard><SuperAdminEmpresasPage /></SuperAdminGuard></SuperAdminProvider>} />

          {/* App routes - single AppProvider persists across all navigations */}
          <Route element={<AppProvider><Outlet /></AppProvider>}>
            <Route path="/" element={<FilaPage />} />
            <Route path="/contatos" element={<ContatosPage />} />
            <Route path="/historico" element={<HistoricoPage />} />
            <Route path="/dashboard" element={<DashboardAtendimentosPage />} />
            <Route path="/conexao" element={<ConexaoPage />} />
            <Route path="/campanhas" element={<CampanhasPage />} />
            <Route path="/atendentes" element={<UsuariosPage />} />
            <Route path="/admin/usuarios" element={<UsuariosPage />} />
            <Route path="/admin/motivos" element={<MotivosPage />} />
            <Route path="/admin/empresa" element={<EmpresaPage />} />
          </Route>

          {/* Redirect old super admin login */}
          <Route path="/superadmin/login" element={<Navigate to="/login" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
