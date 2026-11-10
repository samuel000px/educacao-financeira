// Simuladores e calculadoras. Todos os valores iniciais são EXEMPLOS HIPOTÉTICOS editáveis.
import { h, s, icone, brl, num, pct, compacto, aleatorio, normal, debounce } from './util.js';
import { grafico, barras } from './graficos.js';

const C1 = 'var(--s1)', C2 = 'var(--s2)', C3 = 'var(--s3)', C4 = 'var(--s4)';
const anual2mensal = (a) => Math.pow(1 + a, 1 / 12) - 1;
const anoX = (a) => (a === 0 ? 'Hoje' : `Ano ${a}`);
const mesX = (m) => (m === 0 ? 'Início' : `Mês ${m}`);

// ---------------------------------------------------------------------------
export const SIMULADORES = [
  {
    id: 'inflacao', titulo: 'Simulador de inflação', icone: 'carrinho',
    resumo: 'Veja quanto o dinheiro perde de poder de compra com o tempo e como calcular a inflação acumulada.',
    conceitos: ['Inflação', 'Poder de compra', 'Inflação acumulada', 'IPCA'],
    abas: [
      {
        id: 'poder', nome: 'Poder de compra',
        campos: [
          { id: 'valor', rotulo: 'Valor de hoje', min: 0, max: 100000, passo: 50, valor: 1000, unidade: 'R$' },
          { id: 'infl', rotulo: 'Inflação média ao ano', min: 0, max: 30, passo: 0.1, valor: 4.5, unidade: '% a.a.', ajuda: 'Valor de exemplo. Troque pelo cenário que quiser testar.' },
          { id: 'anos', rotulo: 'Período', min: 1, max: 40, passo: 1, valor: 10, unidade: 'anos' },
        ],
        premissas: ['A inflação é suposta constante todos os anos, o que não acontece na realidade: é um exercício para entender o efeito acumulado.', 'Fórmula: poder de compra = valor ÷ (1 + inflação)ⁿ.'],
        calcular(v) {
          const p = v.infl / 100, anos = [...Array(v.anos + 1).keys()];
          const poder = anos.map(a => v.valor / Math.pow(1 + p, a));
          const preco = anos.map(a => v.valor * Math.pow(1 + p, a));
          const acum = Math.pow(1 + p, v.anos) - 1;
          return {
            metricas: [
              { rot: `Poder de compra de ${brl(v.valor)} daqui a ${v.anos} anos`, val: brl(poder.at(-1)), destaque: true },
              { rot: 'Perda de poder de compra', val: pct(100 * (1 - 1 / (1 + acum)), 1), cls: 'neg' },
              { rot: 'Inflação acumulada no período', val: pct(100 * acum, 1) },
              { rot: `O que custa ${brl(v.valor)} hoje passará a custar`, val: brl(preco.at(-1)) },
            ],
            grafico: { x: anos, formatoX: anoX, nomeX: 'Ano', formatoY: compacto, formatoDica: brl, titulo: 'Poder de compra e preço ao longo dos anos',
              series: [
                { nome: `Poder de compra de ${brl(v.valor, true)}`, valores: poder, cor: C1, formatoDica: (x) => brl(x) },
                { nome: `Preço de algo que hoje custa ${brl(v.valor, true)}`, valores: preco, cor: C2, formatoDica: (x) => brl(x) },
              ] },
          };
        },
      },
      {
        id: 'acumulada', nome: 'Inflação acumulada',
        campos: [...Array(12)].map((_, i) => ({ id: 'm' + i, rotulo: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i], min: -2, max: 5, passo: 0.01,
          valor: [0.5, 0.4, 0.3, 0.4, 0.2, 0.3, 0.1, 0.2, 0.4, 0.3, 0.4, 0.5][i], unidade: '% no mês', compacto: true })),
        premissas: ['As taxas mensais iniciais são exemplos hipotéticos, não dados oficiais. Para valores reais, consulte o IPCA no IBGE (sidra.ibge.gov.br).', 'Inflação acumulada = (1 + m₁) × (1 + m₂) × … × (1 + m₁₂) − 1. Somar as taxas mensais subestima o resultado quando as taxas são positivas.'],
        calcular(v) {
          const m = [...Array(12)].map((_, i) => v['m' + i] / 100);
          let f = 1; const serie = [0], soma = [0]; let sm = 0;
          m.forEach((x) => { f *= 1 + x; sm += x; serie.push(100 * (f - 1)); soma.push(100 * sm); });
          const media = Math.pow(f, 1 / 12) - 1;
          return {
            metricas: [
              { rot: 'Inflação acumulada em 12 meses (correta, composta)', val: pct(serie.at(-1)), destaque: true },
              { rot: 'Soma simples das taxas (forma errada)', val: pct(soma.at(-1)) },
              { rot: 'Taxa mensal média equivalente', val: pct(100 * media, 3) },
              { rot: 'Uma cesta de R$ 100 passaria a custar', val: brl(100 * f) },
            ],
            grafico: { x: [...Array(13).keys()], formatoX: mesX, nomeX: 'Mês', formatoY: (y) => num(y, 1) + '%', titulo: 'Inflação acumulada mês a mês',
              series: [
                { nome: 'Acumulada (composta)', valores: serie, cor: C1, formatoDica: (y) => pct(y) },
                { nome: 'Soma simples', valores: soma, cor: C2, tracejada: true, formatoDica: (y) => pct(y) },
              ] },
          };
        },
      },
    ],
  },
  {
    id: 'juros-compostos', titulo: 'Simulador de juros compostos', icone: 'investidor',
    resumo: 'Capital inicial, aportes mensais, taxa e prazo: veja os juros sobre juros trabalhando.',
    conceitos: ['Juros compostos', 'Juros simples', 'Juros'],
    campos: [
      { id: 'capital', rotulo: 'Capital inicial', min: 0, max: 200000, passo: 100, valor: 1000, unidade: 'R$' },
      { id: 'aporte', rotulo: 'Aporte mensal', min: 0, max: 10000, passo: 10, valor: 200, unidade: 'R$' },
      { id: 'taxa', rotulo: 'Taxa de juros', min: 0, max: 30, passo: 0.1, valor: 10, unidade: '%' },
      { id: 'base', rotulo: 'A taxa é', tipo: 'select', valor: 'aa', opcoes: [['aa', 'ao ano'], ['am', 'ao mês']] },
      { id: 'anos', rotulo: 'Prazo', min: 1, max: 40, passo: 1, valor: 15, unidade: 'anos' },
      { id: 'simples', rotulo: 'Comparar com juros simples', tipo: 'check', valor: true },
    ],
    premissas: ['Taxa constante, capitalização mensal, aportes no fim de cada mês, sem impostos nem custos. Taxa anual convertida em mensal por (1 + a)^(1/12) − 1.', 'Valores de exemplo: não representam a rentabilidade de nenhum produto.'],
    calcular(v) {
      const im = v.base === 'am' ? v.taxa / 100 : anual2mensal(v.taxa / 100);
      const anos = [...Array(v.anos + 1).keys()];
      const investido = [], juros = [], simples = [];
      let saldo = v.capital, mes = 0;
      for (const a of anos) {
        while (mes < a * 12) { saldo = saldo * (1 + im) + v.aporte; mes++; }
        const inv = v.capital + v.aporte * 12 * a;
        investido.push(inv); juros.push(saldo - inv);
        // juros simples: cada depósito rende i por mês sobre o valor original
        const n = a * 12; let js = v.capital * (1 + im * n);
        for (let k = 1; k <= n; k++) js += v.aporte * (1 + im * (n - k));
        simples.push(js);
      }
      const final = investido.at(-1) + juros.at(-1);
      const taxaAnual = v.base === 'am' ? Math.pow(1 + v.taxa / 100, 12) - 1 : v.taxa / 100;
      const series = [
        { nome: 'Total investido', valores: investido, cor: C1, tipo: 'area', empilhar: true, formatoDica: brl },
        { nome: 'Juros acumulados', valores: juros, cor: C3, tipo: 'area', empilhar: true, formatoDica: brl },
      ];
      if (v.simples) series.push({ nome: 'Saldo com juros simples', valores: simples, cor: C2, tracejada: true, formatoDica: brl });
      return {
        metricas: [
          { rot: `Saldo após ${v.anos} anos`, val: brl(final), destaque: true },
          { rot: 'Total que você investiu', val: brl(investido.at(-1)) },
          { rot: 'Juros ganhos', val: brl(juros.at(-1)), cls: 'pos' },
          { rot: 'Parte do saldo que veio dos juros', val: final > 0 ? pct(100 * juros.at(-1) / final, 1) : '—' },
          { rot: 'Taxa equivalente', val: v.base === 'am' ? pct(100 * taxaAnual, 2) + ' a.a.' : pct(100 * im, 3) + ' a.m.' },
          { rot: 'Diferença para juros simples', val: brl(final - simples.at(-1)) },
        ],
        grafico: { x: anos, formatoX: anoX, nomeX: 'Ano', formatoY: compacto, titulo: 'Evolução do saldo', series },
      };
    },
  },
  {
    id: 'juros-reais', titulo: 'Simulador de juros reais', icone: 'escudo',
    resumo: 'Compare a rentabilidade nominal com a inflação e descubra o ganho real, depois do imposto.',
    conceitos: ['Juros reais', 'Juros nominais', 'Inflação'],
    campos: [
      { id: 'valor', rotulo: 'Valor aplicado', min: 100, max: 500000, passo: 100, valor: 10000, unidade: 'R$' },
      { id: 'nominal', rotulo: 'Rentabilidade nominal', min: 0, max: 30, passo: 0.1, valor: 12, unidade: '% a.a.' },
      { id: 'infl', rotulo: 'Inflação no período', min: 0, max: 30, passo: 0.1, valor: 4.5, unidade: '% a.a.' },
      { id: 'ir', rotulo: 'Imposto de renda sobre o ganho', tipo: 'select', valor: '15', opcoes: [['0', 'Isento (0%)'], ['15', '15%'], ['17.5', '17,5%'], ['20', '20%'], ['22.5', '22,5%']],
        ajuda: 'Alíquotas da tabela regressiva da renda fixa vigente quando este texto foi escrito. Confira a regra atual na Receita Federal.' },
      { id: 'anos', rotulo: 'Prazo', min: 1, max: 30, passo: 1, valor: 3, unidade: 'anos' },
    ],
    premissas: ['Equação de Fisher: (1 + juro real) = (1 + juro nominal) ÷ (1 + inflação). A aproximação "nominal − inflação" só funciona bem com taxas baixas.', 'O imposto é cobrado uma vez, no resgate, sobre o ganho nominal (simplificação). Taxas constantes e hipotéticas.'],
    calcular(v) {
      const i = v.nominal / 100, p = v.infl / 100, ir = Number(v.ir) / 100, t = v.anos;
      const bruto = v.valor * Math.pow(1 + i, t);
      const liquido = v.valor + (bruto - v.valor) * (1 - ir);
      const iLiq = Math.pow(liquido / v.valor, 1 / t) - 1;
      const real = (1 + iLiq) / (1 + p) - 1;
      const realBruto = (1 + i) / (1 + p) - 1;
      const anos = [...Array(t + 1).keys()];
      const manter = anos.map(a => v.valor * Math.pow(1 + p, a));
      const liq = anos.map(a => { const b = v.valor * Math.pow(1 + i, a); return v.valor + (b - v.valor) * (1 - ir); });
      const ganhoReal = liquido / Math.pow(1 + p, t) - v.valor;
      return {
        metricas: [
          { rot: 'Juro real líquido (ao ano)', val: pct(100 * real), destaque: true, cls: real < 0 ? 'neg' : 'pos' },
          { rot: 'Juro real antes do IR (Fisher)', val: pct(100 * realBruto) },
          { rot: 'Aproximação "nominal − inflação"', val: pct(v.nominal - v.infl) },
          { rot: `Ganho real em ${t} ${t === 1 ? 'ano' : 'anos'} (em reais de hoje)`, val: brl(ganhoReal), cls: ganhoReal < 0 ? 'neg' : 'pos' },
        ],
        barras: [
          { nome: 'Rentab. nominal', valor: 100 * i, cor: C1 },
          { nome: 'Líquida de IR', valor: 100 * iLiq, cor: C3 },
          { nome: 'Inflação', valor: 100 * p, cor: C2 },
          { nome: 'Ganho real', valor: 100 * real, cor: real < 0 ? 'var(--neg)' : 'var(--marca)' },
        ],
        formatoBarras: (x) => pct(x) + ' a.a.',
        grafico: { x: anos, formatoX: anoX, nomeX: 'Ano', formatoY: compacto, titulo: 'Seu dinheiro contra a inflação',
          series: [
            { nome: 'Saldo líquido de IR', valores: liq, cor: C1, formatoDica: brl },
            { nome: 'Valor para manter o poder de compra', valores: manter, cor: C2, tracejada: true, formatoDica: brl },
          ] },
      };
    },
  },
  {
    id: 'selic', titulo: 'Simulador da Selic', icone: 'governo',
    resumo: 'Compare dois cenários de Selic: rendimento da renda fixa, custo do crédito e os efeitos esperados na economia.',
    conceitos: ['Taxa Selic', 'Copom', 'CDI', 'Política monetária'],
    campos: [
      { id: 'selicA', rotulo: 'Selic no cenário A', min: 2, max: 25, passo: 0.25, valor: 10, unidade: '% a.a.' },
      { id: 'selicB', rotulo: 'Selic no cenário B', min: 2, max: 25, passo: 0.25, valor: 15, unidade: '% a.a.' },
      { id: 'infl', rotulo: 'Inflação esperada', min: 0, max: 20, passo: 0.1, valor: 4.5, unidade: '% a.a.' },
      { id: 'valor', rotulo: 'Valor investido (1 ano)', min: 100, max: 500000, passo: 100, valor: 10000, unidade: 'R$' },
      { id: 'cdb', rotulo: 'CDB rende quanto do CDI', min: 70, max: 130, passo: 1, valor: 100, unidade: '% do CDI' },
      { id: 'ir', rotulo: 'IR sobre o rendimento', min: 0, max: 22.5, passo: 2.5, valor: 17.5, unidade: '%', ajuda: '17,5% era a alíquota para prazos entre 361 e 720 dias na tabela vigente quando este texto foi escrito. Confira a regra atual.' },
      { id: 'divida', rotulo: 'Valor financiado', min: 1000, max: 200000, passo: 500, valor: 20000, unidade: 'R$' },
      { id: 'meses', rotulo: 'Prazo do financiamento', min: 6, max: 72, passo: 6, valor: 24, unidade: 'meses' },
      { id: 'spread', rotulo: 'Spread bancário (hipotético)', min: 0, max: 60, passo: 1, valor: 15, unidade: 'p.p. a.a.', ajuda: 'O que o banco cobra acima da Selic. Varia muito por modalidade e cliente.' },
    ],
    premissas: ['Hipóteses de simplificação: CDI = Selic − 0,10 p.p.; Tesouro Selic rende a Selic; a taxa do empréstimo = Selic + spread; parcelas fixas (tabela Price); taxas constantes por 1 ano.', 'Os efeitos na economia são as direções que a teoria econômica e o Banco Central descrevem para a política monetária. São tendências, não previsões, e aparecem com defasagem de vários meses.'],
    calcular(v) {
      const cen = (selic) => {
        const cdi = Math.max(0, selic - 0.1) / 100;
        const tesouro = v.valor * (selic / 100) * (1 - v.ir / 100);
        const cdb = v.valor * cdi * (v.cdb / 100) * (1 - v.ir / 100);
        const taxaEmp = (selic + v.spread) / 100, im = anual2mensal(taxaEmp);
        const parcela = im === 0 ? v.divida / v.meses : v.divida * im / (1 - Math.pow(1 + im, -v.meses));
        const realLiq = (1 + (selic / 100) * (1 - v.ir / 100)) / (1 + v.infl / 100) - 1;
        return { selic, tesouro, cdb, taxaEmp, parcela, total: parcela * v.meses, jurosPagos: parcela * v.meses - v.divida, realLiq };
      };
      const A = cen(v.selicA), B = cen(v.selicB);
      // papéis ARIA explícitos: no celular a tabela muda de formato por CSS e não pode perder a semântica
      const linha = (rot, f, fmt) => h('tr', { role: 'row' }, h('th', { scope: 'row', role: 'rowheader' }, rot), h('td', { role: 'cell' }, fmt(f(A))), h('td', { role: 'cell' }, fmt(f(B))), h('td', { role: 'cell' }, fmt(f(B) - f(A))));
      const tabela = h('table', { class: 'tabela-cenarios', role: 'table', 'aria-label': 'Comparação entre os cenários A e B' },
        h('thead', { role: 'rowgroup' }, h('tr', { role: 'row' }, h('td', { role: 'cell' }, ''), h('th', { scope: 'col', role: 'columnheader' }, `A · ${pct(v.selicA)}`), h('th', { scope: 'col', role: 'columnheader' }, `B · ${pct(v.selicB)}`), h('th', { scope: 'col', role: 'columnheader' }, 'B − A'))),
        h('tbody', { role: 'rowgroup' },
          linha('Rendimento líquido no Tesouro Selic (1 ano)', c => c.tesouro, brl),
          linha(`Rendimento líquido no CDB a ${v.cdb}% do CDI`, c => c.cdb, brl),
          linha('Juro real líquido da renda fixa', c => 100 * c.realLiq, x => pct(x)),
          linha('Taxa do financiamento', c => 100 * c.taxaEmp, x => pct(x) + ' a.a.'),
          linha(`Parcela (${v.meses}x)`, c => c.parcela, brl),
          linha('Juros pagos no financiamento', c => c.jurosPagos, brl)));
      const d = Math.sign(v.selicB - v.selicA);
      const seta = (sinal) => (sinal > 0 ? ['↑', 'sobe'] : sinal < 0 ? ['↓', 'desce'] : ['→', 'neutro']);
      const canais = [
        ['Custo do crédito', 'banco', d, 'Empréstimos e financiamentos ficam mais caros e mais difíceis de conseguir.', 'Crédito fica mais barato e mais fácil.'],
        ['Consumo', 'carrinho', -d, 'Famílias tendem a adiar compras, principalmente as parceladas.', 'Famílias tendem a comprar mais a prazo.'],
        ['Investimento das empresas', 'fabrica', -d, 'Projetos novos precisam render mais que os juros para valer a pena.', 'Mais projetos passam a compensar.'],
        ['Renda fixa', 'investidor', d, 'Aplicações atreladas à Selic e ao CDI rendem mais.', 'Aplicações atreladas à Selic rendem menos.'],
        ['Bolsa de valores', 'mercado', -d, 'Lucros futuros valem menos hoje e a renda fixa compete com as ações.', 'Ações tendem a ficar mais atrativas.'],
        ['Valor do real', 'globo', d, 'Juros maiores tendem a atrair capital estrangeiro e fortalecer o real, se o resto ficar igual.', 'O real tende a perder força, se o resto ficar igual.'],
        ['Inflação', 'aviso', -d, 'Tende a desacelerar com defasagem, pela demanda menor e pelas expectativas.', 'Pode acelerar se a demanda crescer mais que a oferta.'],
        ['Custo da dívida pública', 'governo', d, 'O custo dos títulos atrelados à Selic aumenta.', 'O custo dos títulos atrelados à Selic diminui.'],
      ];
      const painel = h('div', null,
        h('h4', { class: 'subtema-titulo' }, d === 0 ? 'Os dois cenários têm a mesma Selic' : `Efeitos esperados de uma Selic ${d > 0 ? 'mais alta' : 'mais baixa'} no cenário B`),
        h('div', { class: 'canais' }, canais.map(([nome, ic, sinal, txtAlta, txtBaixa]) => {
          const [sim, cls] = seta(d === 0 ? 0 : sinal);
          return h('div', { class: 'canal' }, h('b', null, icone(ic), nome, h('span', { class: 'direcao ' + cls }, h('span', { 'aria-hidden': 'true' }, sim), h('span', { class: 'vh' }, cls === 'sobe' ? ' (tende a subir)' : cls === 'desce' ? ' (tende a cair)' : ' (sem mudança)'))),
            h('p', null, d === 0 ? 'Sem diferença entre os cenários.' : d > 0 ? txtAlta : txtBaixa));
        })));
      // curva: rendimento x juros pagos conforme a Selic
      const xs = []; for (let x = 2; x <= 25; x += 0.5) xs.push(x);
      const cs = xs.map(cen);
      return {
        metricas: [
          { rot: 'Rendimento líquido no Tesouro Selic, cenário B', val: brl(B.tesouro), destaque: true },
          { rot: 'Diferença na parcela do financiamento (B − A)', val: brl(B.parcela - A.parcela) },
          { rot: 'Juro real líquido no cenário B', val: pct(100 * B.realLiq), cls: B.realLiq < 0 ? 'neg' : 'pos' },
        ],
        extraAntes: h('div', { class: 'rolagem-x' }, tabela),
        grafico: { x: xs, formatoX: (x) => num(x, 1) + '%', nomeX: 'Selic', rotuloX: 'Selic (% a.a.)', formatoY: compacto, titulo: 'Rendimento e custo do crédito conforme a Selic',
          series: [
            { nome: `Rendimento líquido de ${brl(v.valor, true)} em 1 ano`, valores: cs.map(c => c.tesouro), cor: C1, formatoDica: brl },
            { nome: `Juros pagos ao financiar ${brl(v.divida, true)}`, valores: cs.map(c => c.jurosPagos), cor: C2, formatoDica: brl },
          ] },
        extra: painel,
      };
    },
  },
  {
    id: 'cambio', titulo: 'Simulador de câmbio', icone: 'globo',
    resumo: 'Veja como a variação do dólar mexe com importadores, exportadores e a inflação.',
    conceitos: ['Taxa de câmbio', 'Dólar', 'Balança comercial', 'Inflação'],
    campos: [
      { id: 'c0', rotulo: 'Dólar antes', min: 2, max: 10, passo: 0.01, valor: 5, unidade: 'R$/US$' },
      { id: 'c1', rotulo: 'Dólar depois', min: 2, max: 10, passo: 0.01, valor: 5.5, unidade: 'R$/US$' },
      { id: 'precoUS', rotulo: 'Preço do produto importado', min: 1, max: 5000, passo: 1, valor: 100, unidade: 'US$' },
      { id: 'local', rotulo: 'Custos locais sobre o importado', min: 0, max: 200, passo: 1, valor: 60, unidade: '%', ajuda: 'Frete, tributos e margem do varejo, em % do custo convertido (hipotético).' },
      { id: 'receita', rotulo: 'Receita mensal do exportador', min: 1000, max: 1000000, passo: 1000, valor: 20000, unidade: 'US$' },
      { id: 'custo', rotulo: 'Custos mensais do exportador', min: 0, max: 5000000, passo: 1000, valor: 80000, unidade: 'R$', ajuda: 'Salários, aluguel e insumos pagos em reais.' },
      { id: 'repasse', rotulo: 'Repasse do câmbio à inflação', min: 0, max: 50, passo: 1, valor: 10, unidade: '%', ajuda: 'Quanto da alta do dólar chega ao índice de preços. Valor HIPOTÉTICO: as estimativas variam com o período e o método.' },
    ],
    premissas: ['Tudo o mais constante: o preço em dólar do produto e os custos do exportador não mudam.', 'O repasse cambial (pass-through) real depende da atividade econômica, das expectativas e do tipo de produto. O número usado aqui é só para ilustrar o mecanismo.'],
    calcular(v) {
      const varc = v.c1 / v.c0 - 1;
      const p0 = v.precoUS * v.c0 * (1 + v.local / 100), p1 = v.precoUS * v.c1 * (1 + v.local / 100);
      const r0 = v.receita * v.c0, r1 = v.receita * v.c1;
      const l0 = r0 - v.custo, l1 = r1 - v.custo;
      const imp = 100 * varc * (v.repasse / 100);
      return {
        metricas: [
          { rot: varc >= 0 ? 'Alta do dólar (real se desvalorizou)' : 'Queda do dólar (real se valorizou)', val: pct(100 * varc, 1), destaque: true },
          { rot: 'Preço final do importado', val: `${brl(p0)} → ${brl(p1)}` },
          { rot: 'Lucro mensal do exportador', val: `${compacto(l0)} → ${compacto(l1)}`, cls: l1 >= l0 ? 'pos' : 'neg' },
          { rot: 'Efeito estimado na inflação', val: (imp >= 0 ? '+' : '') + num(imp, 2) + ' p.p.' },
        ],
        barras: [
          { nome: 'Importado antes', valor: p0, cor: C2 }, { nome: 'Importado depois', valor: p1, cor: C2 },
          { nome: 'Receita export. antes', valor: r0, cor: C1 }, { nome: 'Receita export. depois', valor: r1, cor: C1 },
        ],
        formatoBarras: compacto,
        texto: [
          varc > 0
            ? 'Com o dólar mais caro, produtos e insumos importados encarecem em reais, o que pressiona a inflação. Já o exportador recebe mais reais por cada dólar vendido e ganha competitividade.'
            : varc < 0 ? 'Com o dólar mais barato, importados ficam mais baratos em reais, o que alivia a inflação. O exportador recebe menos reais por dólar e perde margem.' : 'Sem variação cambial, nada muda.',
          'No agregado, uma moeda mais fraca tende a estimular exportações e desestimular importações, afetando a balança comercial, mas com defasagem.',
        ],
      };
    },
  },
  {
    id: 'investimentos', titulo: 'Simulador de investimentos', icone: 'mercado',
    resumo: 'Compare renda fixa e renda variável com premissas explícitas e veja a faixa de resultados possíveis.',
    conceitos: ['Risco e retorno', 'Volatilidade', 'Renda fixa', 'Ações', 'Diversificação'],
    campos: [
      { id: 'inicial', rotulo: 'Valor inicial', min: 0, max: 500000, passo: 500, valor: 10000, unidade: 'R$' },
      { id: 'aporte', rotulo: 'Aporte mensal', min: 0, max: 20000, passo: 50, valor: 300, unidade: 'R$' },
      { id: 'anos', rotulo: 'Prazo', min: 1, max: 30, passo: 1, valor: 10, unidade: 'anos' },
      { id: 'rf', rotulo: 'Renda fixa: taxa', min: 0, max: 25, passo: 0.1, valor: 11, unidade: '% a.a.' },
      { id: 'rv', rotulo: 'Renda variável: retorno médio', min: -10, max: 30, passo: 0.5, valor: 13, unidade: '% a.a.', ajuda: 'Suposição sua. Retornos passados não garantem retornos futuros.' },
      { id: 'vol', rotulo: 'Renda variável: volatilidade', min: 0, max: 60, passo: 1, valor: 22, unidade: '% a.a.', ajuda: 'O quanto o retorno oscila. Ações costumam oscilar bem mais que a renda fixa.' },
      { id: 'ir', rotulo: 'IR sobre o ganho (os dois)', min: 0, max: 22.5, passo: 2.5, valor: 15, unidade: '%' },
    ],
    premissas: ['Renda fixa: taxa constante, sem risco de crédito, com IR cobrado no resgate. Renda variável: 1.000 trajetórias simuladas com retornos mensais aleatórios (distribuição lognormal) que têm a média e a volatilidade informadas.', 'Não inclui custos, taxas, dividendos reinvestidos nem tributação detalhada. É um modelo didático, não uma previsão nem uma recomendação de investimento.'],
    calcular(v) {
      const meses = v.anos * 12, rng = aleatorio(20261110);
      const im = anual2mensal(v.rf / 100);
      const mu = Math.log(1 + v.rv / 100) / 12, sg = (v.vol / 100) / Math.sqrt(12);
      const N = 1000, porAno = [...Array(v.anos + 1)].map(() => []);
      for (let k = 0; k < N; k++) {
        let s = v.inicial; porAno[0].push(s);
        for (let m = 1; m <= meses; m++) { s = s * Math.exp(mu - sg * sg / 2 + sg * normal(rng)) + v.aporte; if (m % 12 === 0) porAno[m / 12].push(s); }
      }
      const investido = (a) => v.inicial + v.aporte * 12 * a;
      const liq = (bruto, a) => { const g = bruto - investido(a); return g > 0 ? bruto - g * v.ir / 100 : bruto; };
      const q = (arr, p) => { const o = arr.slice().sort((a, b) => a - b); return o[Math.min(o.length - 1, Math.floor(p * o.length))]; };
      const anos = [...Array(v.anos + 1).keys()];
      const rf = anos.map(a => { let s = v.inicial; for (let m = 0; m < a * 12; m++) s = s * (1 + im) + v.aporte; return liq(s, a); });
      const p10 = anos.map(a => liq(q(porAno[a], 0.10), a)), p50 = anos.map(a => liq(q(porAno[a], 0.5), a)), p90 = anos.map(a => liq(q(porAno[a], 0.90), a));
      const prob = porAno[v.anos].filter(x => liq(x, v.anos) > rf.at(-1)).length / N;
      return {
        metricas: [
          { rot: 'Renda fixa ao final (líquido)', val: brl(rf.at(-1)), destaque: true },
          { rot: 'Renda variável: resultado mediano', val: brl(p50.at(-1)) },
          { rot: 'Renda variável: 10% piores cenários abaixo de', val: brl(p10.at(-1)), cls: 'neg' },
          { rot: 'Renda variável: 10% melhores cenários acima de', val: brl(p90.at(-1)), cls: 'pos' },
          { rot: 'Chance de a renda variável superar a fixa', val: pct(100 * prob, 0) },
          { rot: 'Total investido', val: brl(investido(v.anos)) },
        ],
        grafico: { x: anos, formatoX: anoX, nomeX: 'Ano', formatoY: compacto, titulo: 'Renda fixa e faixa de resultados da renda variável',
          faixa: { nome: 'Renda variável: 80% dos cenários', inferior: p10, superior: p90, cor: C2 },
          series: [
            { nome: 'Renda fixa', valores: rf, cor: C1, formatoDica: brl },
            { nome: 'Renda variável (mediana)', valores: p50, cor: C2, formatoDica: brl },
            { nome: 'Total investido', valores: anos.map(investido), cor: 'var(--tinta-3)', tracejada: true, formatoDica: brl },
          ] },
      };
    },
  },
  {
    id: 'reserva', titulo: 'Calculadora de reserva de emergência', icone: 'escudo',
    resumo: 'Quanto guardar para imprevistos e em quanto tempo você chega lá.',
    conceitos: ['Reserva de emergência', 'Orçamento pessoal', 'Liquidez'],
    campos: [
      { id: 'gastos', rotulo: 'Gastos essenciais por mês', min: 100, max: 50000, passo: 50, valor: 2500, unidade: 'R$', ajuda: 'Moradia, alimentação, transporte, contas, saúde.' },
      { id: 'meses', rotulo: 'Meses de cobertura', min: 1, max: 24, passo: 1, valor: 6, unidade: 'meses', ajuda: 'Materiais de educação financeira costumam sugerir de 3 a 6 meses para renda estável e mais para renda variável.' },
      { id: 'tem', rotulo: 'Quanto você já tem guardado', min: 0, max: 500000, passo: 50, valor: 1000, unidade: 'R$' },
      { id: 'guarda', rotulo: 'Quanto consegue guardar por mês', min: 0, max: 20000, passo: 10, valor: 300, unidade: 'R$' },
      { id: 'taxa', rotulo: 'Rendimento líquido da aplicação', min: 0, max: 20, passo: 0.1, valor: 8, unidade: '% a.a.', ajuda: 'Use uma aplicação segura e de resgate rápido. Valor hipotético.' },
    ],
    premissas: ['Rendimento constante e aportes no fim de cada mês. Valores hipotéticos e editáveis.', 'A reserva deve ficar em aplicação de baixo risco e com liquidez diária, não em ações nem em investimentos com carência.'],
    calcular(v) {
      const meta = v.gastos * v.meses, im = anual2mensal(v.taxa / 100);
      let s = v.tem, m = 0; const serie = [s];
      while (s < meta && m < 600) { s = s * (1 + im) + v.guarda; m++; serie.push(s); }
      const atinge = s >= meta;
      const n = Math.max(serie.length, 2);
      const x = [...Array(n).keys()];
      return {
        metricas: [
          { rot: 'Sua meta de reserva', val: brl(meta), destaque: true },
          { rot: 'Quanto falta', val: brl(Math.max(0, meta - v.tem)) },
          { rot: 'Tempo até a meta', val: v.tem >= meta ? 'Meta atingida!' : atinge ? `${m} ${m === 1 ? 'mês' : 'meses'} (${num(m / 12, 1)} anos)` : 'Mais de 50 anos: aumente o valor guardado', cls: atinge ? 'pos' : 'neg' },
          { rot: 'Cobertura atual', val: num(v.tem / v.gastos, 1) + ' meses de gastos' },
        ],
        grafico: { x, formatoX: mesX, nomeX: 'Mês', formatoY: compacto, titulo: 'Caminho até a reserva',
          series: [
            { nome: 'Reserva acumulada', valores: x.map(i => serie[Math.min(i, serie.length - 1)]), cor: C3, tipo: 'area', opacidade: .35, formatoDica: brl },
            { nome: 'Meta', valores: x.map(() => meta), cor: C2, tracejada: true, formatoDica: brl },
          ] },
      };
    },
  },
  {
    id: 'divida', titulo: 'Calculadora do custo de uma dívida', icone: 'aviso',
    resumo: 'Quanto tempo e quanto dinheiro custa quitar uma dívida, como a do cartão de crédito. Apoio ao “PB sem dívidas”.',
    conceitos: ['Endividamento', 'Custo Efetivo Total (CET)', 'Juros compostos', 'Inadimplência'],
    campos: [
      { id: 'saldo', rotulo: 'Valor da dívida hoje', min: 100, max: 200000, passo: 50, valor: 3000, unidade: 'R$' },
      { id: 'taxa', rotulo: 'Juros da dívida', min: 0, max: 20, passo: 0.1, valor: 8, unidade: '% ao mês', ajuda: 'Veja a taxa no contrato ou na fatura. Peça sempre o CET.' },
      { id: 'p1', rotulo: 'Pagamento mensal (plano 1)', min: 10, max: 20000, passo: 10, valor: 300, unidade: 'R$' },
      { id: 'p2', rotulo: 'Pagamento mensal (plano 2)', min: 10, max: 20000, passo: 10, valor: 500, unidade: 'R$' },
    ],
    premissas: ['Juros compostos mensais sobre o saldo, pagamento fixo no fim do mês, sem novas compras, multas ou encargos extras. Taxa hipotética.', 'Se o pagamento for menor ou igual aos juros do mês, a dívida não diminui. Em caso de dificuldade, procure renegociar e compare o CET das propostas.'],
    calcular(v) {
      const i = v.taxa / 100;
      const plano = (p) => {
        const nunca = p <= v.saldo * i + 1e-9, lim = nunca ? 60 : 360;
        let s = v.saldo, m = 0, pago = 0; const serie = [s];
        while (s > 0.005 && m < lim) { s *= 1 + i; const pg = Math.min(p, s); s -= pg; pago += pg; m++; serie.push(s); }
        return { m, pago, serie, quita: s <= 0.005 };
      };
      const A = plano(v.p1), B = plano(v.p2);
      const n = Math.min(Math.max(A.serie.length, B.serie.length), 361);
      const x = [...Array(n).keys()];
      const val = (P, k) => (k < P.serie.length ? P.serie[k] : P.quita ? 0 : P.serie.at(-1));
      const desc = (P) => (P.quita ? `${P.m} meses · juros ${brl(P.pago - v.saldo)}` : 'Nunca quita: o pagamento não cobre os juros');
      return {
        metricas: [
          { rot: 'Taxa equivalente ao ano', val: pct(100 * (Math.pow(1 + i, 12) - 1), 1), destaque: true, cls: 'neg' },
          { rot: `Plano 1: pagando ${brl(v.p1)}/mês`, val: desc(A), cls: A.quita ? '' : 'neg' },
          { rot: `Plano 2: pagando ${brl(v.p2)}/mês`, val: desc(B), cls: B.quita ? '' : 'neg' },
          { rot: 'Economia do plano 2 em juros', val: A.quita && B.quita ? brl(A.pago - B.pago) : '—', cls: A.quita && B.quita ? (A.pago - B.pago >= 0 ? 'pos' : 'neg') : '' },
        ],
        grafico: { x, formatoX: mesX, nomeX: 'Mês', formatoY: compacto, titulo: 'Saldo devedor ao longo do tempo',
          series: [
            { nome: `Plano 1 (${brl(v.p1, true)}/mês)`, valores: x.map(k => val(A, k)), cor: C2, formatoDica: brl },
            { nome: `Plano 2 (${brl(v.p2, true)}/mês)`, valores: x.map(k => val(B, k)), cor: C1, formatoDica: brl },
          ] },
      };
    },
  },
  {
    id: 'oferta-demanda', titulo: 'Oferta e demanda interativa', icone: 'grafico',
    resumo: 'Desloque as curvas de oferta e demanda e veja o novo preço e a nova quantidade de equilíbrio.',
    conceitos: ['Oferta e demanda', 'Equilíbrio de mercado', 'Elasticidade', 'Bens substitutos e complementares'],
    campos: [
      { id: 'dd', rotulo: 'Deslocamento da demanda', min: -50, max: 50, passo: 1, valor: 0, unidade: 'unid.', ajuda: 'Positivo: mais compradores a cada preço (renda maior, moda, substituto mais caro).' },
      { id: 'ds', rotulo: 'Deslocamento da oferta', min: -50, max: 50, passo: 1, valor: 0, unidade: 'unid.', ajuda: 'Positivo: mais produção a cada preço (tecnologia, insumo mais barato).' },
      { id: 'b', rotulo: 'Sensibilidade da demanda ao preço', min: 0.5, max: 6, passo: 0.1, valor: 2, unidade: 'unid./R$', ajuda: 'Maior = demanda mais elástica (consumidor reage mais ao preço).' },
      { id: 'd', rotulo: 'Sensibilidade da oferta ao preço', min: 0.5, max: 6, passo: 0.1, valor: 1.5, unidade: 'unid./R$' },
    ],
    cenarios: [
      ['Renda das famílias aumenta', { dd: 30, ds: 0 }], ['Insumos ficam mais caros', { dd: 0, ds: -30 }],
      ['Nova tecnologia', { dd: 0, ds: 30 }], ['Substituto fica mais barato', { dd: -25, ds: 0 }], ['Voltar ao início', { dd: 0, ds: 0 }],
    ],
    premissas: ['Modelo linear e didático de um mercado hipotético: demanda Qd = 100 + desloc. − b·P; oferta Qs = 10 + desloc. + d·P.', 'Equilíbrio onde Qd = Qs: P* = (90 + desloc.demanda − desloc.oferta) ÷ (b + d).'],
    calcular(v) {
      // com preço zero ainda pode sobrar oferta: vende-se o menor entre o ofertado e o demandado
      const eq = (dd, ds) => { const P = Math.max(0, (90 + dd - ds) / (v.b + v.d)); return { P, Q: Math.max(0, Math.min(10 + ds + v.d * P, 100 + dd - v.b * P)) }; };
      const E0 = eq(0, 0), E1 = eq(v.dd, v.ds);
      const maiorP = Math.max(E0.P, E1.P);
      const passoP = maiorP <= 56 ? 10 : maiorP <= 130 ? 20 : 50;
      const W = 560, H = 360, m = { l: 52, r: 16, t: 26, b: 40 }, Pm = Math.max(70, Math.ceil((maiorP * 1.2) / passoP) * passoP), Qm = 170;
      const X = (q) => m.l + (q / Qm) * (W - m.l - m.r), Y = (p) => H - m.b - (p / Pm) * (H - m.t - m.b);
      const reta = (f, cls, cor, tr) => { const pts = []; for (let k = 0; k <= 140; k++) { const p = (Pm * k) / 140, q = f(p); if (q >= 0 && q <= Qm) pts.push(`${X(q).toFixed(1)},${Y(p).toFixed(1)}`); } return s('polyline', { points: pts.join(' '), fill: 'none', style: `stroke:${cor};stroke-width:${tr ? 1.5 : 2.5}`, 'stroke-dasharray': tr ? '5 5' : null, opacity: tr ? .6 : 1 }); };
      const g = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Gráfico de oferta e demanda. Equilíbrio inicial: preço ${num(E0.P, 1)}, quantidade ${num(E0.Q, 0)}. Novo equilíbrio: preço ${num(E1.P, 1)}, quantidade ${num(E1.Q, 0)}.` });
      const eixo = s('g', { class: 'eixo' });
      for (let p = 0; p <= Pm; p += passoP) { eixo.append(s('line', { class: 'grade-linha', x1: m.l, x2: W - m.r, y1: Y(p), y2: Y(p) }), s('text', { x: m.l - 8, y: Y(p) + 4, 'text-anchor': 'end' }, 'R$ ' + p)); }
      for (let q = 0; q <= Qm; q += 30) eixo.append(s('text', { x: X(q), y: H - m.b + 18, 'text-anchor': 'middle' }, q));
      eixo.append(s('text', { x: W - m.r, y: H - 4, 'text-anchor': 'end' }, 'Quantidade'), s('text', { x: 4, y: 11 }, 'Preço'));
      g.append(eixo);
      const mudou = v.dd !== 0 || v.ds !== 0;
      if (mudou) { g.append(reta(p => 100 - v.b * p, '', C1, true), reta(p => 10 + v.d * p, '', C2, true)); }
      g.append(reta(p => 100 + v.dd - v.b * p, '', C1), reta(p => 10 + v.ds + v.d * p, '', C2));
      const guia = (E, cor) => [s('line', { x1: m.l, x2: X(E.Q), y1: Y(E.P), y2: Y(E.P), class: 'mira', style: `stroke:${cor}` }), s('line', { x1: X(E.Q), x2: X(E.Q), y1: Y(E.P), y2: H - m.b, class: 'mira', style: `stroke:${cor}` })];
      if (mudou) g.append(...guia(E0, 'var(--tinta-3)'), s('circle', { cx: X(E0.Q), cy: Y(E0.P), r: 5, style: 'fill:var(--superficie);stroke:var(--tinta-3);stroke-width:2' }));
      g.append(...guia(E1, 'var(--tinta)'), s('circle', { cx: X(E1.Q), cy: Y(E1.P), r: 7, style: 'fill:var(--marca);stroke:var(--superficie);stroke-width:2' }));
      // rótulos das curvas: demanda perto do eixo das quantidades, oferta no alto, sempre dentro do gráfico
      const pD = Pm * 0.06, pS = Math.min(Pm * 0.9, Math.max(Pm * 0.3, (Qm - 12 - 10 - v.ds) / v.d));
      const dentro = (q) => Math.max(40, Math.min(Qm - 5, q));
      g.append(s('text', { x: X(dentro(100 + v.dd - v.b * pD)), y: Y(pD) - 6, style: 'fill:var(--s1);font:700 13px var(--sans)', 'text-anchor': 'end' }, 'Demanda'));
      g.append(s('text', { x: X(dentro(10 + v.ds + v.d * pS)), y: Y(pS) - 6, style: 'fill:var(--s2);font:700 13px var(--sans)', 'text-anchor': 'end' }, 'Oferta'));
      const dP = E1.P - E0.P, dQ = E1.Q - E0.Q;
      const sentido = (x) => (Math.abs(x) < 0.05 ? 'fica igual' : x > 0 ? 'sobe' : 'cai');
      return {
        metricas: [
          { rot: 'Preço de equilíbrio', val: `R$ ${num(E1.P, 2)}`, destaque: true },
          { rot: 'Quantidade de equilíbrio', val: num(E1.Q, 1) + ' unid.' },
          { rot: 'Variação do preço', val: (dP >= 0 ? '+' : '') + pct(E0.P ? 100 * dP / E0.P : 0, 1) },
          { rot: 'Variação da quantidade', val: (dQ >= 0 ? '+' : '') + pct(E0.Q ? 100 * dQ / E0.Q : 0, 1) },
        ],
        extraAntes: h('div', { class: 'grafico' }, h('ul', { class: 'legenda' }, h('li', null, h('i', { style: 'background:var(--s1)' }), 'Demanda'), h('li', null, h('i', { style: 'background:var(--s2)' }), 'Oferta'), mudou ? h('li', null, h('i', { class: 'tracejada', style: 'border-color:var(--tinta-3)' }), 'Curvas iniciais') : null), g),
        texto: [mudou ? `Resultado: o preço ${sentido(dP)} e a quantidade ${sentido(dQ)}. ${v.dd > 0 && v.ds === 0 ? 'Mais demanda com a mesma oferta empurra preço e quantidade para cima.' : v.ds < 0 && v.dd === 0 ? 'Oferta menor (custos maiores) encarece o produto e reduz a quantidade vendida: é a lógica da inflação de custos.' : v.ds > 0 && v.dd === 0 ? 'Mais oferta barateia o produto e aumenta a quantidade vendida.' : v.dd < 0 && v.ds === 0 ? 'Menos demanda derruba preço e quantidade.' : 'Quando as duas curvas mudam, o efeito final depende de qual deslocamento é maior.'}` : 'Mova os controles ou escolha um cenário para deslocar as curvas.'],
      };
    },
  },
  {
    id: 'valuation', titulo: 'Calculadora de indicadores de empresas', icone: 'fabrica',
    resumo: 'LPA, VPA, P/L, P/VP, ROE, ROIC e dividend yield de uma empresa hipotética, com seus próprios números.',
    conceitos: ['P/L', 'P/VP', 'ROE', 'ROIC', 'LPA', 'VPA', 'Dividendos', 'Valuation'],
    campos: [
      { id: 'preco', rotulo: 'Preço da ação', min: 0.1, max: 500, passo: 0.1, valor: 30, unidade: 'R$' },
      { id: 'acoes', rotulo: 'Número de ações', min: 1, max: 20000, passo: 1, valor: 200, unidade: 'milhões' },
      { id: 'lucro', rotulo: 'Lucro líquido (12 meses)', min: -5000, max: 50000, passo: 10, valor: 500, unidade: 'R$ mi' },
      { id: 'pl', rotulo: 'Patrimônio líquido', min: 1, max: 200000, passo: 10, valor: 4000, unidade: 'R$ mi' },
      { id: 'div', rotulo: 'Dividendos e JCP pagos (12 meses)', min: 0, max: 50000, passo: 10, valor: 150, unidade: 'R$ mi' },
      { id: 'ebit', rotulo: 'Lucro operacional (EBIT)', min: -5000, max: 80000, passo: 10, valor: 800, unidade: 'R$ mi' },
      { id: 'aliq', rotulo: 'Alíquota de impostos sobre o lucro', min: 0, max: 40, passo: 1, valor: 34, unidade: '%' },
      { id: 'capital', rotulo: 'Capital investido (PL + dívida líquida)', min: 1, max: 300000, passo: 10, valor: 5000, unidade: 'R$ mi' },
    ],
    premissas: ['Empresa hipotética. Os números vêm das demonstrações financeiras (DFP e ITR, disponíveis na CVM e no site de relações com investidores).', 'Indicadores devem ser comparados com empresas do mesmo setor e ao longo do tempo. Nenhum número isolado diz se uma ação está "barata" ou "cara".'],
    calcular(v) {
      const lpa = v.lucro / v.acoes, vpa = v.pl / v.acoes, vm = v.preco * v.acoes;
      const nopat = v.ebit * (1 - v.aliq / 100);
      return {
        metricas: [
          { rot: 'LPA (lucro por ação)', val: brl(lpa) },
          { rot: 'VPA (valor patrimonial por ação)', val: brl(vpa) },
          { rot: 'P/L', val: lpa > 0 ? num(v.preco / lpa, 1) + 'x' : 'n/a (prejuízo)', destaque: true },
          { rot: 'P/VP', val: num(v.preco / vpa, 2) + 'x' },
          { rot: 'ROE', val: pct(100 * v.lucro / v.pl, 1) },
          { rot: 'ROIC', val: pct(100 * nopat / v.capital, 1) },
          { rot: 'Dividend yield', val: pct(100 * v.div / vm, 2) },
          { rot: 'Payout', val: v.lucro > 0 ? pct(100 * v.div / v.lucro, 0) : '—' },
          { rot: 'Valor de mercado', val: compacto(vm * 1e6) },
        ],
        texto: [
          lpa > 0 ? `P/L de ${num(v.preco / lpa, 1)}x: o mercado paga R$ ${num(v.preco / lpa, 1)} por cada R$ 1 de lucro anual. Se o lucro ficasse constante, levaria cerca de ${num(v.preco / lpa, 0)} anos para "devolver" o preço pago.` : 'Com prejuízo, o P/L não tem interpretação útil.',
          `ROE de ${pct(100 * v.lucro / v.pl, 1)}: cada R$ 100 do capital dos sócios gerou ${brl(v.lucro / v.pl * 100)} de lucro no ano. Vale comparar com o custo do capital e com o juro da renda fixa.`,
        ],
      };
    },
  },
];

export const porId = new Map(SIMULADORES.map(x => [x.id, x]));

// ---------------------------------------------------------------------------
// Montagem da interface de um simulador
let contador = 0;
export function montarSimulador(def, alvo, { nivelTitulo = 'h2' } = {}) {
  const uid = 'sim' + (++contador);
  const caixa = h('section', { class: 'sim', 'aria-labelledby': uid + '-t' });
  caixa.append(h('div', { class: 'sim-cabeca' }, h('div', { class: 'icone-cartao' }, icone(def.icone)),
    h('div', null, h(nivelTitulo, { id: uid + '-t' }, def.titulo), h('p', null, def.resumo))));
  const abas = def.abas || [def];
  let abaAtual = 0;
  const corpoAba = h('div', { id: uid + '-p' });
  // resumo falado para leitores de tela: só o resultado principal, depois que a pessoa para de mexer
  const anuncio = h('p', { class: 'vh', role: 'status' });
  const anunciar = debounce((txt) => { anuncio.textContent = txt; }, 700);
  if (abas.length > 1) {
    const lista = h('div', { class: 'sim-abas', role: 'tablist', 'aria-label': 'Modos do simulador' });
    const trocar = (i, focar) => {
      abaAtual = i;
      [...lista.children].forEach((b, k) => { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
      render(); if (focar) lista.children[i].focus();
    };
    abas.forEach((a, i) => lista.append(h('button', { type: 'button', role: 'tab', id: `${uid}-a${i}`, 'aria-selected': i === 0 ? 'true' : 'false', 'aria-controls': uid + '-p', tabindex: i === 0 ? '0' : '-1',
      onclick: () => trocar(i),
      onkeydown: (e) => {
        const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: abas.length - 1 }[e.key];
        if (n !== undefined) { e.preventDefault(); trocar((n + abas.length) % abas.length, true); }
      } }, a.nome)));
    caixa.append(lista);
    corpoAba.setAttribute('role', 'tabpanel');
  }
  caixa.append(corpoAba, anuncio);
  alvo.append(caixa);

  const iniciais = () => abas.map(a => Object.fromEntries((a.campos || []).map(c => [c.id, c.valor])));
  const valores = iniciais();
  function render(focar) {
    const a = abas[abaAtual], val = valores[abaAtual];
    if (abas.length > 1) corpoAba.setAttribute('aria-labelledby', `${uid}-a${abaAtual}`);
    const entradas = h('div', { class: 'sim-entradas' + (a.campos.every(c => c.compacto) ? ' compactas' : '') });
    const saidas = h('div', { class: 'sim-saidas' });
    const atualizar = () => desenharSaida(a, val, saidas, anunciar);
    for (const c of a.campos) entradas.append(campo(c, val, atualizar, uid));
    const restaurar = h('button', { type: 'button', class: 'botao secundario pequeno', onclick: () => { Object.assign(val, iniciais()[abaAtual]); render('.restaurar button'); } }, 'Restaurar valores do exemplo');
    const cenarios = def.cenarios ? h('div', { class: 'campo-sim linha-inteira' }, h('span', { class: 'rotulo-campo', id: uid + '-cen' }, 'Cenários prontos'),
      h('div', { class: 'cenarios-botoes', role: 'group', 'aria-labelledby': uid + '-cen' }, def.cenarios.map(([nome, vs], k) =>
        h('button', { type: 'button', class: 'chip', onclick: () => { Object.assign(val, vs); render(`.cenarios-botoes button:nth-child(${k + 1})`); } }, nome)))) : null;
    if (cenarios) entradas.append(cenarios);
    entradas.append(h('div', { class: 'restaurar linha-inteira' }, restaurar));
    corpoAba.replaceChildren(h('div', { class: 'sim-corpo' }, entradas, saidas));
    atualizar();
    if (focar) corpoAba.querySelector(focar)?.focus(); // devolve o foco ao botão usado (a área foi redesenhada)
  }
  render();
  return caixa;
}

function campo(c, val, aoMudar, uid) {
  const id = `${uid}-${c.id}`;
  const ajuda = c.ajuda ? h('small', { id: id + '-ajuda' }, c.ajuda) : null;
  const descrito = ajuda ? id + '-ajuda' : null;
  if (c.tipo === 'select') {
    const sel = h('select', { id, 'aria-describedby': descrito }, c.opcoes.map(([v, t]) => h('option', { value: v, selected: String(val[c.id]) === v ? true : null }, t)));
    sel.addEventListener('change', () => { val[c.id] = sel.value; aoMudar(); });
    return h('div', { class: 'campo-sim' }, h('label', { for: id }, c.rotulo), sel, ajuda);
  }
  if (c.tipo === 'check') {
    const cb = h('input', { type: 'checkbox', id, checked: val[c.id] ? true : null });
    cb.addEventListener('change', () => { val[c.id] = cb.checked; aoMudar(); });
    return h('div', { class: 'campo-sim' }, h('label', { for: id, class: 'rotulo-caixa' }, cb, c.rotulo));
  }
  // Prazos (anos, meses) são sempre inteiros; os demais aceitam valores além do controle deslizante
  // (até 10 vezes o máximo), para testar cenários extremos sem quebrar as contas.
  const prazo = /^(anos|meses)$/.test(c.unidade || '');
  const teto = prazo ? c.max : c.max * 10, piso = c.compacto ? c.min * 10 : c.min;
  const ajustar = (x) => { x = Math.max(piso, Math.min(teto, x)); return prazo ? Math.round(x) : x; };
  const numero = h('input', { type: 'number', id, min: piso, max: teto, step: c.passo, value: val[c.id], inputmode: c.min < 0 ? null : 'decimal', 'aria-describedby': descrito });
  const lerNumero = () => parseFloat(String(numero.value).replace(',', '.'));
  if (c.compacto) {
    numero.addEventListener('input', () => { const x = lerNumero(); if (Number.isFinite(x)) { val[c.id] = ajustar(x); aoMudar(); } });
    numero.addEventListener('change', () => { numero.value = val[c.id]; });
    return h('div', { class: 'campo-sim' }, h('label', { for: id }, c.rotulo, c.unidade ? h('span', { class: 'vh' }, ` (${c.unidade})`) : null), numero);
  }
  const faixa = h('input', { type: 'range', min: c.min, max: c.max, step: c.passo, value: val[c.id], 'aria-label': c.rotulo + (c.unidade ? ` (${c.unidade})` : '') + ': controle deslizante', tabindex: '-1' });
  const definir = (x, origem) => {
    if (!Number.isFinite(x)) return;
    val[c.id] = x;
    if (origem !== faixa) faixa.value = x;
    if (origem !== numero) numero.value = x;
    aoMudar();
  };
  faixa.addEventListener('input', () => definir(parseFloat(faixa.value), faixa));
  numero.addEventListener('input', () => { const x = lerNumero(); if (Number.isFinite(x)) definir(ajustar(x), numero); });
  // ao sair do campo, mostra o valor realmente usado na conta (dentro dos limites)
  numero.addEventListener('change', () => { numero.value = val[c.id]; });
  return h('div', { class: 'campo-sim' },
    h('label', { for: id }, c.rotulo),
    h('div', { class: 'linha-entrada' }, numero, h('span', { class: 'unidade' }, c.unidade || '')),
    faixa, ajuda);
}

function desenharSaida(a, val, saidas, anunciar) {
  let r;
  try { r = a.calcular({ ...val }); } catch (e) { console.error(e); saidas.replaceChildren(h('p', null, 'Não foi possível calcular com esses valores.')); return; }
  const tabelaAberta = !!saidas.querySelector('details.tabela-dados[open]'); // não fecha a tabela a cada ajuste
  const filhos = [];
  if (r.metricas) filhos.push(h('div', { class: 'metricas' }, r.metricas.map(m => h('div', { class: 'metrica' + (m.destaque ? ' destaque' : '') }, h('small', null, m.rot), h('b', { class: m.cls || '' }, m.val)))));
  if (r.extraAntes) filhos.push(r.extraAntes);
  if (r.barras) { const b = h('div'); barras(b, r.barras, r.formatoBarras || num); filhos.push(b); }
  const g = h('div'); if (r.grafico) filhos.push(g);
  if (r.texto) filhos.push(...r.texto.map(t => h('p', null, t)));
  if (r.extra) filhos.push(r.extra);
  if (a.premissas) filhos.push(h('div', { class: 'premissas' }, icone('aviso'), h('div', null, h('p', null, h('b', null, 'Premissas: ')), a.premissas.map(p => h('p', null, p)))));
  saidas.replaceChildren(...filhos);
  if (r.grafico) grafico(g, { ...r.grafico, tabelaAberta });
  const principal = r.metricas?.find(m => m.destaque) || r.metricas?.[0];
  if (principal && anunciar) anunciar(`${principal.rot}: ${principal.val}`);
}
