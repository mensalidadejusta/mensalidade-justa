-- Index composto para acelerar get_top_cidades (GROUP BY municipio WHERE uf)
CREATE INDEX IF NOT EXISTS idx_escolas_uf_municipio ON public.escolas (uf, municipio);
