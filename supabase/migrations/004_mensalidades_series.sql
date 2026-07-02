-- ============================================================
-- TABLE: mensalidades_series
-- ============================================================
CREATE TABLE IF NOT EXISTS mensalidades_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  serie_slug VARCHAR(50) NOT NULL,
  serie_nome VARCHAR(200) NOT NULL,
  valor_mensalidade NUMERIC(10, 2),
  valor_matricula NUMERIC(10, 2),
  valor_material NUMERIC(10, 2),
  ano_vigencia INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique: one price per school/series/year
ALTER TABLE mensalidades_series
  ADD CONSTRAINT uq_mensalidades_serie UNIQUE (escola_id, serie_slug, ano_vigencia);

CREATE INDEX IF NOT EXISTS idx_mensalidades_series_escola ON mensalidades_series (escola_id, serie_slug);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE mensalidades_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura publica" ON mensalidades_series FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados inserem" ON mensalidades_series
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON mensalidades_series TO anon;
GRANT SELECT, INSERT ON mensalidades_series TO authenticated;
