// Glossário A–Z. Reúne todas as funções do site original:
// busca sem acentos com realce, filtro por tema, contagem, "Limpar filtros",
// índice alfabético fixo, filtros salvos na URL (?q= e ?tema=), "Veja também",
// fonte, botão Compartilhar e link direto para cada termo.
// Novidade: filtro por nível e link para a explicação completa.
import { D, existe, classeNivel, NIVEIS, achar } from './dados.js';
import { h, norm, slug, inicial, escrever, icone, toast } from './util.js';

function paragrafo(rotulo, texto, q) {
  const p = h('p');
  if (rotulo) p.append(h('span', { class: 'rotulo' }, rotulo + ': '));
  escrever(p, texto, q);
  return p;
}

export function linkDe(v) { return location.href.split('#')[0].split('?')[0] + '#/conceito/' + slug(v.termo); }

export async function compartilhar(v, botao) {
  const url = linkDe(v);
  const texto = v.termo + ': ' + v.definicao;
  const rotulo = botao.querySelector('span') || botao;
  const original = rotulo.textContent;
  try {
    if (navigator.share) { await navigator.share({ title: v.termo, text: texto, url }); return; }
    await navigator.clipboard.writeText(texto + '\n' + url);
    rotulo.textContent = 'Link copiado!'; toast('Link copiado para a área de transferência');
  } catch (e) {
    if (e.name === 'AbortError') return;
    window.prompt('Copie o link:', url);
  }
  setTimeout(() => { rotulo.textContent = original; }, 2000);
}

