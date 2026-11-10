// Gráficos em SVG puro, sem bibliotecas: linha, área (empilhada) e faixa de incerteza.
// Cada gráfico tem legenda (2+ séries), mira com dica ao passar o mouse/dedo e tabela de dados.
import { h, s, num } from './util.js';

function escalaBonita(min, max, n = 5) {
  if (min === max) { max = min + 1; }
  const passoBruto = (max - min) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(passoBruto))));
  const r = passoBruto / mag;
  const passo = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
  const ini = Math.floor(min / passo) * passo, fim = Math.ceil(max / passo) * passo;
  const marcas = []; for (let v = ini; v <= fim + passo / 2; v += passo) marcas.push(+v.toFixed(10));
  return { ini, fim, marcas };
}

export function grafico(alvo, cfg) {
  const caixa = h('div', { class: 'grafico' });
  alvo.replaceChildren(caixa);
  const desenhar = () => desenharGrafico(caixa, cfg);
  desenhar();
  if ('ResizeObserver' in window) {
    let w = caixa.clientWidth;
    const ro = new ResizeObserver(() => { if (Math.abs(caixa.clientWidth - w) > 8) { w = caixa.clientWidth; desenhar(); } });
    ro.observe(caixa);
  }
  return caixa;
}

function desenharGrafico(caixa, cfg) {
  const { x, series, formatoY = (v) => num(v, 0), formatoX = (v) => v, faixa, titulo, rotuloX = '', zeroNoEixo = true } = cfg;
  const W = Math.max(280, caixa.clientWidth || 600);
  const H = cfg.altura || Math.round(Math.min(340, Math.max(220, W * 0.5)));
  const m = { t: 14, r: 14, b: 34, l: 0 };
  // valores empilhados
  const base = new Array(x.length).fill(0);
  const pilhas = series.map(se => {
    const ini = se.empilhar ? base.slice() : new Array(x.length).fill(0);
    const fim = se.valores.map((v, i) => (se.empilhar ? ini[i] + v : v));
    if (se.empilhar) fim.forEach((v, i) => (base[i] = v));
    return { ini, fim };
  });
  let todos = pilhas.flatMap(p => p.fim);
  if (faixa) todos = todos.concat(faixa.inferior, faixa.superior);
  todos = todos.filter(Number.isFinite);
  let vmin = Math.min(...todos), vmax = Math.max(...todos);
  if (zeroNoEixo) vmin = Math.min(0, vmin);
  const esc = escalaBonita(vmin, vmax);
  // margem esquerda conforme o maior rótulo do eixo y
  const maiorRotulo = Math.max(...esc.marcas.map(v => formatoY(v).length));
  m.l = Math.min(84, 10 + maiorRotulo * 6.4);
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const X = (i) => m.l + (x.length === 1 ? iw / 2 : (i / (x.length - 1)) * iw);
  const Y = (v) => m.t + ih - ((v - esc.ini) / (esc.fim - esc.ini)) * ih;

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': titulo || 'Gráfico' });
  const gEixo = s('g', { class: 'eixo' });
  for (const v of esc.marcas) {
    gEixo.append(s('line', { class: v === 0 ? 'grade-linha linha-zero' : 'grade-linha', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }));
    gEixo.append(s('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end' }, formatoY(v)));
  }
  const passoX = Math.max(1, Math.ceil(x.length / Math.max(2, Math.floor(iw / 70))));
  x.forEach((xv, i) => {
    if (i % passoX === 0 || i === x.length - 1) {
      if (i !== x.length - 1 && x.length - 1 - i < passoX * 0.6) return;
      gEixo.append(s('text', { x: X(i), y: H - m.b + 18, 'text-anchor': i === 0 ? 'start' : i === x.length - 1 ? 'end' : 'middle' }, formatoX(xv)));
    }
  });
  if (rotuloX) gEixo.append(s('text', { x: W - m.r, y: H - 2, 'text-anchor': 'end' }, rotuloX));
  svg.append(gEixo);

  if (faixa) {
    const sup = faixa.superior.map((v, i) => `${X(i)},${Y(v)}`);
    const inf = faixa.inferior.map((v, i) => `${X(i)},${Y(v)}`).reverse();
    svg.append(s('polygon', { points: sup.concat(inf).join(' '), style: `fill:${faixa.cor};opacity:.16` }));
  }
  series.forEach((se, k) => {
    const p = pilhas[k];
    const linha = p.fim.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
    if (se.tipo === 'area') {
      const baseLinha = p.ini.map((v, i) => `L${X(i).toFixed(1)},${Y(v).toFixed(1)}`).reverse().join('');
      svg.append(s('path', { d: linha + baseLinha + 'Z', style: `fill:${se.cor};opacity:${se.opacidade ?? .78}` }));
      svg.append(s('path', { d: linha, class: 'serie-linha', style: `stroke:${se.cor};stroke-width:1.5` }));
    } else {
      svg.append(s('path', { d: linha, class: 'serie-linha', style: `stroke:${se.cor}`, 'stroke-dasharray': se.tracejada ? '6 5' : null }));
    }
  });

  // camada de interação
  const mira = s('line', { class: 'mira', y1: m.t, y2: m.t + ih, x1: -10, x2: -10, visibility: 'hidden' });
  const pontos = series.map(se => s('circle', { r: 4.5, class: 'ponto', style: `fill:${se.cor}`, visibility: 'hidden' }));
  svg.append(mira, ...pontos);
  const area = s('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' });
  svg.append(area);
  const dica = h('div', { class: 'dica', role: 'presentation' });
  const mostrar = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(x.length - 1, Math.round(((px - m.l) / iw) * (x.length - 1))));
    mira.setAttribute('x1', X(i)); mira.setAttribute('x2', X(i)); mira.setAttribute('visibility', 'visible');
    pontos.forEach((pt, k) => { pt.setAttribute('cx', X(i)); pt.setAttribute('cy', Y(pilhas[k].fim[i])); pt.setAttribute('visibility', 'visible'); });
    dica.replaceChildren(h('b', null, formatoX(x[i]) + (cfg.sufixoX || '')));
    series.forEach(se => dica.append(h('br'), h('i', { style: `background:${se.cor}` }), `${se.nome}: ${(se.formatoDica || formatoY)(se.valores[i])}`));
    if (faixa) dica.append(h('br'), `${faixa.nome}: ${formatoY(faixa.inferior[i])} a ${formatoY(faixa.superior[i])}`);
    const left = (X(i) / W) * r.width;
    dica.style.left = Math.min(Math.max(left, 80), r.width - 80) + 'px';
    dica.style.top = ((Y(Math.max(...pilhas.map(p => p.fim[i]))) / H) * r.height) + 'px';
    dica.classList.add('visivel');
  };
  const esconder = () => { mira.setAttribute('visibility', 'hidden'); pontos.forEach(p => p.setAttribute('visibility', 'hidden')); dica.classList.remove('visivel'); };
  area.addEventListener('pointermove', mostrar);
  area.addEventListener('pointerdown', mostrar);
  area.addEventListener('pointerleave', esconder);

  // legenda (2+ séries)
  const itensLegenda = series.map(se => h('li', null, h('i', { class: se.tracejada ? 'tracejada' : '', style: se.tracejada ? `border-color:${se.cor}` : `background:${se.cor}` }), se.nome));
  if (faixa) itensLegenda.push(h('li', null, h('i', { style: `background:${faixa.cor};opacity:.35` }), faixa.nome));
  const legenda = itensLegenda.length > 1 ? h('ul', { class: 'legenda' }, itensLegenda) : null;

  // tabela de dados (alternativa acessível)
  const cab = h('tr', null, h('th', null, cfg.nomeX || 'Período'), series.map(se => h('th', null, se.nome)), faixa ? [h('th', null, faixa.nome + ' (mín.)'), h('th', null, faixa.nome + ' (máx.)')] : null);
  const linhas = x.map((xv, i) => h('tr', null, h('td', null, formatoX(xv)), series.map(se => h('td', null, (se.formatoDica || formatoY)(se.valores[i]))),
    faixa ? [h('td', null, formatoY(faixa.inferior[i])), h('td', null, formatoY(faixa.superior[i]))] : null));
  const tabela = h('details', { class: 'tabela-dados' }, h('summary', null, 'Ver dados em tabela'),
    h('div', { class: 'rolagem' }, h('table', null, h('thead', null, cab), h('tbody', null, linhas))));

  caixa.replaceChildren(...[legenda, svg, dica, tabela].filter(Boolean));
}

// Barras horizontais simples em HTML (comparações de poucos valores)
export function barras(alvo, itens, formato) {
  const max = Math.max(...itens.map(i => Math.abs(i.valor)), 1e-9);
  const temNeg = itens.some(i => i.valor < 0);
  alvo.replaceChildren(h('div', { class: 'barras-h', role: 'list' }, itens.map(i => {
    const w = (Math.abs(i.valor) / max) * (temNeg ? 50 : 100);
    const left = temNeg ? (i.valor < 0 ? 50 - w : 50) : 0;
    return h('div', { class: 'barra-h', role: 'listitem' },
      h('span', null, i.nome),
      h('div', { class: 'trilho', 'aria-hidden': 'true' }, h('span', { style: `left:${left}%;width:${w}%;background:${i.cor || 'var(--s1)'}` })),
      h('output', null, formato(i.valor)));
  })));
}
