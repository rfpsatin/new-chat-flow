import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

          {/* App routes - wrapped in AppProvider (needs BrowserRouter for useNavigate) */}
          <Route path="/" element={<AppProvider><FilaPage /></AppProvider>} />
          <Route path="/contatos" element={<AppProvider><ContatosPage /></AppProvider>} />
          <Route path="/historico" element={<AppProvider><HistoricoPage /></AppProvider>} />
          <Route path="/dashboard" element={<AppProvider><DashboardAtendimentosPage /></AppProvider>} />
          <Route path="/conexao" element={<AppProvider><ConexaoPage /></AppProvider>} />
          <Route path="/campanhas" element={<AppProvider><CampanhasPage /></AppProvider>} />
          <Route path="/atendentes" element={<AppProvider><UsuariosPage /></AppProvider>} />
          <Route path="/admin/usuarios" element={<AppProvider><UsuariosPage /></AppProvider>} />
          <Route path="/admin/motivos" element={<AppProvider><MotivosPage /></AppProvider>} />
          <Route path="/admin/empresa" element={<AppProvider><EmpresaPage /></AppProvider>} />

          {/* Redirect old super admin login */}
          <Route path="/superadmin/login" element={<Navigate to="/login" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
