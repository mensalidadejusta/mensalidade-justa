-- ============================================================
-- NORMALIZACAO: Estado e Cidade (3NF)
-- ============================================================

-- 1. Tabelas de referencia
CREATE TABLE IF NOT EXISTS tb_estados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tb_estados_uf ON tb_estados (uf);

INSERT INTO tb_estados (uf, nome)
SELECT DISTINCT uf, uf FROM escolas WHERE uf IS NOT NULL
ON CONFLICT (uf) DO NOTHING;

CREATE TABLE IF NOT EXISTS tb_cidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estado_id UUID NOT NULL REFERENCES tb_estados(id) ON DELETE RESTRICT,
  nome VARCHAR(200) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tb_cidades_estado_id_nome ON tb_cidades (estado_id, nome);

INSERT INTO tb_cidades (estado_id, nome)
SELECT DISTINCT e.id, esc.municipio
FROM escolas esc
JOIN tb_estados e ON e.uf = esc.uf
WHERE esc.municipio IS NOT NULL
ON CONFLICT (estado_id, nome) DO NOTHING;

-- 2. Adicionar FK cidade_id em escolas
ALTER TABLE escolas ADD COLUMN cidade_id UUID REFERENCES tb_cidades(id) ON DELETE RESTRICT;

UPDATE escolas esc SET cidade_id = c.id
FROM tb_cidades c
JOIN tb_estados e ON e.id = c.estado_id
WHERE e.uf = esc.uf AND c.nome = esc.municipio;

-- 3. Renomear tabela original e criar VIEW de compatibilidade
ALTER TABLE escolas RENAME TO escolas_raw;

ALTER TABLE escolas_raw DROP COLUMN uf, DROP COLUMN municipio;

CREATE VIEW escolas WITH (security_invoker = true) AS
SELECT
  r.id, r.codigo_inep, r.nome,
  e.uf,
  c.nome AS municipio,
  r.bairro, r.endereco, r.telefone,
  r.dependencia_administrativa, r.categoria_administrativa,
  r.categoria_escola_privada, r.localizacao,
  r.localidade_diferenciada, r.porte_escola,
  r.etapas_modalidades, r.outras_ofertas,
  r.conveniada_poder_publico, r.regulamentacao_conselho,
  r.latitude, r.longitude, r.restricao_atendimento,
  r.geom, r.created_at, r.updated_at
FROM escolas_raw r
JOIN tb_cidades c ON c.id = r.cidade_id
JOIN tb_estados e ON e.id = c.estado_id;

-- 4. Indices
CREATE INDEX IF NOT EXISTS idx_escolas_raw_cidade_id ON escolas_raw (cidade_id);

-- 5. RLS
ALTER TABLE tb_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_public" ON tb_estados FOR SELECT USING (true);
CREATE POLICY "select_public" ON tb_cidades FOR SELECT USING (true);

GRANT SELECT ON tb_estados TO anon, authenticated;
GRANT SELECT ON tb_cidades TO anon, authenticated;
GRANT SELECT ON escolas_raw TO anon, authenticated;
GRANT SELECT ON escolas TO anon, authenticated;

