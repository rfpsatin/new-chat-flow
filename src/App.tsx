import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import FilaPage from "./pages/FilaPage";
import ContatosPage from "./pages/ContatosPage";
import HistoricoPage from "./pages/HistoricoPage";
import DashboardAtendimentosPage from "./pages/DashboardAtendimentosPage";
import ConexaoPage from "./pages/ConexaoPage";
import CampanhasPage from "./pages/CampanhasPage";
import UsuariosPage from "./pages/admin/UsuariosPage";
import MotivosPage from "./pages/admin/MotivosPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<FilaPage />} />
            <Route path="/contatos" element={<ContatosPage />} />
            <Route path="/historico" element={<HistoricoPage />} />
            <Route path="/dashboard" element={<DashboardAtendimentosPage />} />
            <Route path="/conexao" element={<ConexaoPage />} />
            <Route path="/campanhas" element={<CampanhasPage />} />
            <Route path="/atendentes" element={<UsuariosPage />} />
            <Route path="/admin/usuarios" element={<UsuariosPage />} />
            <Route path="/admin/motivos" element={<MotivosPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
