-- ============================================================
-- Filtrar escolas com restricao_atendimento = 'ESCOLA PARALISADA'
-- ============================================================

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS escolas_perto_de_mim(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS get_top_cidades(VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS buscar_escolas_com_precos_detalhado(VARCHAR, VARCHAR, VARCHAR, VARCHAR);

-- 1. escolas_perto_de_mim (usa a VIEW escolas)
CREATE FUNCTION escolas_perto_de_mim(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_raio_km DOUBLE PRECISION DEFAULT 5
)
RETURNS TABLE(
  id INTEGER,
  nome TEXT,
  uf TEXT,
  municipio TEXT,
  bairro TEXT,
  dependencia_administrativa TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distancia_km DOUBLE PRECISION
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.nome,
    e.uf,
    e.municipio,
    e.bairro,
    e.dependencia_administrativa,
    e.latitude,
    e.longitude,
    ROUND(
      (ST_Distance(
        e.geom::geography,
        ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
      ) / 1000)::numeric, 2
    )::double precision AS distancia_km
  FROM escolas e
  WHERE e.geom IS NOT NULL
    AND (e.restricao_atendimento IS NULL OR e.restricao_atendimento != 'ESCOLA PARALISADA')
    AND ST_DWithin(
      e.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
      p_raio_km * 1000
    )
  ORDER BY distancia_km
  LIMIT 30;
$$;

GRANT EXECUTE ON FUNCTION escolas_perto_de_mim TO public;

-- 2. get_top_cidades (usa escolas_raw)
CREATE FUNCTION get_top_cidades(p_uf VARCHAR, p_limit INTEGER DEFAULT 25)
RETURNS TABLE(municipio VARCHAR, total BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT c.nome AS municipio, COUNT(*)::bigint AS total
  FROM escolas_raw r
  JOIN tb_cidades c ON c.id = r.cidade_id
  JOIN tb_estados e ON e.id = c.estado_id
  WHERE e.uf = p_uf
    AND (r.restricao_atendimento IS NULL OR r.restricao_atendimento != 'ESCOLA PARALISADA')
  GROUP BY c.id, c.nome
  ORDER BY total DESC, c.nome
  LIMIT p_limit;
$$;

-- 3. buscar_escolas_com_precos_detalhado (usa escolas_raw)
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
    AND (r.restricao_atendimento IS NULL OR r.restricao_atendimento != 'ESCOLA PARALISADA')
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
