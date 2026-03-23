
-- 1. Create super_admins table
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id)
);
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins podem ver" ON public.super_admins
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- 2. Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE auth_user_id = p_user_id) $$;

-- 3. RLS policies for empresas - allow super admins to INSERT, UPDATE, DELETE
CREATE POLICY "Super admins podem inserir empresas" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem atualizar empresas" ON public.empresas
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem deletar empresas" ON public.empresas
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
