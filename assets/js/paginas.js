// Páginas: início, enciclopédia, simuladores, trilhas e "sobre".
import { D, achar, progresso, classeNivel, NIVEIS } from './dados.js';
import { h, icone, slug, norm, revelarAoRolar } from './util.js';
import { SIMULADORES, porId, montarSimulador } from './simuladores.js';

const ICONE_TEMA = {
  'Planejamento financeiro': 'escudo', 'Crédito e dívidas': 'banco', 'Inflação': 'carrinho', 'Juros e política monetária': 'governo',
  'Macroeconomia': 'brasil', 'Microeconomia': 'grafico', 'Sistema financeiro': 'banco', 'Investimentos': 'investidor',
};
export const iconeTema = (t) => ICONE_TEMA[t] || 'livro';

function cartaoConceito(v, extra = '') {
  const feito = progresso.estudado(v.slug);
  return h('a', { class: 'cartao cartao-conceito revelar', href: '#/conceito/' + v.slug + extra },
    feito ? h('span', { class: 'estudado-selo', title: 'Estudado', 'aria-label': 'Estudado' }, icone('check')) : null,
    h('h3', null, v.termo), h('p', null, v.definicao),
    h('div', { class: 'rodape-cartao' }, h('span', { class: 'etiqueta ' + classeNivel(v.nivel) }, v.nivel || 'Verbete'),
      v.aprofundamento ? h('span', null, `${Object.keys(v.aprofundamento).length} níveis`) : null));
}

function painelIndicadores() {
  const ind = D.indicadores;
  if (!ind || !ind.itens?.length) return null;
  return h('div', { class: 'painel', 'aria-label': 'Indicadores de referência' },
    h('div', { class: 'painel-topo' }, h('strong', null, 'Indicadores de referência'), h('span', null, 'Atualizado em ' + ind.atualizado_em)),
    h('div', { class: 'indicadores' }, ind.itens.map(i => h('a', { class: 'indicador', href: i.conceito ? '#/conceito/' + slug(i.conceito) : null, style: 'text-decoration:none;color:inherit' },
      h('small', null, i.nome), h('b', null, i.valor), h('span', null, `${i.referencia} · ${i.fonte}`)))),
    h('p', { class: 'nota-fonte' }, ind.nota));
}

