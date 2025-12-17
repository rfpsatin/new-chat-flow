import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useUsuarios } from '@/hooks/useUsuarios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogIn, MessageSquare } from 'lucide-react';

export function UserSelector() {
  const { empresaId, currentUser, setCurrentUser } = useApp();
  const { data: usuarios, isLoading } = useUsuarios(empresaId);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const handleLogin = () => {
    const user = usuarios?.find(u => u.id === selectedUserId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const getRoleLabel = (tipo: string) => {
    switch (tipo) {
      case 'adm': return 'Administrador';
      case 'sup': return 'Supervisor';
      case 'opr': return 'Operador';
      default: return tipo;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-0 animate-fade-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">AtendeBem</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Sistema de Atendimento Omnichannel
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Selecione seu usuário
            </label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={isLoading}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Escolha um usuário para entrar..." />
              </SelectTrigger>
              <SelectContent>
                {usuarios?.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(user.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{user.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {getRoleLabel(user.tipo_usuario)}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            className="w-full h-12 text-base font-medium"
            onClick={handleLogin}
            disabled={!selectedUserId}
          >
            <LogIn className="w-5 h-5 mr-2" />
            Entrar no Sistema
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            Protótipo MVP - Ambiente de demonstração
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
