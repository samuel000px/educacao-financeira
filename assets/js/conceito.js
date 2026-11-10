// Página de um conceito: 7 níveis de aprofundamento em abas, fórmulas, impactos por agente,
// mapa de relações, simulador embutido, teste rápido, fontes e progresso.
import { D, achar, existe, progresso, trilhasDe, classeNivel } from './dados.js';
import { h, s, icone, paragrafos, slug, guardar, toast, plural } from './util.js';
import { porId, montarSimulador } from './simuladores.js';
import { compartilhar } from './glossario.js';
import { perguntaInterativa } from './quiz.js';

export const NIVEIS_CONTEUDO = [
  ['simples', 'Definição simples'], ['tecnica', 'Explicação técnica'], ['pratica', 'Na prática'],
  ['impactos', 'Impactos econômicos'], ['exemplos', 'Exemplos e aplicações'], ['relacoes', 'Relações com outros indicadores'],
  ['mercado', 'No mercado financeiro'],
];
export const AGENTES = [
  ['consumidores', 'Consumidores', 'carrinho'], ['familias', 'Famílias', 'casa'], ['empresas', 'Empresas', 'fabrica'],
  ['trabalhadores', 'Trabalhadores', 'trabalhador'], ['governo', 'Governo', 'governo'], ['bancos', 'Bancos', 'banco'],
  ['investidores', 'Investidores', 'investidor'], ['mercado', 'Mercado financeiro', 'mercado'],
  ['nacional', 'Economia nacional', 'brasil'], ['internacional', 'Economia internacional', 'globo'],
];

function palavras(v) {
  const a = v.aprofundamento || {};
  const txt = [v.definicao, v.exemplo, v.importa, ...Object.values(a).flatMap(x => (typeof x === 'object' && !Array.isArray(x) ? Object.values(x) : x))].flat().join(' ');
  return txt.split(/\s+/).length;
}

function mapaRelacoes(v) {
  const rel = (v.relacionados || []).filter(existe).map(n => achar(slug(n))).slice(0, 8);
  if (!rel.length) return null;
  const W = 520, H = 300, cx = W / 2, cy = H / 2, R = Math.min(118, 60 + rel.length * 8);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': 'Mapa de relações de ' + v.termo });
  const pos = rel.map((r, i) => { const ang = -Math.PI / 2 + (2 * Math.PI * i) / rel.length; return [cx + R * 1.75 * Math.cos(ang), cy + R * Math.sin(ang)]; });
  pos.forEach(([x, y]) => svg.append(s('line', { x1: cx, y1: cy, x2: x, y2: y })));
  const no = (texto, x, y, centro, href) => {
    const larg = Math.min(170, 22 + texto.length * 7.2);
    const g = s(href ? 'a' : 'g', { class: 'no' + (centro ? ' centro' : ''), href: href || null, 'aria-label': href ? texto : null });
    if (href) g.append(s('title', null, texto));
    g.append(s('rect', { x: x - larg / 2, y: y - 15, width: larg, height: 30, rx: 15 }));
    const t = texto.length > 22 ? texto.slice(0, 21) + '…' : texto;
    g.append(s('text', { x, y: y + 4, 'text-anchor': 'middle' }, t));
    return g;
  };
  rel.forEach((r, i) => svg.append(no(r.termo, pos[i][0], pos[i][1], false, '#/conceito/' + r.slug)));
  svg.append(no(v.termo, cx, cy, true));
  return h('div', { class: 'mapa-relacoes cartao' }, svg);
}

