-- FASE 2: MIGRAÇÃO DE SEGURANÇA COMPLETA

-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Criar tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 3. Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Criar função security definer para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Criar tabela user_api_credentials (criptografada)
CREATE TABLE public.user_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  broker_type TEXT NOT NULL CHECK (broker_type IN ('binance', 'forex')),
  encrypted_api_key TEXT,
  encrypted_api_secret TEXT,
  broker_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Habilitar RLS na tabela user_api_credentials
ALTER TABLE public.user_api_credentials ENABLE ROW LEVEL SECURITY;

-- 7. Policies para user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Policies para user_api_credentials (apenas o próprio usuário)
CREATE POLICY "Users can view their own API credentials"
ON public.user_api_credentials FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API credentials"
ON public.user_api_credentials FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API credentials"
ON public.user_api_credentials FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API credentials"
ON public.user_api_credentials FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 9. Atualizar função handle_new_user para criar role padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User')
  );
  
  -- Criar role padrão 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- 10. Adicionar trigger de updated_at para user_api_credentials
CREATE TRIGGER update_user_api_credentials_updated_at
BEFORE UPDATE ON public.user_api_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Adicionar policies de admin em tabelas sensíveis
CREATE POLICY "Admins can view all user settings"
ON public.user_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all operations"
ON public.operations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all active positions"
ON public.active_positions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 12. Corrigir search_path em funções existentes (evitar infinite recursion)
CREATE OR REPLACE FUNCTION public.update_daily_goals_on_operation_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operation_date DATE;
  daily_goal_id UUID;
BEGIN
  IF (OLD.result = 'OPEN' OR OLD.result IS NULL) AND (NEW.result = 'WIN' OR NEW.result = 'LOSS') THEN
    operation_date := DATE(NEW.entry_time);
    
    INSERT INTO daily_goals (date, user_id, total_operations, wins, losses, total_pnl)
    VALUES (operation_date, NEW.user_id, 0, 0, 0, 0)
    ON CONFLICT (date, user_id) DO NOTHING
    RETURNING id INTO daily_goal_id;
    
    UPDATE daily_goals
    SET
      total_operations = total_operations + 1,
      wins = CASE WHEN NEW.result = 'WIN' THEN wins + 1 ELSE wins END,
      losses = CASE WHEN NEW.result = 'LOSS' THEN losses + 1 ELSE losses END,
      total_pnl = total_pnl + COALESCE(NEW.pnl, 0)
    WHERE date = operation_date AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;