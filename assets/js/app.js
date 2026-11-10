// Ponto de entrada: carrega os dados, monta o topo, a busca global e o roteador.
import { carregar, D, buscar, achar } from './dados.js';
import { h, slug, escrever, norm, debounce, trocarUrl } from './util.js';
import { paginaGlossario } from './glossario.js';
import { paginaConceito } from './conceito.js';
import { paginaQuiz } from './quiz.js';
import { paginaInicio, paginaEnciclopedia, paginaSimuladores, paginaTrilhas, paginaSobre } from './paginas.js';

const main = document.getElementById('conteudo');
const raiz = document.documentElement;
const TITULO = 'Glossário da Economia – CORECON-PB';
const TITULOS = { enciclopedia: 'Enciclopédia', simuladores: 'Simuladores', trilhas: 'Trilhas', glossario: 'Glossário A–Z', quiz: 'Quiz', sobre: 'Metodologia e fontes' };

// ---------- Rotas ----------
// #/                      início
// #/enciclopedia?tema=…   enciclopédia por categoria
// #/conceito/<termo>      página do conceito (7 níveis)
// #/glossario/<termo>     glossário A–Z, rolado até o termo (filtros em ?q=…&tema=…&nivel=…)
// #/simuladores[/<id>]    simuladores
// #/trilhas[/<id>]        trilhas de aprendizagem
// #/quiz                  quiz
// #/sobre                 metodologia e fontes
// Links antigos continuam valendo: #juros → conceito; ?q=…&tema=… (antes do #) → glossário.
function rota() {
  let hash = location.hash || '';
  try { hash = decodeURIComponent(hash); } catch (e) { /* endereço com % solto: usa como veio */ }
  if (hash && !hash.startsWith('#/')) {
    const id = hash.slice(1);
    if (id.startsWith('letra-')) { trocarUrl(location.pathname + location.search + '#/glossario'); return rota(); }
    if (achar(slug(id))) { trocarUrl(location.pathname + location.search + '#/conceito/' + achar(slug(id)).slug); return rota(); }
    hash = '';
  }
  // formato antigo: filtros do glossário antes do "#". Passa para o formato atual (#/glossario?q=…)
  if (location.search.length > 1) {
    const antigos = new URLSearchParams(location.search), novos = new URLSearchParams();
    for (const k of ['q', 'tema', 'nivel']) if (antigos.get(k)) novos.set(k, antigos.get(k));
    const eGlossario = !hash || hash === '#/' || hash.startsWith('#/glossario');
    if (eGlossario && novos.toString()) {
      const base = hash.startsWith('#/glossario') ? hash.split('?')[0] : '#/glossario';
      trocarUrl(location.pathname + base + '?' + novos);
      return rota();
    }
  }
  const [caminho, ...resto] = hash.slice(2).split('?');
  const partes = caminho.split('/').filter(Boolean);
  return { secao: partes[0] || 'inicio', id: partes[1] || '', params: new URLSearchParams(resto.join('?')) };
}

// Posição da rolagem de cada entrada do histórico, para o botão "voltar" devolver a pessoa
// ao ponto em que estava (útil em listas longas como a enciclopédia e o glossário).
try { history.scrollRestoration = 'manual'; } catch (e) { /* navegador antigo */ }
const posicoes = new Map();
let entradaAtual = null, ultimaEntrada = 0;

function navegar(ev) {
  if (entradaAtual != null) posicoes.set(entradaAtual, scrollY);
  const r = rota();
  let est = history.state, voltando = false;
  if (est && typeof est.i === 'number') voltando = !!ev && posicoes.has(est.i);
  else { est = { i: ultimaEntrada + 1 }; try { history.replaceState(est, '', location.href); } catch (e) { /* sem histórico */ } }
  entradaAtual = est.i; ultimaEntrada = Math.max(ultimaEntrada, est.i);

  document.title = TITULOS[r.secao] ? `${TITULOS[r.secao]} – Glossário da Economia` : TITULO;
  fecharMenu();
  document.querySelectorAll('.menu-principal a').forEach(a => {
    if (a.dataset.secao === r.secao || (r.secao === 'conceito' && a.dataset.secao === 'enciclopedia')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  try {
    switch (r.secao) {
      case 'inicio': paginaInicio(main); break;
      case 'enciclopedia': paginaEnciclopedia(main, r.params); break;
      case 'conceito': paginaConceito(main, r.id, r.params); break;
      case 'glossario': paginaGlossario(main, { foco: r.id, params: r.params }); break;
      case 'simuladores': paginaSimuladores(main, r.id); break;
      case 'trilhas': paginaTrilhas(main, r.id); break;
      case 'quiz': paginaQuiz(main, r.params); break;
      case 'sobre': paginaSobre(main); break;
      default:
        document.title = 'Página não encontrada – Glossário da Economia';
        main.replaceChildren(h('div', { class: 'estreito secao' }, h('h1', null, 'Página não encontrada'), h('p', null, h('a', { href: '#/' }, 'Voltar ao início'))));
    }
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'estreito secao' }, h('h1', null, 'Algo deu errado'), h('p', null, 'Tente recarregar a página.')));
  }
  if (voltando) window.scrollTo({ top: posicoes.get(est.i) || 0, behavior: 'instant' });
  else if (!(r.secao === 'glossario' && r.id)) window.scrollTo({ top: 0, behavior: 'instant' });
  if (ev) main.focus({ preventScroll: true }); // na primeira carga o foco fica no início da página
  atualizarRolagem();
}