function conteudoNivel(v, chave) {
  const a = v.aprofundamento || {};
  const frag = document.createDocumentFragment();
  const texto = (t) => frag.append(h('div', { class: 'texto-longo' }, paragrafos(t)));
  switch (chave) {
    case 'simples':
      if (a.simples) texto(a.simples); else texto(v.definicao);
      if (v.exemplo) frag.append(h('div', { class: 'bloco-marcado exemplo' }, h('span', { class: 'marcador' }, 'Exemplo'), h('p', null, v.exemplo)));
      if (v.importa) frag.append(h('div', { class: 'bloco-marcado fato' }, h('span', { class: 'marcador' }, 'Por que importa'), h('p', null, v.importa)));
      break;
    case 'tecnica':
      if (a.tecnica) texto(a.tecnica);
      if (v.formulas?.length) {
        frag.append(h('h4', { class: 'subtema-titulo' }, 'Fórmulas'));
        for (const f of v.formulas) frag.append(h('div', { class: 'formula' }, h('h4', null, f.nome), h('code', null, f.expressao), f.legenda ? h('p', null, f.legenda) : null));
      }
      break;
    case 'impactos': {
      const imp = a.impactos || {};
      if (imp.resumo) texto(imp.resumo);
      frag.append(h('div', { class: 'impactos' }, AGENTES.filter(([k]) => imp[k]).map(([k, nome, ic]) =>
        h('div', { class: 'impacto' }, h('h4', null, icone(ic), nome), h('p', null, imp[k])))));
      break;
    }
    case 'exemplos':
      if (a.exemplos) texto(a.exemplos);
      if (v.simulador && porId.get(v.simulador)) {
        frag.append(h('h4', { class: 'subtema-titulo' }, 'Experimente: altere os valores'));
        const box = h('div'); montarSimulador(porId.get(v.simulador), box, { nivelTitulo: 'h3' }); frag.append(box);
      }
      break;
    case 'relacoes': {
      if (a.relacoes) texto(a.relacoes);
      const mapa = mapaRelacoes(v); if (mapa) frag.append(mapa);
      break;
    }
    default:
      if (a[chave]) texto(a[chave]);
  }
  return frag;
}

export function temNivel(v, chave) {
  const a = v.aprofundamento || {};
  if (chave === 'simples') return true;
  if (chave === 'tecnica') return !!(a.tecnica || v.formulas?.length);
  if (chave === 'impactos') return !!(a.impactos && Object.keys(a.impactos).length);
  if (chave === 'exemplos') return !!(a.exemplos || v.simulador);
  if (chave === 'relacoes') return !!(a.relacoes || (v.relacionados || []).some(existe));
  return !!a[chave];
}

// Quantos níveis a página do conceito mostra (mesma regra das abas)
export const contarNiveis = (v) => NIVEIS_CONTEUDO.filter(([k]) => temNivel(v, k)).length;

