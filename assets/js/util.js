// Funções utilitárias compartilhadas. As funções norm, slug, inicial e escrever
// vêm do site original e mantêm o mesmo comportamento (busca sem acentos e realce).

export function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
export function inicial(s) { const c = norm(s).charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; }

// Escreve o texto em el, destacando com <mark> os trechos que casam com q (ignorando acentos)
export function escrever(el, texto, q) {
  texto = String(texto || '');
  if (!q) { el.append(texto); return el; }
  let n = '', mapa = [];
  for (let i = 0; i < texto.length; i++) {
    const c = norm(texto[i]);
    for (let k = 0; k < c.length; k++) { n += c[k]; mapa.push(i); }
  }
  let pos = 0, ini;
  while ((ini = n.indexOf(q, pos)) !== -1) {
    const a = mapa[ini], b = mapa[ini + q.length - 1] + 1;
    const ant = mapa[pos] ?? texto.length;
    el.append(texto.slice(ant, a));
    const m = document.createElement('mark'); m.textContent = texto.slice(a, b); el.append(m);
    pos = ini + q.length;
  }
  el.append(texto.slice(mapa[pos] ?? texto.length));
  return el;
}

// Criador de elementos: h('div', {class:'x', onclick: fn}, filho1, 'texto', ...)
export function h(tag, attrs, ...filhos) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat(Infinity)) if (f != null && f !== false) el.append(f instanceof Node ? f : String(f));
  return el;
}

const NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs, ...filhos) {
  const el = document.createElementNS(NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const f of filhos.flat()) if (f != null) el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return el;
}

export function icone(nome, cls = 'ic') {
  const el = s('svg', { class: cls, 'aria-hidden': 'true' });
  el.append(s('use', { href: '#i-' + nome }));
  return el;
}

// Formatação em português do Brasil
const fBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fBRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const brl = (v, inteiro) => (Number.isFinite(v) ? (inteiro || Math.abs(v) >= 100000 ? fBRL0 : fBRL).format(v) : '—');
export const num = (v, casas = 2) => (Number.isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) : '—');
export const pct = (v, casas = 2) => (Number.isFinite(v) ? num(v, casas) + '%' : '—');
export const compacto = (v) => {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return 'R$ ' + num(v / 1e9, 1) + ' bi';
  if (a >= 1e6) return 'R$ ' + num(v / 1e6, 1) + ' mi';
  if (a >= 1e4) return 'R$ ' + num(v / 1e3, 0) + ' mil';
  return 'R$ ' + num(v, 0);
};

// Armazenamento local: pode não existir (modo privado, iframes); nunca quebra o site
export const guardar = {
  ler(chave, padrao) { try { const v = localStorage.getItem('ge-' + chave); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; } },
  gravar(chave, valor) { try { localStorage.setItem('ge-' + chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ } },
};

export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg; t.classList.add('visivel');
  clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('visivel'), 2200);
}

// Texto com marcadores: "[exemplo] ...", "[fato] ...", "[interpretação] ..." viram blocos rotulados
const MARCADORES = {
  exemplo: 'Exemplo hipotético', fato: 'Fato', interpretacao: 'Interpretação', 'interpretação': 'Interpretação', caso: 'Caso real',
};
export function paragrafos(texto, q) {
  const lista = Array.isArray(texto) ? texto : String(texto || '').split(/\n{2,}/);
  const frag = document.createDocumentFragment();
  for (const t of lista) {
    if (!t) continue;
    const m = /^\[(exemplo|fato|interpreta[cç][aã]o|caso)\]\s*/i.exec(t);
    if (m) {
      let tipo = norm(m[1]); if (tipo === 'caso') tipo = 'fato';
      const rot = MARCADORES[norm(m[1])] || MARCADORES[tipo];
      frag.append(h('div', { class: 'bloco-marcado ' + tipo },
        h('span', { class: 'marcador' }, rot), escrever(h('p'), t.slice(m[0].length), q)));
    } else frag.append(escrever(h('p'), t, q));
  }
  return frag;
}

export function debounce(fn, ms = 120) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// Troca o endereço sem criar entrada no histórico e sem perder o estado guardado nela
// (o estado guarda a posição da entrada, usada para restaurar a rolagem ao voltar).
export function trocarUrl(url) { try { history.replaceState(history.state, '', url); } catch (e) { /* endereço não pôde ser trocado */ } }

// "1 nível", "3 níveis"
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Gerador pseudoaleatório com semente (simulações reproduzíveis)
export function aleatorio(semente) {
  let a = semente >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function normal(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

export function revelarAoRolar(raiz, animar = true) {
  const itens = raiz.querySelectorAll('.revelar');
  if (!animar || !('IntersectionObserver' in window)) { itens.forEach(i => i.classList.add('visto')); return; }
  const io = new IntersectionObserver((ents) => ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -5% 0px' });
  itens.forEach(i => io.observe(i));
}