export function paginaInicio(main) {
  const total = D.verbetes.length, completos = D.verbetes.filter(v => v.aprofundamento?.impactos).length;
  const hoje = new Date(); const idx = (hoje.getFullYear() * 372 + hoje.getMonth() * 31 + hoje.getDate()) % Math.max(1, D.verbetes.length);
  const doDia = D.verbetes.filter(v => v.aprofundamento)[idx % Math.max(1, D.verbetes.filter(v => v.aprofundamento).length)] || D.verbetes[0];
  const entrada = h('input', { type: 'search', placeholder: 'O que você quer entender? Ex.: Selic, inflação, CDB', 'aria-label': 'Buscar um termo', autocomplete: 'off' });
  entrada.addEventListener('keydown', (e) => { if (e.key === 'Enter' && entrada.value.trim()) location.hash = '#/glossario?q=' + encodeURIComponent(entrada.value.trim()); });
  entrada.addEventListener('focus', () => { document.dispatchEvent(new CustomEvent('abrir-busca', { detail: entrada.value })); entrada.blur(); });

  const destaques = ['reserva', 'juros-compostos', 'inflacao', 'selic', 'divida', 'investimentos'].map(id => porId.get(id)).filter(Boolean);
  main.replaceChildren(
    h('section', { class: 'heroi' }, h('div', { class: 'container' },
      h('div', null,
        h('p', { class: 'sobretitulo' }, 'CORECON-PB · Educação econômica e financeira'),
        h('h1', null, 'Entenda a economia que ', h('em', null, 'mexe com o seu dinheiro'), '.'),
        h('p', { class: 'lead' }, 'Do básico ao avançado: conceitos explicados em sete níveis, simuladores para testar cenários, trilhas de estudo e quiz. Em linguagem simples, com fontes oficiais.'),
        h('label', { class: 'heroi-busca' }, icone('busca'), entrada, h('a', { class: 'botao pequeno', href: '#/enciclopedia' }, 'Explorar')),
        h('div', { class: 'heroi-numeros' },
          h('div', null, h('b', null, total), h('span', null, 'termos e conceitos')),
          h('div', null, h('b', null, completos), h('span', null, 'em 7 níveis')),
          h('div', null, h('b', null, SIMULADORES.length), h('span', null, 'simuladores')),
          h('div', null, h('b', null, D.quiz.length), h('span', null, 'perguntas de quiz')))),
      painelIndicadores())),

    h('section', { class: 'container secao' },
      h('div', { class: 'cabeca-secao' }, h('div', null, h('p', { class: 'sobretitulo' }, 'Por onde começar'), h('h2', null, 'Trilhas de aprendizagem')),
        h('a', { href: '#/trilhas' }, 'Ver todas as trilhas →')),
      h('div', { class: 'grade grade-3' }, D.trilhas.slice(0, 3).map(cartaoTrilha))),

    h('section', { class: 'container secao' },
      h('div', { class: 'cabeca-secao' }, h('div', null, h('p', { class: 'sobretitulo' }, 'Aprenda fazendo'), h('h2', null, 'Simuladores e calculadoras')),
        h('a', { href: '#/simuladores' }, `Todos os ${SIMULADORES.length} simuladores →`)),
      h('div', { class: 'grade grade-3' }, destaques.map(cartaoSimulador))),

    h('section', { class: 'container secao' },
      h('div', { class: 'grade grade-2' },
        h('div', { class: 'cartao revelar', style: 'padding:1.75rem' },
          h('p', { class: 'sobretitulo' }, 'Conceito em destaque'),
          h('h2', null, doDia.termo), h('p', { class: 'lead', style: 'font-size:1.02rem' }, doDia.definicao),
          h('a', { class: 'botao', href: '#/conceito/' + doDia.slug }, 'Estudar este conceito', icone('seta'))),
        h('div', { class: 'cartao revelar', style: 'padding:1.75rem' },
          h('p', { class: 'sobretitulo' }, 'Enciclopédia'),
          h('h2', null, 'Navegue por categoria'),
          h('div', { class: 'chips', style: 'margin-top:1rem' }, D.temas.map(t => h('a', { class: 'chip', href: '#/enciclopedia?tema=' + encodeURIComponent(t) }, t, ` (${D.verbetes.filter(v => v.tema === t).length})`)))))),
  );
  revelarAoRolar(main);
}

function cartaoSimulador(sim) {
  return h('a', { class: 'cartao revelar', href: '#/simuladores/' + sim.id },
    h('div', { class: 'icone-cartao' }, icone(sim.icone)), h('h3', null, sim.titulo), h('p', null, sim.resumo),
    h('div', { class: 'rodape-cartao' }, h('span', null, sim.conceitos.slice(0, 2).join(' · ')), h('span', { class: 'seta' }, icone('seta'))));
}

function cartaoTrilha(t) {
  const p = progresso.trilha(t);
  return h('a', { class: 'cartao trilha-cartao revelar', href: '#/trilhas/' + t.id },
    h('div', { class: 'icone-cartao' }, icone(t.icone || 'trilha')),
    h('span', { class: 'etiqueta ' + classeNivel(t.nivel) }, t.nivel), h('h3', { style: 'margin-top:.6rem' }, t.titulo), h('p', null, t.descricao),
    h('div', { class: 'barra-progresso', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p.pct, 'aria-label': 'Progresso na trilha' }, h('span', { style: `width:${p.pct}%` })),
    h('div', { class: 'rodape-cartao' }, h('span', null, `${p.feitos} de ${p.total} conceitos`), h('span', { class: 'seta' }, icone('seta'))));
}

