import 'dotenv/config';

const mgmtToken = process.env.SUPABASE_MGMT_TOKEN;
const projectRef = 'ijfwdtemkkoiombxtyip';

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${mgmtToken}`
  },
  body: JSON.stringify({
    query: 'CREATE INDEX IF NOT EXISTS idx_escolas_uf_municipio ON public.escolas (uf, municipio);'
  })
});

const text = await response.text();
console.log('Status:', response.status);
console.log('Response:', text);
