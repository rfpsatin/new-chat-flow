-- Adicionar política para permitir INSERT/UPDATE/DELETE na tabela usuarios
DROP POLICY IF EXISTS "Usuarios podem ver usuarios" ON public.usuarios;

CREATE POLICY "Usuarios podem gerenciar usuarios" 
ON public.usuarios 
FOR ALL 
USING (true)
WITH CHECK (true);