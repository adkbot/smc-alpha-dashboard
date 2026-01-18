-- Criar função para criar user_settings automaticamente para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, balance, paper_mode, risk_per_trade, max_positions, leverage, bot_status)
  VALUES (NEW.id, 10000, true, 0.06, 3, 20, 'stopped')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para criar user_settings quando novo usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_settings();

-- Adicionar constraint única para user_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_user_id_key'
  ) THEN
    ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Criar user_settings para usuários existentes que não têm
INSERT INTO public.user_settings (user_id, balance, paper_mode, risk_per_trade, max_positions, leverage, bot_status)
SELECT id, 10000, true, 0.06, 3, 20, 'stopped'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_settings WHERE user_id IS NOT NULL)
ON CONFLICT DO NOTHING;