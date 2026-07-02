-- ============================================================
-- TABLE: profiles (vinculada a auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  uf VARCHAR(2),
  cep VARCHAR(9),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_geom ON profiles USING GIST (geom);

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS: profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- User can only see/update their own profile
CREATE POLICY "Usuarios veem seu proprio profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios inserem seu proprio profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuarios atualizam seu proprio profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow the service_role / trigger to insert without auth
CREATE POLICY "Trigger insere profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- RPC: escolas_perto_de_mim
-- ============================================================
CREATE OR REPLACE FUNCTION escolas_perto_de_mim(
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
    AND ST_DWithin(
      e.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
      p_raio_km * 1000
    )
  ORDER BY distancia_km
  LIMIT 30;
$$;

-- Grant execute to public (anon + authenticated)
GRANT EXECUTE ON FUNCTION escolas_perto_de_mim TO public;
GRANT ALL ON profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
