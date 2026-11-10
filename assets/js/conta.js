import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from './supabase-config.js';

export const conta = {
  modo: SUPABASE_URL || SUPABASE_PUBLIC_KEY ? 'carregando' : 'desativado',
  usuario: null,
  equipe: false,
  estudados: new Set(),
};

let cliente, iniciar, versao = 0, identidade = null;
const marcacoesPendentes = new Set();

function publicar(modo, usuario = null, estado = null) {
  Object.assign(conta, {
    modo, usuario, equipe: estado?.equipe === true,
    estudados: new Set(estado?.estudados || []),
  });
  document.dispatchEvent(new Event('conta-atualizada'));
}

async function rpc(nome, dados) {
  const { data, error } = await cliente.rpc(nome, dados);
  if (error) throw error;
  return data;
}

async function aplicarSessao(sessao, forcar = false) {
  const usuario = sessao?.user ?? null;
  const id = usuario?.id ?? null;
  if (!forcar && id === identidade) return;
  identidade = id;
  const atual = ++versao;
  if (!usuario) {
    publicar('visitante');
    return;
  }
  publicar('carregando', usuario);
  try {
    const estado = await rpc('ge_estado');
    if (versao === atual) publicar('online', usuario, estado);
  } catch {
    if (versao === atual) publicar('erro', usuario);
  }
}

export async function iniciarConta() {
  if (conta.modo === 'desativado' || iniciar) return;
  iniciar = (async () => {
    if (conta.modo !== 'carregando') publicar('carregando', conta.usuario);
    try {
      if (!cliente) {
        if (!SUPABASE_PUBLIC_KEY.startsWith('sb_publishable_')) throw new Error('Chave pública inválida');
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm');
        cliente = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, { auth: { detectSessionInUrl: false } });
        cliente.auth.onAuthStateChange((evento, sessao) => {
          if (evento !== 'INITIAL_SESSION') setTimeout(() => aplicarSessao(sessao), 0);
        });
      }
      const { data, error } = await cliente.auth.getSession();
      if (error) throw error;
      await aplicarSessao(data.session, true);
    } catch {
      publicar('erro', conta.usuario);
    }
  })();
  try { await iniciar; } finally { iniciar = null; }
}

export async function enviarCodigo(email) {
  const { error } = await cliente.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function validarCodigo(email, token) {
  const { data, error } = await cliente.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  await aplicarSessao(data.session);
}

export async function sairDaConta() {
  const { error } = await cliente.auth.signOut({ scope: 'local' });
  if (error) throw error;
  await aplicarSessao(null);
}

export async function salvarConceito(id, estudado) {
  if (conta.modo !== 'online') throw new Error('Conta indisponível');
  const atual = versao;
  const operacao = `${atual}/${id}`;
  if (marcacoesPendentes.has(operacao)) throw new Error('Marcação pendente');
  marcacoesPendentes.add(operacao);
  try {
    await rpc('ge_marcar_conceito', { p_conceito: id, p_estudado: estudado });
    if (versao === atual) {
      if (estudado) conta.estudados.add(id);
      else conta.estudados.delete(id);
    }
  } finally {
    marcacoesPendentes.delete(operacao);
  }
}

export const abrirTrilha = (id) => rpc('ge_abrir_trilha', { p_trilha: id });
export const consultarEstatisticas = () => rpc('ge_estatisticas');