export function paginaEnciclopedia(main, params) {
  let tema = params.get('tema') || '', nivel = params.get('nivel') || '', q = params.get('q') || '';
  const campo = h('input', { type: 'search', class: 'campo-texto', id: 'filtro-enc', value: q, placeholder: 'Filtrar conceitos…', autocomplete: 'off' });
  const chipsTema = h('div', { class: 'chips', role: 'group', 'aria-label': 'Categoria' });
  const chipsNivel = h('div', { class: 'chips', role: 'group', 'aria-label': 'Nível' });
  const resultado = h('div');
  const contagem = h('p', { 'aria-live': 'polite', class: 'fonte' });
  const atualizarUrl = () => {
    const u = new URLSearchParams(); if (tema) u.set('tema', tema); if (nivel) u.set('nivel', nivel); if (campo.value.trim()) u.set('q', campo.value.trim());
    history.replaceState(null, '', location.pathname + location.search + '#/enciclopedia' + (u.toString() ? '?' + u : ''));
  };
  const chip = (grupo, val, nome, atual, def) => h('button', { type: 'button', class: 'chip', 'aria-pressed': val === atual ? 'true' : 'false', onclick: () => { def(val); desenhar(); } }, nome);
  function desenhar() {
    chipsTema.replaceChildren(...[['', 'Todas'], ...D.temas.map(t => [t, t])].map(([v, n]) => chip(chipsTema, v, n, tema, x => (tema = x))));
    chipsNivel.replaceChildren(...[['', 'Todos'], ...NIVEIS.map(n => [n, n])].map(([v, n]) => chip(chipsNivel, v, n, nivel, x => (nivel = x))));
    const qq = norm(campo.value.trim());
    const itens = D.verbetes.filter(v => (!tema || v.tema === tema) && (!nivel || v.nivel === nivel) && (!qq || D.textoBusca.get(v.slug).includes(qq)));
    contagem.textContent = `${itens.length} ${itens.length === 1 ? 'conceito' : 'conceitos'}`;
    resultado.replaceChildren();
    for (const t of D.temas) {
      const doTema = itens.filter(v => v.tema === t);
      if (!doTema.length) continue;
      const subtemas = [...new Set(doTema.map(v => v.subtema || ''))];
      const bloco = h('section', { class: 'categoria-bloco', 'aria-labelledby': 'cat-' + slug(t) },
        h('div', { class: 'categoria-cabeca' }, h('span', { class: 'icone-cartao', style: 'margin:0;width:2rem;height:2rem' }, icone(iconeTema(t))), h('h2', { id: 'cat-' + slug(t) }, t), h('span', null, `${doTema.length} conceitos`)));
      for (const st of subtemas) {
        if (st) bloco.append(h('h3', { class: 'subtema-titulo' }, st));
        bloco.append(h('div', { class: 'grade grade-4' }, doTema.filter(v => (v.subtema || '') === st).sort((a, b) => NIVEIS.indexOf(a.nivel) - NIVEIS.indexOf(b.nivel) || a.termo.localeCompare(b.termo, 'pt-BR')).map(v => cartaoConceito(v))));
      }
      resultado.append(bloco);
    }
    if (!itens.length) resultado.append(h('p', { class: 'vazio' }, 'Nenhum conceito com esses filtros.'));
    atualizarUrl(); revelarAoRolar(resultado);
  }
  campo.addEventListener('input', desenhar);
  main.replaceChildren(h('div', { class: 'container secao' },
    h('p', { class: 'sobretitulo' }, 'Enciclopédia econômica'),
    h('h1', null, 'Conceitos de economia e finanças'),
    h('p', { class: 'lead' }, 'Organizados por categoria e do mais simples ao mais avançado. Os conceitos centrais têm sete níveis: definição simples, explicação técnica, prática, impactos, exemplos, relações e mercado financeiro.'),
    h('div', { class: 'barra-filtros', style: 'margin-top:1.5rem' },
      h('div', { class: 'campo' }, h('label', { for: 'filtro-enc' }, 'Buscar'), campo),
      h('div', null, h('label', null, 'Nível'), chipsNivel),
      h('div', { style: 'flex-basis:100%' }, h('label', null, 'Categoria'), chipsTema), contagem),
    resultado));
  desenhar();
}

