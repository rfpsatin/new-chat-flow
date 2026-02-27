import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useUsuarios } from "@/hooks/useUsuarios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, MessageSquare } from "lucide-react";

export function UserSelector() {
  const { empresaId, currentUser, setCurrentUser } = useApp();
  const { data: usuarios, isLoading } = useUsuarios(empresaId);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const navigate = useNavigate();

  const handleLogin = () => {
    const user = usuarios?.find((u) => u.id === selectedUserId);
    if (user) {
      setCurrentUser(user);
      navigate("/", { replace: true });
    }
  };

  const getRoleLabel = (tipo: string) => {
    switch (tipo) {
      case "adm":
        return "Administrador";
      case "sup":
        return "Supervisor";
      case "opr":
        return "Operador";
      default:
        return tipo;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
          <CardTitle className="text-2xl font-bold">Hub de Atendimento</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Atendimento Omnichannel</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Selecione seu usuário</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Escolha um usuário para entrar..." />
              </SelectTrigger>
              <SelectContent>
                {usuarios?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <span className="font-medium">{user.nome}</span>
                    <span className="text-muted-foreground ml-2">— {getRoleLabel(user.tipo_usuario)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full h-12 text-base font-medium" onClick={handleLogin} disabled={!selectedUserId}>
            <LogIn className="w-5 h-5 mr-2" />
            Entrar no Sistema
          </Button>

          <p className="text-center text-xs text-muted-foreground">by MaringaAI</p>
        </CardContent>
      </Card>
    </div>
  );
}
