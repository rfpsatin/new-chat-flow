import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error, data: authData } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: 'Erro ao fazer login', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      toast({ title: 'Erro', description: 'Usuário não encontrado', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Check if super admin
    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (superAdmin) {
      navigate('/superadmin', { replace: true });
      setLoading(false);
      return;
    }

    // Check if regular user (operator/supervisor)
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('ativo', true)
      .maybeSingle();

    if (usuario) {
      // AppContext will pick up the session via onAuthStateChange
      navigate('/', { replace: true });
      setLoading(false);
      return;
    }

    // No access
    await supabase.auth.signOut();
    toast({ title: 'Acesso negado', description: 'Seu usuário não possui acesso ao sistema.', variant: 'destructive' });
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-sm shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Hub de Atendimento</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Atendimento Omnichannel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">by MaringaAI</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
