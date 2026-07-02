import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BATCH_SIZE = 200;
const CSV_PATH = new URL('../Análise - Tabela da lista das escolas - Detalhado.csv', import.meta.url);

function extractBairro(endereco) {
  if (!endereco) return null;
  const match = endereco.match(/\.\s*([^.\d]+?)\.\s*\d{5}/);
  return match ? match[1].trim() : null;
}

function parseRow(row) {
  const latStr = row[17]?.trim();
  const lngStr = row[18]?.trim();
  const lat = latStr ? parseFloat(latStr) : null;
  const lng = lngStr ? parseFloat(lngStr) : null;

  const obj = {
    codigo_inep: row[2]?.trim(),
    nome: row[1]?.trim(),
    uf: row[3]?.trim(),
    municipio: row[4]?.trim(),
    bairro: extractBairro(row[8]),
    endereco: row[8]?.trim() || null,
    telefone: row[9]?.trim() || null,
    localizacao: row[5]?.trim() || null,
    localidade_diferenciada: row[6]?.trim() || null,
    dependencia_administrativa: row[10]?.trim() || null,
    categoria_administrativa: row[7]?.trim() || null,
    categoria_escola_privada: row[11]?.trim() || null,
    conveniada_poder_publico: row[12]?.trim() || null,
    regulamentacao_conselho: row[13]?.trim() || null,
    porte_escola: row[14]?.trim() || null,
    etapas_modalidades: row[15]?.trim() || null,
    outras_ofertas: row[16]?.trim() || null,
    restricao_atendimento: row[0]?.trim() || null,
    latitude: lat,
    longitude: lng,
  };

  if (lat && lng) {
    obj.geom = { type: 'Point', coordinates: [lng, lat] };
  }

  return obj;
}

async function insertBatch(rows) {
  const { error } = await supabase
    .from('escolas')
    .upsert(rows, { onConflict: 'codigo_inep', ignoreDuplicates: false })
    .select('id', { count: 'estimated', head: true });

  if (error) throw error;
}

async function importCSV() {
  console.log('Iniciando importação do CSV via API Supabase...\n');
  console.log(`Arquivo: ${CSV_PATH}\n`);

  let total = 0;
  let inserted = 0;
  let errors = 0;
  let batch = [];

  const startTime = Date.now();

  const parser = createReadStream(CSV_PATH, { encoding: 'utf-8' }).pipe(
    parse({ delimiter: ',', from_line: 2, relax_column_count: true })
  );

  for await (const row of parser) {
    total++;

    if (row.length < 19) {
      errors++;
      continue;
    }

    try {
      const escola = parseRow(row);
      if (!escola.codigo_inep || !escola.nome) {
        errors++;
        continue;
      }
      batch.push(escola);

      if (batch.length >= BATCH_SIZE) {
        await insertBatch(batch);
        inserted += batch.length;
        if (inserted % 10000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
          console.log(`  ${inserted} registros importados (${elapsed}s)`);
        }
        batch = [];
      }
    } catch {
      errors++;
    }
  }

  if (batch.length > 0) {
    await insertBatch(batch);
    inserted += batch.length;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\nImportação concluída!`);
  console.log(`  Total de linhas lidas: ${total}`);
  console.log(`  Registros inseridos: ${inserted}`);
  console.log(`  Erros: ${errors}`);
  console.log(`  Tempo: ${elapsed}s`);
}

importCSV().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
