-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- TABLE: escolas
-- ============================================================
CREATE TABLE IF NOT EXISTS escolas (
  id SERIAL PRIMARY KEY,
  codigo_inep VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(500) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  municipio VARCHAR(200) NOT NULL,
  bairro VARCHAR(300),
  endereco TEXT,
  telefone VARCHAR(100),
  localizacao VARCHAR(50),
  localidade_diferenciada VARCHAR(200),
  dependencia_administrativa VARCHAR(50) NOT NULL,
  categoria_administrativa VARCHAR(50),
  categoria_escola_privada VARCHAR(100),
  conveniada_poder_publico VARCHAR(10),
  regulamentacao_conselho VARCHAR(50),
  porte_escola VARCHAR(200),
  etapas_modalidades TEXT,
  outras_ofertas TEXT,
  restricao_atendimento VARCHAR(300),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for escolas
CREATE INDEX idx_escolas_nome ON escolas USING GIN (nome gin_trgm_ops);
CREATE INDEX idx_escolas_uf ON escolas (uf);
CREATE INDEX idx_escolas_municipio ON escolas (municipio);
CREATE INDEX idx_escolas_dependencia ON escolas (dependencia_administrativa);
CREATE INDEX idx_escolas_geom ON escolas USING GIST (geom);

-- ============================================================
-- TABLE: mensalidades
-- ============================================================
CREATE TABLE IF NOT EXISTS mensalidades (
  id SERIAL PRIMARY KEY,
  escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  valor_mensalidade NUMERIC(10, 2),
  valor_matricula NUMERIC(10, 2),
  valor_material_didatico NUMERIC(10, 2),
  valor_alimentacao NUMERIC(10, 2),
  etapa_ensino VARCHAR(200),
  turno VARCHAR(100),
  ano_referencia INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mensalidades_escola_id ON mensalidades (escola_id);
CREATE INDEX idx_mensalidades_user_id ON mensalidades (user_id);
CREATE INDEX idx_mensalidades_ano ON mensalidades (ano_referencia);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensalidades ENABLE ROW LEVEL SECURITY;

-- Public read access for escolas
CREATE POLICY "Escolas visiveis para todos" ON escolas
  FOR SELECT USING (true);

-- Public read access for mensalidades
CREATE POLICY "Mensalidades visiveis para todos" ON mensalidades
  FOR SELECT USING (true);

-- Users can only see and insert their own mensalidades
CREATE POLICY "Usuarios veem suas proprias mensalidades" ON mensalidades
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Usuarios inserem suas proprias mensalidades" ON mensalidades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_escolas_updated_at
  BEFORE UPDATE ON escolas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_mensalidades_updated_at
  BEFORE UPDATE ON mensalidades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
