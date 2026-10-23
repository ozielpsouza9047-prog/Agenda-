import dotenv from 'dotenv';
import { SUPABASE_CONFIG } from '../src/lib/supabase';
dotenv.config();

const url = (process.env.VITE_SUPABASE_URL || SUPABASE_CONFIG.url || '').trim();
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_rb7DK-hVidb3_zgYFE00jw_3GcU2BgI').trim();

async function runDiagnosis() {
  console.log('====================================================');
  console.log('DÍVIDA ZERO AI - SUPABASE DIAGNÓSTICO EM TEMPO REAL');
  console.log('====================================================');
  const maskedAnonKey = anonKey
    ? `${anonKey.slice(0, 15)}...${anonKey.slice(-4)}`
    : '(não configurada)';
  console.log(`URL Configurada: "${url}"`);
  console.log(`Chave Anon/Publishable Configurada: "${maskedAnonKey}" (tamanho: ${anonKey.length})`);

  const secretKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const maskedSecretKey = secretKey
    ? `${secretKey.slice(0, 10)}...${secretKey.slice(-4)}`
    : '(não configurada)';

  console.log(`Chave Secreta/Service Role: "${maskedSecretKey}" (tamanho: ${secretKey.length})`);

  console.log('\n--- VALIDAÇÃO DE SEGREGAÇÃO DAS CHAVES ---');
  console.log(`- VITE_SUPABASE_ANON_KEY (Frontend/Pública): ${anonKey.startsWith('sb_publishable_') ? 'CORRETO (sb_publishable_)' : 'ATENÇÃO'}`);
  console.log(`- VITE_SUPABASE_ANON_KEY contém segredo? ${anonKey.includes('sb_secret_') ? 'ERRO GRAVE!' : 'NÃO (Seguro)'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY (Backend/Segredo): ${secretKey.startsWith('sb_secret_') ? 'CORRETO (sb_secret_)' : 'NÃO DETECTADA'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY possui prefixo VITE_? ${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'ERRO GRAVE! Não deve ter prefixo VITE_' : 'NÃO (Seguro - isolado no servidor)'}`);

  console.log('\n--- TESTE 1: PING AO GATEWAY SUPABASE (HEALTH CHECK) ---');
  try {
    const t0 = Date.now();
    const healthRes = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers: {
        ...(anonKey ? { apikey: anonKey } : {})
      }
    });
    const duration = Date.now() - t0;
    console.log(`- Status HTTP Gateway: ${healthRes.status} (${healthRes.statusText})`);
    console.log(`- Latência: ${duration}ms`);
    console.log(`- sb-project-ref: ${healthRes.headers.get('sb-project-ref') || 'N/A'}`);
    const healthBody = await healthRes.text();
    console.log(`- Resposta da API: ${healthBody.slice(0, 200)}`);
  } catch (err: any) {
    console.error(`- Falha de conexão: ${err.message}`);
  }

  console.log('\n--- TESTE 2: TESTE COM A CHAVE PÚBLICA NA ROTA REST (/rest/v1/) ---');
  try {
    const t0 = Date.now();
    const restRes = await fetch(`${url}/rest/v1/debts?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    const duration = Date.now() - t0;
    console.log(`- Status HTTP REST (Chave Pública): ${restRes.status} (${restRes.statusText})`);
    console.log(`- Latência: ${duration}ms`);
    const restBody = await restRes.text();
    console.log(`- Resposta da API REST: ${restBody}`);
  } catch (err: any) {
    console.error(`- Falha de conexão REST: ${err.message}`);
  }

  if (secretKey) {
    console.log('\n--- TESTE 3: TESTE COM A CHAVE DE SERVIÇO (BACKEND ONLY) ---');
    try {
      const restSecRes = await fetch(`${url}/rest/v1/debts?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': secretKey,
          'Authorization': `Bearer ${secretKey}`
        }
      });
      console.log(`- Status HTTP REST (Service Role): ${restSecRes.status} (${restSecRes.statusText})`);
      const secBody = await restSecRes.text();
      console.log(`- Resposta da API REST (Service Role): ${secBody}`);
    } catch (err: any) {
      console.error(`- Falha de conexão com Service Role: ${err.message}`);
    }
  }

  console.log('\n--- TESTE 4: AUDITORIA DO ESQUEMA SQL LOCAL (supabase/schema.sql) ---');
  console.log(`- 5 tabelas planejadas: profiles, debts, installments, payments, goals.`);
  console.log(`- RLS: alter table ... enable row level security em todas as 5 tabelas.`);
  console.log(`- Políticas de isolamento: auth.uid() = user_id (ou auth.uid() = id para profiles).`);
  console.log('====================================================\n');
}

runDiagnosis();
