-- ============================================================
-- Adiciona coluna user_id na tabela mensalidades
-- ============================================================
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mensalidades_user_id ON mensalidades (user_id);

-- ============================================================
-- Função para exclusão de conta (LGPD)
-- ============================================================
CREATE OR REPLACE FUNCTION excluir_minha_conta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  -- Anonimiza mensalidades: remove vínculo com o usuário
  UPDATE mensalidades
  SET user_id = NULL
  WHERE user_id = uid;

  -- Remove o usuário do auth (cascade deleta identidades e sessions)
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- ============================================================
-- Ajusta RLS: usuário só vê/edita suas próprias mensalidades
-- ============================================================
DROP POLICY IF EXISTS "Usuarios autenticados podem inserir mensalidades" ON mensalidades;

CREATE POLICY "Usuarios veem suas proprias mensalidades" ON mensalidades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios inserem suas proprias mensalidades" ON mensalidades
  FOR INSERT WITH CHECK (auth.uid() = user_id);