export function paginaConceito(main, id, params) {
  const v = achar(id);
  if (!v) {
    document.title = 'Conceito não encontrado – Glossário da Economia';
    main.replaceChildren(h('div', { class: 'estreito secao' }, h('h1', null, 'Conceito não encontrado'),
      h('p', null, 'Esse termo ainda não está na enciclopédia. ', h('a', { href: '#/glossario' }, 'Veja o glossário completo'), '.')));
    return;
  }
  document.title = v.termo + ' – Glossário da Economia';
  const niveis = NIVEIS_CONTEUDO.filter(([k]) => temNivel(v, k));
  const nivelSalvo = guardar.ler('nivel-preferido', 'simples');
  let atual = Math.max(0, niveis.findIndex(([k]) => k === (params.get('nivel') || nivelSalvo)));
  const estudado = progresso.estudado(v.slug);
  const minutos = Math.max(1, Math.round(palavras(v) / 200));

  // Abas acessíveis (padrão WAI-ARIA tabs)
  const lista = h('div', { class: 'abas', role: 'tablist', 'aria-label': 'Níveis de aprofundamento' });
  const paineis = niveis.map(([k, nome], i) => h('section', { class: 'painel-aba', role: 'tabpanel', id: 'p-' + k, 'aria-labelledby': 't-' + k, tabindex: '0', hidden: i !== atual ? true : null },
    h('h3', null, `Nível ${NIVEIS_CONTEUDO.findIndex(n => n[0] === k) + 1} · ${nome}`)));
  const preenchido = new Set();
  // Ao fim de cada nível, botões para seguir a leitura na ordem (do mais simples ao mais avançado)
  const passos = (i) => {
    if (niveis.length < 2) return null;
    const ir = (k) => { selecionar(k); paineis[k].focus({ preventScroll: true }); lista.scrollIntoView({ block: 'start', behavior: 'instant' }); };
    const ant = niveis[i - 1], prox = niveis[i + 1];
    return h('nav', { class: 'passos-nivel', 'aria-label': 'Continuar a leitura' },
      ant ? h('button', { type: 'button', class: 'botao secundario pequeno', onclick: () => ir(i - 1) }, '← ' + ant[1]) : h('span'),
      h('span', { class: 'onde' }, `${i + 1} de ${niveis.length}`),
      prox ? h('button', { type: 'button', class: 'botao pequeno', onclick: () => ir(i + 1) }, 'Próximo nível: ' + prox[1], icone('seta')) : h('span'));
  };
  const preencher = (i) => { if (!preenchido.has(i)) { paineis[i].append(conteudoNivel(v, niveis[i][0]), passos(i) || ''); preenchido.add(i); } };
  const selecionar = (i, focar) => {
    atual = i; preencher(i);
    [...lista.children].forEach((b, k) => { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
    paineis.forEach((p, k) => { p.hidden = k !== i; });
    guardar.gravar('nivel-preferido', niveis[i][0]);
    // no celular as abas rolam para o lado: mantém a aba escolhida à vista
    const aba = lista.children[i];
    if (lista.scrollWidth > lista.clientWidth) lista.scrollTo({ left: aba.offsetLeft - (lista.clientWidth - aba.offsetWidth) / 2 });
    if (focar) aba.focus();
  };
  niveis.forEach(([k, nome], i) => lista.append(h('button', {
    type: 'button', role: 'tab', id: 't-' + k, 'aria-controls': 'p-' + k, 'aria-selected': i === atual ? 'true' : 'false', tabindex: i === atual ? '0' : '-1',
    onclick: () => selecionar(i),
    onkeydown: (e) => {
      const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: niveis.length - 1 }[e.key];
      if (n !== undefined) { e.preventDefault(); selecionar((n + niveis.length) % niveis.length, true); }
    },
  }, h('span', { class: 'num', 'aria-hidden': 'true' }, NIVEIS_CONTEUDO.findIndex(x => x[0] === k) + 1), nome)));
  preencher(atual);
  // avisa, com um esmaecido nas bordas, quando há abas fora da tela (celular)
  const bordas = () => {
    lista.classList.toggle('rola-esq', lista.scrollLeft > 4);
    lista.classList.toggle('rola-dir', lista.scrollLeft + lista.clientWidth < lista.scrollWidth - 4);
  };
  lista.addEventListener('scroll', bordas, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(bordas).observe(lista);
  requestAnimationFrame(() => { const aba = lista.children[atual]; if (aba && lista.scrollWidth > lista.clientWidth) lista.scrollLeft = aba.offsetLeft - (lista.clientWidth - aba.offsetWidth) / 2; bordas(); });

  const artigo = h('article', { 'aria-label': 'Explicação de ' + v.termo });
  const verTudo = niveis.length > 1 ? h('button', { type: 'button', class: 'botao secundario pequeno', 'aria-pressed': 'false' }, 'Ler todos os níveis em sequência') : null;
  verTudo?.addEventListener('click', () => {
    const on = verTudo.getAttribute('aria-pressed') !== 'true';
    verTudo.setAttribute('aria-pressed', on ? 'true' : 'false');
    lista.hidden = on; artigo.classList.toggle('lendo-tudo', on);
    paineis.forEach((p, k) => {
      if (on) { preencher(k); p.hidden = false; p.setAttribute('role', 'region'); p.removeAttribute('tabindex'); }
      else { p.setAttribute('role', 'tabpanel'); p.tabIndex = 0; p.hidden = k !== atual; }
    });
  });

  let aoMarcar = null;
  const btEstudo = h('button', { type: 'button', class: 'botao', 'aria-pressed': estudado ? 'true' : 'false' }, icone('check'), h('span', null, estudado ? 'Estudado' : 'Marcar como estudado'));
  btEstudo.addEventListener('click', async () => {
    btEstudo.disabled = true;
    try {
      const on = await progresso.alternar(v.slug);
      if (!btEstudo.isConnected) return;
      btEstudo.setAttribute('aria-pressed', on ? 'true' : 'false');
      btEstudo.querySelector('span').textContent = on ? 'Estudado' : 'Marcar como estudado';
      toast(on ? 'Conceito marcado como estudado' : 'Marcação de estudado removida');
      aoMarcar?.(on);
    } catch {
      if (btEstudo.isConnected) toast('Não foi possível salvar o progresso. Tente novamente.');
    } finally {
      btEstudo.disabled = false;
    }
  });
  const btComp = h('button', { type: 'button', class: 'botao secundario', 'aria-label': 'Compartilhar o termo ' + v.termo }, icone('compartilhar'), h('span', null, 'Compartilhar'));
  btComp.addEventListener('click', () => compartilhar(v, btComp));

  // Teste rápido
  const perguntas = D.quiz.filter(q => slug(q.conceito) === v.slug);
  const testeRapido = perguntas.length ? h('section', { class: 'secao', 'aria-labelledby': 'teste-t' },
    h('h2', { id: 'teste-t' }, 'Teste rápido'),
    ...perguntas.slice(0, 3).map(q => h('div', { class: 'cartao cartao-pergunta' }, perguntaInterativa(q)))) : null;

  // Trilha atual (para navegação anterior/próximo)
  const trilhaId = params.get('trilha');
  const trilhas = trilhasDe(v.slug);
  const trilha = D.trilhas.find(t => t.id === trilhaId) || null;
  let navTrilha = null, faixaTrilha = null;
  const itensTrilha = trilha ? trilha.conceitos.map(n => achar(slug(n))).filter(Boolean) : [];
  if (trilha && itensTrilha.some(x => x.slug === v.slug)) {
    const itens = itensTrilha;
    const i = itens.findIndex(x => x.slug === v.slug);
    const ant = itens[i - 1], prox = itens[i + 1];
    const barra = h('span');
    const contagem = h('span', { class: 'fonte' });
    const medir = () => { const p = progresso.trilha(trilha); barra.style.width = p.pct + '%'; contagem.textContent = `${p.feitos} de ${p.total} conceitos estudados`; };
    medir(); aoMarcar = medir;
    faixaTrilha = h('div', { class: 'faixa-trilha' },
      h('div', null, icone('trilha'), h('span', null, 'Trilha: ', h('a', { href: '#/trilhas/' + trilha.id }, trilha.titulo)), h('strong', null, `Conceito ${i + 1} de ${itens.length}`)),
      h('div', { class: 'barra-progresso', 'aria-hidden': 'true' }, barra), contagem);
    navTrilha = h('nav', { class: 'navegacao-trilha', 'aria-label': 'Navegação na trilha ' + trilha.titulo },
      ant ? h('a', { class: 'cartao', href: `#/conceito/${ant.slug}?trilha=${trilha.id}` }, h('small', null, '← Anterior'), h('strong', null, ant.termo)) : h('span'),
      prox ? h('a', { class: 'cartao prox', href: `#/conceito/${prox.slug}?trilha=${trilha.id}` }, h('small', null, 'Próximo →'), h('strong', null, prox.termo))
        : h('a', { class: 'cartao prox', href: `#/trilhas/${trilha.id}` }, h('small', null, 'Fim da trilha'), h('strong', null, 'Voltar à trilha')));
  }

  const refs = (v.referencias || []);
  const relacionados = (v.relacionados || []).filter(existe).map(n => achar(slug(n)));

  const lateral = h('aside', { class: 'lateral', 'aria-label': 'Resumo do conceito' },
    h('div', { class: 'cartao' }, h('h4', null, 'Em resumo'), h('div', { class: 'resumo-rapido' },
      h('div', null, h('b', null, 'Nível'), h('span', { class: 'etiqueta ' + classeNivel(v.nivel) }, v.nivel || '—')),
      h('div', null, h('b', null, 'Categoria'), h('a', { href: '#/enciclopedia?tema=' + encodeURIComponent(v.tema) }, v.tema), v.subtema ? ' · ' + v.subtema : ''),
      v.importa ? h('div', null, h('b', null, 'Por que importa'), v.importa) : null,
      h('div', null, h('b', null, 'Leitura'), `cerca de ${minutos} min · ${plural(niveis.length, 'nível', 'níveis')}`))),
    relacionados.length ? h('div', { class: 'cartao' }, h('h4', null, 'Conceitos relacionados'),
      h('ul', { class: 'lista-simples' }, relacionados.map(r => h('li', null, h('a', { href: '#/conceito/' + r.slug }, r.termo))))) : null,
    trilhas.length ? h('div', { class: 'cartao' }, h('h4', null, 'Está nas trilhas'),
      h('ul', { class: 'lista-simples' }, trilhas.map(t => h('li', null, h('a', { href: '#/trilhas/' + t.id }, t.titulo))))) : null,
    v.simulador && porId.get(v.simulador) ? h('a', { class: 'cartao', href: '#/simuladores/' + v.simulador },
      h('h4', null, 'Ferramenta'), h('strong', null, porId.get(v.simulador).titulo), h('span', { class: 'seta' }, 'Abrir →')) : null);

  main.replaceChildren(h('div', { class: 'container' },
    h('nav', { class: 'migalhas', 'aria-label': 'Você está em' },
      h('a', { href: '#/enciclopedia' }, 'Enciclopédia'), h('span', { 'aria-hidden': 'true' }, '/'),
      h('a', { href: '#/enciclopedia?tema=' + encodeURIComponent(v.tema) }, v.tema), v.subtema ? [h('span', { 'aria-hidden': 'true' }, '/'), h('span', null, v.subtema)] : null),
    faixaTrilha,
    h('header', { class: 'conceito-cabeca' },
      h('h1', null, v.termo),
      v.sinonimos?.length ? h('p', { class: 'fonte' }, 'Também chamado de: ' + v.sinonimos.join(', ')) : null,
      h('p', { class: 'definicao-destaque' }, v.definicao),
      h('div', { class: 'meta' }, h('span', { class: 'etiqueta ' + classeNivel(v.nivel) }, v.nivel || 'Verbete'), h('span', null, v.tema), h('span', { 'aria-hidden': 'true' }, '·'), h('span', null, `${minutos} min de leitura`), verTudo)),
    h('div', { class: 'conceito-layout' },
      (artigo.append(...[
        lista, ...paineis,
        refs.length || v.fonte ? h('section', { class: 'secao', 'aria-labelledby': 'refs-t' }, h('h2', { id: 'refs-t' }, 'Referências e fontes'),
          v.fonte ? h('p', { class: 'fonte' }, 'Fonte: ' + v.fonte) : null,
          h('ul', { class: 'referencias' }, refs.map(r => h('li', null, icone('fonte'), h('div', null, r.url ? h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.titulo, h('span', { class: 'vh' }, ' (abre em nova aba)')) : r.titulo, r.orgao ? h('small', null, r.orgao) : null))))) : null,
        h('div', { class: 'acoes-conceito' }, btEstudo, btComp, h('a', { class: 'botao secundario', href: '#/glossario/' + v.slug }, 'Ver no glossário A–Z')),
        navTrilha, testeRapido,
        h('div', { class: 'aviso-conteudo' }, icone('aviso'), h('p', null, 'Conteúdo educativo, em revisão pela equipe. Os blocos marcados como “Exemplo hipotético” usam números inventados para ilustrar; “Fato” indica informação com fonte. ', h('a', { href: '#/sobre' }, 'Saiba como lemos e citamos as fontes.')))].filter(Boolean)), artigo),
      lateral)));
}
