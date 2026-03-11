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

    try {
      const { error, data: authData } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({ title: 'Erro ao fazer login', description: error.message, variant: 'destructive' });
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        toast({ title: 'Erro', description: 'Usuário não encontrado', variant: 'destructive' });
        return;
      }

      // Garantir que a sessão ainda está presente (evita race com signOut em segundo plano)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Erro ao fazer login', description: 'Sessão perdida. Tente novamente.', variant: 'destructive' });
        return;
      }

      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (superAdmin) {
        navigate('/superadmin', { replace: true });
        return;
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', userId)
        .eq('ativo', true)
        .maybeSingle();

      if (usuario) {
        navigate('/', { replace: true });
        return;
      }

      await supabase.auth.signOut();
      toast({ title: 'Acesso negado', description: 'Seu usuário não possui acesso ao sistema.', variant: 'destructive' });
    } catch (err) {
      console.error('Login failed:', err);
      toast({ title: 'Erro ao fazer login', description: 'Falha na comunicação com o servidor. Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-sm shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">MaIA-Hub</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Hub de Atendimento
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Sistema de Atendimento Omnichannel
          </p>
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