export function paginaGlossario(main, { foco } = {}) {
  const busca = h('input', { id: 'busca', type: 'search', placeholder: 'Ex.: juros', autocomplete: 'off', class: 'campo-texto' });
  const tema = h('select', { id: 'tema' }, h('option', { value: '' }, 'Todos'), D.temas.map(t => h('option', { value: t }, t)));
  const nivel = h('select', { id: 'nivel' }, h('option', { value: '' }, 'Todos'), NIVEIS.map(n => h('option', { value: n }, n)));
  const contagem = h('p', { id: 'contagem', 'aria-live': 'polite' });
  const limpar = h('button', { id: 'limpar', type: 'button', class: 'botao secundario pequeno', hidden: true }, 'Limpar filtros');
  const letras = h('nav', { class: 'letras', id: 'letras', 'aria-label': 'Índice alfabético' });
  const lista = h('section', { id: 'lista', 'aria-label': 'Verbetes' });

  main.replaceChildren(h('div', { class: 'estreito secao' },
    h('p', { class: 'sobretitulo' }, 'Glossário A–Z'),
    h('h1', null, 'Glossário da Economia'),
    h('p', { class: 'lead' }, 'Termos da economia explicados de forma simples. Uma iniciativa do CORECON-PB em apoio ao “PB sem dívidas”.'),
    h('div', { class: 'glossario-filtros', role: 'search', style: 'margin-top:1.5rem' },
      h('div', null, h('label', { for: 'busca' }, 'Buscar um termo'), busca),
      h('div', null, h('label', { for: 'tema' }, 'Tema'), tema),
      h('div', null, h('label', { for: 'nivel' }, 'Nível'), nivel)),
    h('div', { class: 'acoes' }, contagem, limpar),
    letras, lista));

  const p = new URLSearchParams(location.search);
  busca.value = p.get('q') || '';
  if ([...tema.options].some(o => o.value === p.get('tema'))) tema.value = p.get('tema');
  if ([...nivel.options].some(o => o.value === p.get('nivel'))) nivel.value = p.get('nivel');

  function salvarNaUrl() {
    const u = new URLSearchParams();
    if (busca.value.trim()) u.set('q', busca.value.trim());
    if (tema.value) u.set('tema', tema.value);
    if (nivel.value) u.set('nivel', nivel.value);
    const qs = u.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  function mostrar() {
    const q = norm(busca.value.trim());
    const t = tema.value, n = nivel.value;
    const achados = D.verbetes
      .filter(v => (!t || v.tema === t) && (!n || v.nivel === n) && (!q || norm(v.termo + ' ' + (v.sinonimos || []).join(' ') + ' ' + v.definicao + ' ' + (v.exemplo || '')).includes(q)))
      .sort((a, b) => a.termo.localeCompare(b.termo, 'pt-BR'));
    contagem.textContent = achados.length + (achados.length === 1 ? ' termo encontrado' : ' termos encontrados');
    limpar.hidden = !q && !t && !n;
    lista.replaceChildren();

    if (!achados.length) lista.append(h('p', { class: 'vazio' }, 'Nenhum termo encontrado. Tente outra palavra, confira a grafia ou escolha “Todos” os temas.'));

    const grupos = new Map();
    for (const v of achados) { const l = inicial(v.termo); if (!grupos.has(l)) grupos.set(l, []); grupos.get(l).push(v); }

    letras.replaceChildren();
    for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#') {
      if (l === '#' && !grupos.has('#')) continue;
      const idLetra = 'letra-' + (l === '#' ? 'outros' : l);
      const el = grupos.has(l)
        ? h('a', { href: '#/glossario', 'aria-label': 'Letra ' + l, onclick: (e) => { e.preventDefault(); document.getElementById(idLetra)?.scrollIntoView(); } }, l)
        : h('span', { 'aria-hidden': 'true' }, l);
      letras.append(el);
    }
    letras.hidden = achados.length < 2;

    for (const [l, itens] of grupos) {
      const g = h('section', { class: 'grupo' }, h('h2', { id: 'letra-' + (l === '#' ? 'outros' : l) }, l));
      for (const v of itens) {
        const el = h('article', { class: 'verbete', id: v.slug });
        el.append(escrever(h('h3'), v.termo, q));
        if (v.tema) el.append(h('p', { class: 'tema' }, v.tema, v.nivel ? h('span', { class: 'etiqueta ' + classeNivel(v.nivel) }, v.nivel) : null));
        el.append(paragrafo('', v.definicao, q));
        if (v.exemplo) el.append(paragrafo('Exemplo', v.exemplo, q));
        if (v.importa) el.append(paragrafo('Por que importa', v.importa));
        if (Array.isArray(v.relacionados)) {
          const rel = v.relacionados.filter(existe);
          if (rel.length) {
            const pr = h('p', null, h('span', { class: 'rotulo' }, 'Veja também: '));
            rel.forEach((nome, i) => {
              pr.append(h('a', { href: '#/glossario/' + achar(slug(nome)).slug }, nome));
              if (i < rel.length - 1) pr.append(', ');
            });
            el.append(pr);
          }
        }
        if (v.fonte) el.append(h('p', { class: 'fonte' }, 'Fonte: ' + v.fonte));
        const b = h('button', { type: 'button', class: 'botao secundario pequeno', 'aria-label': 'Compartilhar o termo ' + v.termo }, icone('compartilhar'), h('span', null, 'Compartilhar'));
        b.addEventListener('click', () => compartilhar(v, b));
        el.append(h('div', { class: 'rodape-verbete' },
          h('a', { class: 'botao pequeno', href: '#/conceito/' + v.slug }, 'Explicação completa', icone('seta')), b));
        g.append(el);
      }
      lista.append(g);
    }
  }

  const aoFiltrar = () => { salvarNaUrl(); mostrar(); };
  busca.addEventListener('input', aoFiltrar);
  tema.addEventListener('change', aoFiltrar);
  nivel.addEventListener('change', aoFiltrar);
  limpar.addEventListener('click', () => { busca.value = ''; tema.value = ''; nivel.value = ''; aoFiltrar(); busca.focus(); });
  mostrar();

  // Se o link aponta para um termo escondido pelos filtros, limpa os filtros para exibi-lo
  if (foco) {
    const v = achar(foco);
    if (v && !document.getElementById(v.slug)) { busca.value = ''; tema.value = ''; nivel.value = ''; salvarNaUrl(); mostrar(); }
    const alvo = v && document.getElementById(v.slug);
    if (alvo) { alvo.classList.add('alvo'); requestAnimationFrame(() => alvo.scrollIntoView()); }
  }
}