// ---------- Topo ----------
const menu = document.getElementById('menu'), btMenu = document.getElementById('btn-menu');
function fecharMenu() {
  if (!menu.classList.contains('aberto')) return;
  menu.classList.remove('aberto'); document.body.classList.remove('menu-aberto');
  btMenu.setAttribute('aria-expanded', 'false'); btMenu.setAttribute('aria-label', 'Abrir menu');
  btMenu.querySelector('use').setAttribute('href', '#i-menu');
}
function abrirMenu() {
  medirTopo();
  menu.classList.add('aberto'); document.body.classList.add('menu-aberto');
  btMenu.setAttribute('aria-expanded', 'true'); btMenu.setAttribute('aria-label', 'Fechar menu');
  btMenu.querySelector('use').setAttribute('href', '#i-fechar');
  (menu.querySelector('a[aria-current]') || menu.querySelector('a')).focus();
}
btMenu.addEventListener('click', () => (menu.classList.contains('aberto') ? fecharMenu() : abrirMenu()));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) fecharMenu(); });
document.addEventListener('click', (e) => { if (menu.classList.contains('aberto') && !e.target.closest('#menu, #btn-menu')) fecharMenu(); });

const btTema = document.getElementById('btn-tema');
const prefereEscuro = matchMedia('(prefers-color-scheme: dark)');
const escuro = () => (raiz.dataset.theme ? raiz.dataset.theme === 'dark' : prefereEscuro.matches);
function iconeTema() {
  btTema.querySelector('use').setAttribute('href', escuro() ? '#i-sol' : '#i-lua');
  const rot = escuro() ? 'Mudar para modo claro' : 'Mudar para modo escuro';
  btTema.setAttribute('aria-label', rot); btTema.title = rot;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro() ? '#0b1012' : '#0b5d3b');
}
// As cores dos gráficos vêm de variáveis CSS: trocar o tema não exige redesenhar a página
// (assim o quiz em andamento e os valores digitados nos simuladores não se perdem).
btTema.addEventListener('click', () => { raiz.dataset.theme = escuro() ? 'light' : 'dark'; try { localStorage.setItem('ge-tema', raiz.dataset.theme); } catch (e) {} iconeTema(); });
prefereEscuro.addEventListener?.('change', iconeTema);
iconeTema();

const btFonte = document.getElementById('btn-fonte');
const TAMANHOS = ['', 'g', 'p'], NOMES = { '': 'normal', g: 'grande', p: 'pequena' };
function rotuloFonte() {
  const rot = `Tamanho da letra: ${NOMES[raiz.dataset.fonte || ''] || 'normal'}. Clique para mudar.`;
  btFonte.setAttribute('aria-label', rot); btFonte.title = rot;
}
btFonte.addEventListener('click', () => {
  const atual = raiz.dataset.fonte || ''; const prox = TAMANHOS[(TAMANHOS.indexOf(atual) + 1) % TAMANHOS.length];
  if (prox) raiz.dataset.fonte = prox; else delete raiz.dataset.fonte;
  try { prox ? localStorage.setItem('ge-fonte', prox) : localStorage.removeItem('ge-fonte'); } catch (e) {}
  rotuloFonte(); medirTopo();
});
rotuloFonte();

function medirTopo() { raiz.style.setProperty('--topo-altura', document.getElementById('topo').offsetHeight + 'px'); }
addEventListener('resize', debounce(() => { medirTopo(); if (innerWidth > 832) fecharMenu(); }, 100));

function faixaIndicadores() {
  const f = document.getElementById('faixa'), ind = D.indicadores;
  if (!ind?.itens?.length) { f.hidden = true; return; }
  f.replaceChildren(...ind.itens.map(i => h('a', { class: 'item', href: i.conceito && achar(slug(i.conceito)) ? '#/conceito/' + achar(slug(i.conceito)).slug : '#/sobre', title: `${i.nome} · ${i.referencia} · Fonte: ${i.fonte}` },
    h('span', null, i.curto || i.nome), h('b', null, i.valor), h('small', null, i.referencia))),
    h('a', { class: 'item', href: '#/sobre' }, h('small', null, `Conferido em ${ind.atualizado_em} · fontes oficiais`)));
}

// Barra de progresso de leitura (página de conceito) e botão "voltar ao topo"
const barraLeitura = document.querySelector('#progresso-leitura span');
const btTopo = document.getElementById('btn-topo');
function atualizarRolagem() {
  if (btTopo) btTopo.hidden = scrollY < innerHeight * 1.5;
  if (!location.hash.startsWith('#/conceito/')) { barraLeitura.style.width = '0'; return; }
  const alt = document.documentElement.scrollHeight - innerHeight;
  barraLeitura.style.width = (alt > 0 ? Math.min(100, (100 * scrollY) / alt) : 0) + '%';
}
addEventListener('scroll', atualizarRolagem, { passive: true });
btTopo?.addEventListener('click', () => { window.scrollTo({ top: 0 }); main.focus({ preventScroll: true }); });