export function paginaSimuladores(main, id) {
  if (id && porId.get(id)) {
    const sim = porId.get(id);
    document.title = sim.titulo + ' – Glossário da Economia';
    const box = h('div');
    const conceitos = sim.conceitos.map(n => achar(slug(n))).filter(Boolean);
    main.replaceChildren(h('div', { class: 'container' },
      h('nav', { class: 'migalhas', 'aria-label': 'Você está em' }, h('a', { href: '#/simuladores' }, 'Simuladores'), h('span', { 'aria-hidden': 'true' }, '/'), h('span', null, sim.titulo)),
      box,
      conceitos.length ? h('section', { class: 'secao' }, h('h2', null, 'Entenda os conceitos por trás'), h('div', { class: 'grade grade-4' }, conceitos.map(v => cartaoConceito(v)))) : null,
      h('div', { class: 'chips' }, SIMULADORES.filter(x => x.id !== id).map(x => h('a', { class: 'chip', href: '#/simuladores/' + x.id }, x.titulo)))));
    montarSimulador(sim, box, { nivelTitulo: 'h1' });
    revelarAoRolar(main);
    return;
  }
  main.replaceChildren(h('div', { class: 'container secao' },
    h('p', { class: 'sobretitulo' }, 'Aprenda fazendo'),
    h('h1', null, 'Simuladores e calculadoras'),
    h('p', { class: 'lead' }, 'Mude os valores e veja o resultado na hora. Todos partem de exemplos hipotéticos e mostram as premissas usadas. Nenhum é recomendação de investimento.'),
    h('div', { class: 'grade grade-3', style: 'margin-top:1.5rem' }, SIMULADORES.map(cartaoSimulador))));
  revelarAoRolar(main);
}

export function paginaTrilhas(main, id) {
  const t = D.trilhas.find(x => x.id === id);
  if (t) {
    document.title = t.titulo + ' – Glossário da Economia';
    const est = progresso.estudados(), p = progresso.trilha(t);
    const itens = t.conceitos.map(n => achar(slug(n))).filter(Boolean);
    const proximo = itens.find(v => !est.has(v.slug)) || itens[0];
    main.replaceChildren(h('div', { class: 'estreito' },
      h('nav', { class: 'migalhas', 'aria-label': 'Você está em' }, h('a', { href: '#/trilhas' }, 'Trilhas'), h('span', { 'aria-hidden': 'true' }, '/'), h('span', null, t.titulo)),
      h('span', { class: 'etiqueta ' + classeNivel(t.nivel) }, t.nivel), h('h1', { style: 'margin-top:.6rem' }, t.titulo), h('p', { class: 'lead' }, t.descricao),
      h('div', { class: 'barra-progresso', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p.pct, 'aria-label': 'Progresso' }, h('span', { style: `width:${p.pct}%` })),
      h('p', { class: 'fonte' }, `${p.feitos} de ${p.total} conceitos estudados (${p.pct}%)`),
      proximo ? h('p', null, h('a', { class: 'botao', href: `#/conceito/${proximo.slug}?trilha=${t.id}` }, p.feitos ? 'Continuar de onde parei' : 'Começar a trilha', icone('seta'))) : null,
      h('ol', { class: 'etapas secao' }, itens.map(v => h('li', { class: est.has(v.slug) ? 'feito' : '' },
        h('a', { href: `#/conceito/${v.slug}?trilha=${t.id}` }, v.termo), h('p', null, v.definicao)))),
      t.simuladores?.length ? h('section', { class: 'secao' }, h('h2', null, 'Pratique com'), h('div', { class: 'chips' }, t.simuladores.map(sid => porId.get(sid)).filter(Boolean).map(sm => h('a', { class: 'chip', href: '#/simuladores/' + sm.id }, sm.titulo)))) : null,
      h('p', null, h('a', { class: 'botao secundario', href: '#/quiz?tema=' + encodeURIComponent(t.tema_quiz || '') }, 'Testar com o quiz'))));
    return;
  }
  const est = progresso.estudados();
  main.replaceChildren(h('div', { class: 'container secao' },
    h('p', { class: 'sobretitulo' }, 'Do básico ao avançado'),
    h('h1', null, 'Trilhas de aprendizagem'),
    h('p', { class: 'lead' }, 'Sequências de conceitos pensadas para quem está começando e para quem quer ir além. O progresso fica salvo só neste navegador.'),
    h('p', { class: 'fonte' }, `Você já estudou ${est.size} de ${D.verbetes.length} conceitos.`),
    ...NIVEIS.map(n => {
      const ts = D.trilhas.filter(t => t.nivel === n);
      return ts.length ? h('section', { class: 'secao', style: 'padding-bottom:0' }, h('h2', null, n), h('div', { class: 'grade grade-3' }, ts.map(cartaoTrilha))) : null;
    })));
  revelarAoRolar(main);
}

