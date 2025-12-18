import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  LogOut,
  LayoutDashboard,
  Headphones,
  Shield,
  UserCog,
  FileText,
  BarChart3,
} from 'lucide-react';

const menuItems = [
  { title: 'Fila de Atendimento', url: '/', icon: LayoutDashboard },
  { title: 'Contatos', url: '/contatos', icon: Users },
  { title: 'Atendentes', url: '/atendentes', icon: Headphones },
  { title: 'Histórico', url: '/historico', icon: Clock },
  { title: 'Dashboard', url: '/dashboard', icon: BarChart3 },
];

const adminMenuItems = [
  { title: 'Usuários', url: '/admin/usuarios', icon: UserCog },
  { title: 'Motivos Encerramento', url: '/admin/motivos', icon: FileText },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, setSelectedConversa } = useApp();

  const isAdmin = currentUser?.tipo_usuario === 'adm';

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedConversa(null);
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (tipo: string) => {
    switch (tipo) {
      case 'adm': return 'Administrador';
      case 'sup': return 'Supervisor';
      case 'opr': return 'Operador';
      default: return tipo;
    }
  };

  const renderMenuItem = (item: typeof menuItems[0], isActive: boolean) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={`h-11 px-3 rounded-lg transition-colors ${
          isActive 
            ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
            : 'text-sidebar-foreground hover:bg-sidebar-accent'
        }`}
      >
        <button onClick={() => navigate(item.url)}>
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.title}</span>
        </button>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">AtendeBem</h1>
            <p className="text-xs text-sidebar-foreground/60">Omnichannel</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return renderMenuItem(item, isActive);
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <Separator className="my-2 bg-sidebar-border" />
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2 text-sidebar-foreground/60 px-3 py-2">
                <Shield className="w-4 h-4" />
                <span>Administração</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminMenuItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return renderMenuItem(item, isActive);
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {currentUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-sm font-medium">
                  {getInitials(currentUser.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sidebar-foreground text-sm truncate">
                  {currentUser.nome}
                </p>
                <p className="text-xs text-sidebar-foreground/60">
                  {getRoleLabel(currentUser.tipo_usuario)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
