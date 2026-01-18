-- Remove old triggers that reference non-existent tables
DROP TRIGGER IF EXISTS on_auth_user_created_2025_11_29_14_39 ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_2025_11_29_15_37 ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_2025_11_29_23_24 ON auth.users;

-- Remove orphan functions
DROP FUNCTION IF EXISTS public.handle_new_user_2025_11_29_14_39();
DROP FUNCTION IF EXISTS public.handle_new_user_2025_11_29_15_37();
DROP FUNCTION IF EXISTS public.handle_new_user_2025_11_29_23_24();

-- Improve initialize_user_trading_status to not block signup on errors
CREATE OR REPLACE FUNCTION public.initialize_user_trading_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO trading_status (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_onboarding_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao inicializar trading_status para usuário %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;