export function paginaSobre(main) {
  const ind = D.indicadores;
  main.replaceChildren(h('div', { class: 'estreito secao texto-longo' },
    h('p', { class: 'sobretitulo' }, 'Metodologia'),
    h('h1', null, 'Como ler este site'),
    h('p', { class: 'lead' }, 'O Glossário da Economia é um projeto de extensão de estudantes de Ciências Econômicas da UFPB (TPAE II, Equipe 01), em parceria com o CORECON-PB e em apoio ao programa “PB sem dívidas”.'),
    h('h2', null, 'Fatos, interpretações e exemplos'),
    h('div', { class: 'bloco-marcado fato' }, h('span', { class: 'marcador' }, 'Fato'), h('p', null, 'Informação verificável, com fonte institucional (Banco Central, IBGE, Tesouro Nacional, CVM, B3 etc.). Dados que mudam com o tempo trazem a data de referência.')),
    h('div', { class: 'bloco-marcado interpretacao' }, h('span', { class: 'marcador' }, 'Interpretação'), h('p', null, 'Leitura econômica de um fenômeno: o que a teoria e as instituições costumam apontar. Pode haver debate entre economistas.')),
    h('div', { class: 'bloco-marcado exemplo' }, h('span', { class: 'marcador' }, 'Exemplo hipotético'), h('p', null, 'Números inventados para explicar uma conta ou um mecanismo. Não são dados reais nem previsões.')),
    h('h2', null, 'Os sete níveis de cada conceito'),
    h('ol', null, ['Definição simples: para quem nunca estudou economia.', 'Explicação técnica: definição formal, terminologia e fórmulas.', 'Na prática: como o fenômeno acontece na economia real.', 'Impactos: efeitos sobre consumidores, famílias, empresas, trabalhadores, governo, bancos, investidores, mercado financeiro e economias nacional e internacional.', 'Exemplos e aplicações: contas, casos e simuladores.', 'Relações com outros indicadores.', 'Aplicações no mercado financeiro: ações, renda fixa, fundos imobiliários, câmbio e títulos públicos.'].map(t => h('li', null, t))),
    h('p', null, 'Os conceitos centrais já têm os sete níveis. Os demais começam com a definição e os níveis mais úteis para aquele termo, e vão sendo ampliados.'),
    h('h2', null, 'Simuladores'),
    h('p', null, 'Os simuladores começam com valores hipotéticos, que você pode mudar. Cada um mostra as premissas e as fórmulas usadas. Eles servem para entender mecanismos e não são recomendação de investimento nem previsão.'),
    h('h2', null, 'Indicadores de referência'),
    ind ? h('p', null, `Os valores do painel foram conferidos em ${ind.atualizado_em}. ${ind.nota}`) : null,
    h('h2', null, 'Principais fontes'),
    h('ul', null, [
      ['Banco Central do Brasil', 'https://www.bcb.gov.br'], ['IBGE', 'https://www.ibge.gov.br'], ['IPEA / Ipeadata', 'https://www.ipeadata.gov.br'],
      ['Tesouro Nacional e Tesouro Direto', 'https://www.tesourodireto.com.br'], ['Comissão de Valores Mobiliários (CVM)', 'https://www.gov.br/cvm'], ['B3', 'https://www.b3.com.br'],
      ['Ministério da Fazenda', 'https://www.gov.br/fazenda'], ['Fundo Monetário Internacional (FMI)', 'https://www.imf.org'], ['Banco Mundial', 'https://www.worldbank.org'], ['OCDE', 'https://www.oecd.org'],
      ['Portal do Investidor (CVM)', 'https://www.gov.br/investidor'], ['Fundo Garantidor de Créditos (FGC)', 'https://www.fgc.org.br'],
    ].map(([n, u]) => h('li', null, h('a', { href: u, target: '_blank', rel: 'noopener' }, n)))),
    h('h2', null, 'Privacidade e acessibilidade'),
    h('p', null, 'O site não coleta dados pessoais. O progresso nas trilhas e no quiz fica salvo apenas no seu navegador. Você pode aumentar a letra no botão “A” do topo, usar o modo escuro e navegar só pelo teclado (tecla “/” abre a busca).'),
    h('div', { class: 'aviso-conteudo' }, icone('aviso'), h('p', null, 'Conteúdo educativo; não substitui orientação profissional. Encontrou um erro? Fale com a equipe pelo CORECON-PB.'))));
}