-- 6. RPCs atualizadas
DROP FUNCTION IF EXISTS get_ufs();
DROP FUNCTION IF EXISTS get_cidades(TEXT);
DROP FUNCTION IF EXISTS get_top_cidades(TEXT, INTEGER);
DROP FUNCTION IF EXISTS buscar_escolas_com_precos_detalhado(TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION get_ufs()
RETURNS TABLE(uf VARCHAR(2))
LANGUAGE SQL STABLE
AS $$
  SELECT e.uf FROM tb_estados e ORDER BY e.uf;
$$;

CREATE FUNCTION get_cidades(p_uf VARCHAR)
RETURNS TABLE(municipio VARCHAR)
LANGUAGE SQL STABLE
AS $$
  SELECT c.nome FROM tb_cidades c
  JOIN tb_estados e ON e.id = c.estado_id
  WHERE e.uf = p_uf
  ORDER BY c.nome;
$$;

CREATE FUNCTION get_top_cidades(p_uf VARCHAR, p_limit INTEGER DEFAULT 25)
RETURNS TABLE(municipio VARCHAR, total BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT c.nome AS municipio, COUNT(*)::bigint AS total
  FROM escolas_raw r
  JOIN tb_cidades c ON c.id = r.cidade_id
  JOIN tb_estados e ON e.id = c.estado_id
  WHERE e.uf = p_uf
  GROUP BY c.id, c.nome
  ORDER BY total DESC, c.nome
  LIMIT p_limit;
$$;

CREATE FUNCTION buscar_escolas_com_precos_detalhado(
  p_uf VARCHAR,
  p_municipio VARCHAR,
  p_serie_slug VARCHAR DEFAULT NULL,
  p_termo VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  id INTEGER, nome VARCHAR, uf VARCHAR(2), municipio VARCHAR,
  bairro VARCHAR, dependencia_administrativa VARCHAR,
  categoria_administrativa VARCHAR,
  latitude NUMERIC, longitude NUMERIC, codigo_inep VARCHAR,
  series_precos JSON
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    r.id, r.nome, e.uf, c.nome AS municipio, r.bairro,
    r.dependencia_administrativa, r.categoria_administrativa,
    r.latitude, r.longitude, r.codigo_inep,
    COALESCE(
      (SELECT json_agg(sub ORDER BY sub.serie_slug) FROM (
        SELECT
          ms.serie_slug, ms.serie_nome,
          ROUND(AVG(ms.valor_mensalidade)::numeric, 2) AS valor_mensalidade,
          ROUND(AVG(ms.valor_matricula)::numeric, 2) AS valor_matricula,
          ROUND(AVG(ms.valor_material)::numeric, 2) AS valor_material,
          COUNT(*)::bigint AS qtd
        FROM mensalidades_series ms
        WHERE ms.escola_id = r.id
          AND (p_serie_slug IS NULL OR p_serie_slug = '' OR ms.serie_slug = p_serie_slug)
        GROUP BY ms.serie_slug, ms.serie_nome
      ) sub),
      '[]'::json
    ) AS series_precos
  FROM escolas_raw r
  JOIN tb_cidades c ON c.id = r.cidade_id
  JOIN tb_estados e ON e.id = c.estado_id
  WHERE e.uf = p_uf AND c.nome = p_municipio
    AND (p_termo IS NULL OR p_termo = '' OR r.nome ILIKE '%' || p_termo || '%')
    AND ((p_serie_slug IS NULL OR p_serie_slug = '')
      OR (p_serie_slug IN ('baba','maternal-1','maternal-2','maternal-3','pre-1','pre-2','pre-3') AND r.etapas_modalidades ILIKE '%Educa'||chr(231)||'ao Infantil%')
      OR (p_serie_slug IN ('1-ano-fundamental','2-ano-fundamental','3-ano-fundamental','4-ano-fundamental','5-ano-fundamental') AND r.etapas_modalidades ILIKE '%Ensino Fundamental%')
      OR (p_serie_slug IN ('6-ano-fundamental','7-ano-fundamental','8-ano-fundamental','9-ano-fundamental') AND r.etapas_modalidades ILIKE '%Ensino Fundamental%')
      OR (p_serie_slug IN ('1-ano-ensino-medio','2-ano-ensino-medio','3-ano-ensino-medio') AND r.etapas_modalidades ILIKE '%Ensino M'||chr(233)||'dio%'))
  ORDER BY (
    SELECT COUNT(*) FROM mensalidades_series ms WHERE ms.escola_id = r.id
      AND (p_serie_slug IS NULL OR p_serie_slug = '' OR ms.serie_slug = p_serie_slug)
  ) DESC, r.nome;
$$;