// ---------- Busca global ----------
const caixa = document.getElementById('busca-global'), entrada = document.getElementById('busca-global-input'), listaRes = document.getElementById('busca-global-lista');
let selecionado = 0, voltarPara = null;
function abrirBusca(texto = '') {
  if (!caixa.hidden) { entrada.focus(); return; }
  fecharMenu();
  voltarPara = document.activeElement; caixa.hidden = false; entrada.value = texto; resultados(); entrada.focus();
  entrada.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function fecharBusca(devolverFoco = true) {
  if (caixa.hidden) return;
  caixa.hidden = true; document.body.style.overflow = ''; entrada.setAttribute('aria-expanded', 'false');
  if (devolverFoco && voltarPara?.isConnected) voltarPara.focus?.();
  voltarPara = null;
}
function resultados() {
  const q = entrada.value.trim(); const qn = norm(q);
  const achados = q ? buscar(q, 12) : D.verbetes.filter(v => v.aprofundamento?.impactos).slice(0, 8);
  selecionado = 0; listaRes.replaceChildren();
  if (!achados.length) {
    entrada.removeAttribute('aria-activedescendant');
    listaRes.append(h('li', { class: 'sem', role: 'option', 'aria-disabled': 'true', 'aria-selected': 'false' }, `Nada encontrado para “${q}”. Tente outra palavra ou veja o glossário A–Z.`));
    return;
  }
  if (!q) listaRes.append(h('li', { class: 'sem rotulo-lista', role: 'presentation' }, 'Conceitos centrais'));
  achados.forEach((v, i) => listaRes.append(h('li', { role: 'option', id: 'res-' + i, 'aria-selected': i === 0 ? 'true' : 'false' },
    h('a', { href: '#/conceito/' + v.slug, tabindex: '-1' }, escrever(h('strong'), v.termo, qn), h('span', null, `${v.tema} · ${v.definicao}`)))));
  entrada.setAttribute('aria-activedescendant', 'res-0');
}
function mover(d) {
  const itens = [...listaRes.querySelectorAll('li[role="option"]:not([aria-disabled])')]; if (!itens.length) return;
  selecionado = (selecionado + d + itens.length) % itens.length;
  itens.forEach((li, i) => li.setAttribute('aria-selected', i === selecionado ? 'true' : 'false'));
  itens[selecionado].scrollIntoView({ block: 'nearest' }); entrada.setAttribute('aria-activedescendant', itens[selecionado].id);
}
const resultadosDepois = debounce(resultados, 60);
entrada.addEventListener('input', resultadosDepois);
entrada.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); mover(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
  else if (e.key === 'Enter') {
    e.preventDefault(); resultados(); // garante que a lista corresponde ao texto digitado
    const a = listaRes.querySelector('li[aria-selected="true"] a'), texto = entrada.value.trim();
    if (a) { fecharBusca(false); location.hash = a.getAttribute('href'); }
    else if (texto) { fecharBusca(false); location.hash = '#/glossario?q=' + encodeURIComponent(texto); }
  }
  else if (e.key === 'Tab') { e.preventDefault(); document.getElementById('fechar-busca').focus(); }
});
document.getElementById('fechar-busca').addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); entrada.focus(); } });
listaRes.addEventListener('click', (e) => { if (e.target.closest('a')) fecharBusca(false); });
caixa.addEventListener('mousedown', (e) => { if (e.target === caixa) fecharBusca(); });
document.getElementById('fechar-busca').addEventListener('click', () => fecharBusca());
document.getElementById('abrir-busca').addEventListener('click', () => abrirBusca());
document.addEventListener('abrir-busca', (e) => abrirBusca(e.detail || ''));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!caixa.hidden) { e.preventDefault(); fecharBusca(); }
    else if (menu.classList.contains('aberto')) { fecharMenu(); btMenu.focus(); }
    return;
  }
  const el = document.activeElement;
  const digitando = /INPUT|TEXTAREA|SELECT/.test(el?.tagName) || el?.isContentEditable;
  if ((e.key === '/' && !digitando && !e.ctrlKey && !e.metaKey && !e.altKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); abrirBusca(); }
});

// ---------- Início ----------
carregar()
  .then(() => { faixaIndicadores(); medirTopo(); navegar(); addEventListener('hashchange', navegar); })
  .catch((e) => {
    console.error(e);
    main.replaceChildren(h('div', { class: 'estreito secao' }, h('h1', null, 'Glossário da Economia'),
      h('p', { id: 'contagem' }, 'Não foi possível carregar o glossário. Tente recarregar a página.'),
      h('p', { class: 'fonte' }, 'Dica para quem está testando no computador: o site lê os arquivos da pasta data/ e precisa de um servidor local (python3 -m http.server 8000).')));
  });
