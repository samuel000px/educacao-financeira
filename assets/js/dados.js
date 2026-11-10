// Carrega os dados do site. O glossário continua em data/glossario.json
// (o mesmo arquivo lido pelo notebook da Entrega 5).
import { slug, norm, guardar } from './util.js';

export const D = { verbetes: [], porSlug: new Map(), trilhas: [], quiz: [], indicadores: null, temas: [] };

// Ordem de apresentação das categorias (temas). Temas novos entram no fim, em ordem alfabética.
export const ORDEM_TEMAS = ['Planejamento financeiro', 'Crédito e dívidas', 'Inflação', 'Juros e política monetária',
  'Macroeconomia', 'Microeconomia', 'Sistema financeiro', 'Investimentos'];
export const NIVEIS = ['Básico', 'Intermediário', 'Avançado'];
export const classeNivel = (n) => ({ 'Básico': 'basico', 'Intermediário': 'intermediario', 'Avançado': 'avancado' }[n] || '');

async function json(url, padrao) {
  try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return await r.json(); }
  catch (e) { if (padrao !== undefined) return padrao; throw e; }
}

export async function carregar() {
  const [g, t, q, i] = await Promise.all([
    json('data/glossario.json'), json('data/trilhas.json', []), json('data/quiz.json', []), json('data/indicadores.json', null),
  ]);
  D.verbetes = g.filter(v => v && v.termo).map(v => ({ ...v, slug: slug(v.termo) }));
  D.porSlug = new Map(D.verbetes.map(v => [v.slug, v]));
  // sinônimos também levam ao verbete
  D.apelidos = new Map();
  for (const v of D.verbetes) for (const a of v.sinonimos || []) D.apelidos.set(slug(a), v.slug);
  D.trilhas = t; D.quiz = q; D.indicadores = i;
  const temas = [...new Set(D.verbetes.map(v => v.tema).filter(Boolean))];
  D.temas = temas.sort((a, b) => {
    const ia = ORDEM_TEMAS.indexOf(a), ib = ORDEM_TEMAS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'pt-BR');
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  D.textoBusca = new Map(D.verbetes.map(v => [v.slug, norm([v.termo, ...(v.sinonimos || []), v.definicao, v.exemplo, v.tema, v.subtema].join(' '))]));
  return D;
}

export function achar(id) { return D.porSlug.get(id) || D.porSlug.get(D.apelidos?.get(id)); }
export function existe(nome) { return !!achar(slug(nome)); }

// Busca com ranqueamento: termo exato > começa com > contém no termo/sinônimo > contém no texto
export function buscar(consulta, limite = 12) {
  const q = norm(consulta.trim());
  if (!q) return [];
  const res = [];
  for (const v of D.verbetes) {
    const t = norm(v.termo), sin = (v.sinonimos || []).map(norm);
    let p = 0;
    if (t === q || sin.includes(q)) p = 100;
    else if (t.startsWith(q) || sin.some(x => x.startsWith(q))) p = 80;
    else if (t.includes(q) || sin.some(x => x.includes(q))) p = 60;
    else if (D.textoBusca.get(v.slug).includes(q)) p = 30;
    else {
      // todas as palavras presentes em qualquer ordem
      const pal = q.split(/\s+/).filter(Boolean);
      if (pal.length > 1 && pal.every(w => D.textoBusca.get(v.slug).includes(w))) p = 20;
    }
    if (p) res.push([p, v]);
  }
  return res.sort((a, b) => b[0] - a[0] || a[1].termo.localeCompare(b[1].termo, 'pt-BR')).slice(0, limite).map(x => x[1]);
}

// ---- Progresso do estudante (fica só no navegador dele)
export const progresso = {
  estudados() { return new Set(guardar.ler('estudados', [])); },
  estudado(id) { return this.estudados().has(id); },
  alternar(id) {
    const s = this.estudados(); s.has(id) ? s.delete(id) : s.add(id);
    guardar.gravar('estudados', [...s]); return s.has(id);
  },
  marcar(id) { const s = this.estudados(); if (!s.has(id)) { s.add(id); guardar.gravar('estudados', [...s]); } },
  trilha(t) {
    const s = this.estudados();
    const itens = t.conceitos.map(slug).filter(x => achar(x));
    const feitos = itens.filter(x => s.has(achar(x).slug)).length;
    return { feitos, total: itens.length, pct: itens.length ? Math.round(100 * feitos / itens.length) : 0 };
  },
  quiz() { return guardar.ler('quiz', {}); },
  gravarQuiz(chave, acertos, total) {
    const q = this.quiz(); const ant = q[chave];
    if (!ant || acertos / total >= ant.acertos / ant.total) q[chave] = { acertos, total, data: new Date().toISOString().slice(0, 10) };
    guardar.gravar('quiz', q);
  },
};

export function trilhasDe(id) { return D.trilhas.filter(t => t.conceitos.some(c => slug(c) === id)); }
