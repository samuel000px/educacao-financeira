// Ponto de entrada: carrega os dados, monta o topo, a busca global e o roteador.
import { carregar, D, buscar, achar } from './dados.js';
import { h, slug, icone, escrever, norm, debounce } from './util.js';
import { paginaGlossario } from './glossario.js';
import { paginaConceito } from './conceito.js';
import { paginaQuiz } from './quiz.js';
import { paginaInicio, paginaEnciclopedia, paginaSimuladores, paginaTrilhas, paginaSobre } from './paginas.js';

const main = document.getElementById('conteudo');
const raiz = document.documentElement;
const TITULO = 'Glossário da Economia – CORECON-PB';

// ---------- Rotas ----------
// #/                      início
// #/enciclopedia?tema=…   enciclopédia por categoria
// #/conceito/<termo>      página do conceito (7 níveis)
// #/glossario/<termo>     glossário A–Z, rolado até o termo
// #/simuladores[/<id>]    simuladores
// #/trilhas[/<id>]        trilhas de aprendizagem
// #/quiz                  quiz
// #/sobre                 metodologia e fontes
// Links antigos continuam valendo: #juros → conceito; ?q=…&tema=… → glossário.
function rota() {
  let hash = decodeURIComponent(location.hash || '');
  if (hash && !hash.startsWith('#/')) {
    const id = hash.slice(1);
    if (id.startsWith('letra-')) { history.replaceState(null, '', location.pathname + location.search + '#/glossario'); return rota(); }
    if (achar(slug(id))) { history.replaceState(null, '', location.pathname + location.search + '#/conceito/' + slug(id)); return rota(); }
    hash = '';
  }
  if (!hash && new URLSearchParams(location.search).toString()) hash = '#/glossario';
  const [caminho, qs] = hash.slice(2).split('?');
  const partes = caminho.split('/').filter(Boolean);
  return { secao: partes[0] || 'inicio', id: partes[1] || '', params: new URLSearchParams(qs || '') };
}

let ultimaChave = '';
function navegar() {
  const r = rota();
  const chave = r.secao + '/' + r.id + '?' + (r.secao === 'conceito' ? r.params.get('trilha') || '' : '');
  const mesmaPagina = chave === ultimaChave && r.secao === 'enciclopedia';
  ultimaChave = chave;
  if (mesmaPagina) return;
  document.title = TITULO;
  fecharMenu();
  document.querySelectorAll('.menu-principal a').forEach(a => {
    if (a.dataset.secao === r.secao || (r.secao === 'conceito' && a.dataset.secao === 'enciclopedia')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  try {
    switch (r.secao) {
      case 'inicio': paginaInicio(main); break;
      case 'enciclopedia': paginaEnciclopedia(main, r.params); break;
      case 'conceito': paginaConceito(main, r.id, r.params); break;
      case 'glossario': paginaGlossario(main, { foco: r.id }); break;
      case 'simuladores': paginaSimuladores(main, r.id); break;
      case 'trilhas': paginaTrilhas(main, r.id); break;
      case 'quiz': paginaQuiz(main, r.params); break;
      case 'sobre': paginaSobre(main); break;
      default: main.replaceChildren(h('div', { class: 'estreito secao' }, h('h1', null, 'Página não encontrada'), h('p', null, h('a', { href: '#/' }, 'Voltar ao início'))));
    }
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'estreito secao' }, h('h1', null, 'Algo deu errado'), h('p', null, 'Tente recarregar a página.')));
  }
  if (!(r.secao === 'glossario' && r.id)) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  main.focus({ preventScroll: true });
  atualizarProgresso();
}

// ---------- Topo ----------
const menu = document.getElementById('menu'), btMenu = document.getElementById('btn-menu');
function fecharMenu() { menu.classList.remove('aberto'); btMenu.setAttribute('aria-expanded', 'false'); btMenu.setAttribute('aria-label', 'Abrir menu'); }
btMenu.addEventListener('click', () => {
  const aberto = menu.classList.toggle('aberto');
  btMenu.setAttribute('aria-expanded', aberto ? 'true' : 'false'); btMenu.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  btMenu.querySelector('use').setAttribute('href', aberto ? '#i-fechar' : '#i-menu');
  if (aberto) menu.querySelector('a').focus();
});
menu.addEventListener('click', (e) => { if (e.target.closest('a')) { fecharMenu(); btMenu.querySelector('use').setAttribute('href', '#i-menu'); } });

const btTema = document.getElementById('btn-tema');
const escuro = () => raiz.dataset.theme ? raiz.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
function iconeTema() { btTema.querySelector('use').setAttribute('href', escuro() ? '#i-sol' : '#i-lua'); btTema.setAttribute('aria-label', escuro() ? 'Mudar para modo claro' : 'Mudar para modo escuro'); }
btTema.addEventListener('click', () => { raiz.dataset.theme = escuro() ? 'light' : 'dark'; try { localStorage.setItem('ge-tema', raiz.dataset.theme); } catch (e) {} iconeTema(); navegarGraficos(); });
iconeTema();
// redesenha gráficos para trocar as cores das séries
function navegarGraficos() { ultimaChave = ''; const y = scrollY; navegar(); scrollTo(0, y); }

const btFonte = document.getElementById('btn-fonte');
const TAMANHOS = ['', 'g', 'p'], NOMES = { '': 'normal', g: 'grande', p: 'pequena' };
btFonte.addEventListener('click', () => {
  const atual = raiz.dataset.fonte || ''; const prox = TAMANHOS[(TAMANHOS.indexOf(atual) + 1) % TAMANHOS.length];
  if (prox) raiz.dataset.fonte = prox; else delete raiz.dataset.fonte;
  try { prox ? localStorage.setItem('ge-fonte', prox) : localStorage.removeItem('ge-fonte'); } catch (e) {}
  btFonte.setAttribute('aria-label', 'Tamanho da letra: ' + NOMES[prox] + '. Clique para mudar.');
  medirTopo();
});

function medirTopo() { raiz.style.setProperty('--topo-altura', document.getElementById('topo').offsetHeight + 'px'); }
addEventListener('resize', debounce(medirTopo, 100));

function faixaIndicadores() {
  const f = document.getElementById('faixa'), ind = D.indicadores;
  if (!ind?.itens?.length) { f.hidden = true; return; }
  f.replaceChildren(...ind.itens.map(i => h('a', { class: 'item', href: i.conceito ? '#/conceito/' + slug(i.conceito) : '#/sobre', title: `${i.referencia} · Fonte: ${i.fonte}` },
    h('span', null, i.curto || i.nome), h('b', null, i.valor), h('small', null, i.referencia))),
    h('a', { class: 'item', href: '#/sobre' }, h('small', null, `Conferido em ${ind.atualizado_em} · fontes oficiais`)));
}

const barraLeitura = document.querySelector('#progresso-leitura span');
function atualizarProgresso() {
  if (!location.hash.startsWith('#/conceito/')) { barraLeitura.style.width = '0'; return; }
  const alt = document.documentElement.scrollHeight - innerHeight;
  barraLeitura.style.width = (alt > 0 ? Math.min(100, (100 * scrollY) / alt) : 0) + '%';
}
addEventListener('scroll', atualizarProgresso, { passive: true });

// ---------- Busca global ----------
const caixa = document.getElementById('busca-global'), entrada = document.getElementById('busca-global-input'), listaRes = document.getElementById('busca-global-lista');
let selecionado = 0, voltarPara = null;
function abrirBusca(texto = '') {
  voltarPara = document.activeElement; caixa.hidden = false; entrada.value = texto; resultados(); entrada.focus();
  document.body.style.overflow = 'hidden';
}
function fecharBusca() { caixa.hidden = true; document.body.style.overflow = ''; voltarPara?.focus?.(); }
function resultados() {
  const q = entrada.value.trim(); const qn = norm(q);
  const achados = q ? buscar(q, 12) : D.verbetes.filter(v => v.aprofundamento?.impactos).slice(0, 8);
  selecionado = 0; listaRes.replaceChildren();
  if (!achados.length) { listaRes.append(h('li', { class: 'sem', role: 'option', 'aria-disabled': 'true' }, `Nada encontrado para “${q}”. Tente outra palavra ou veja o glossário A–Z.`)); return; }
  if (!q) listaRes.append(h('li', { class: 'sem', role: 'presentation', style: 'padding:.5rem .75rem;font-size:.75rem' }, 'Conceitos centrais'));
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
entrada.addEventListener('input', debounce(resultados, 60));
entrada.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); mover(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
  else if (e.key === 'Enter') { e.preventDefault(); const a = listaRes.querySelector('li[aria-selected="true"] a'); if (a) { fecharBusca(); location.hash = a.getAttribute('href'); } else if (entrada.value.trim()) { fecharBusca(); location.hash = '#/glossario?q=' + encodeURIComponent(entrada.value.trim()); } }
  else if (e.key === 'Escape') fecharBusca();
  else if (e.key === 'Tab') { e.preventDefault(); document.getElementById('fechar-busca').focus(); }
});
document.getElementById('fechar-busca').addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); entrada.focus(); } if (e.key === 'Escape') fecharBusca(); });
listaRes.addEventListener('click', (e) => { if (e.target.closest('a')) fecharBusca(); });
caixa.addEventListener('click', (e) => { if (e.target === caixa) fecharBusca(); });
document.getElementById('fechar-busca').addEventListener('click', fecharBusca);
document.getElementById('abrir-busca').addEventListener('click', () => abrirBusca());
document.addEventListener('abrir-busca', (e) => abrirBusca(e.detail || ''));
document.addEventListener('keydown', (e) => {
  const digitando = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if ((e.key === '/' && !digitando) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); abrirBusca(); }
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
