// Questionários: pergunta interativa reutilizável e página de quiz por tema.
import { D, achar, progresso, NIVEIS } from './dados.js';
import { h, slug, icone, aleatorio, plural } from './util.js';

const LETRAS = 'ABCDE';

function embaralhar(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// As alternativas são embaralhadas a cada exibição: no arquivo de perguntas a resposta certa
// costuma ficar na mesma posição, e sem embaralhar daria para acertar "no padrão".
export function perguntaInterativa(q, { aoResponder, rng = Math.random } = {}) {
  const caixa = h('div', { class: 'quiz-item' });
  const v = achar(slug(q.conceito));
  const idPergunta = 'q-' + Math.random().toString(36).slice(2, 8);
  caixa.append(h('p', { class: 'quiz-pergunta', id: idPergunta }, q.pergunta));
  const opcoes = h('div', { class: 'opcoes', role: 'group', 'aria-labelledby': idPergunta });
  const retorno = h('div', { role: 'status' });
  const ordem = embaralhar(q.opcoes.map((texto, original) => ({ texto, certa: original === q.correta })), rng);
  const letraCerta = LETRAS[ordem.findIndex(o => o.certa)];
  ordem.forEach((op, i) => {
    const b = h('button', { type: 'button', class: 'opcao' }, h('span', { class: 'letra', 'aria-hidden': 'true' }, LETRAS[i]), h('span', { class: 'texto-opcao' }, op.texto));
    b.addEventListener('click', () => {
      if (caixa.dataset.respondida) return;
      caixa.dataset.respondida = '1';
      [...opcoes.children].forEach((x, k) => {
        x.setAttribute('aria-disabled', 'true'); x.tabIndex = -1;
        if (ordem[k].certa) { x.classList.add('certa'); x.append(h('span', { class: 'marca-resposta' }, icone('check'), h('span', { class: 'vh' }, ' (resposta certa)'))); }
      });
      if (!op.certa) { b.classList.add('errada'); b.append(h('span', { class: 'marca-resposta' }, icone('fechar'), h('span', { class: 'vh' }, ' (sua resposta, errada)'))); }
      retorno.replaceChildren(h('div', { class: 'explicacao ' + (op.certa ? 'acerto' : 'erro') }, h('b', null, op.certa ? 'Correto!' : `Não é essa. A resposta é ${letraCerta}.`), q.explicacao,
        v ? h('p', { class: 'revisar' }, h('a', { href: '#/conceito/' + v.slug }, `Revisar: ${v.termo} →`)) : null));
      aoResponder && aoResponder(op.certa);
    });
    opcoes.append(b);
  });
  caixa.append(opcoes, retorno);
  return caixa;
}

export function paginaQuiz(main, params) {
  const temaDe = (q) => achar(slug(q.conceito))?.tema || 'Geral';
  const temas = [...new Set(D.quiz.map(temaDe))].sort((a, b) => D.temas.indexOf(a) - D.temas.indexOf(b));
  let tema = params.get('tema') || '', nivel = params.get('nivel') || '';
  if (!temas.includes(tema)) tema = '';
  if (!NIVEIS.includes(nivel)) nivel = '';
  const area = h('div', { class: 'quiz' });

  const grupo = (id, rotulo, itens, atual, definir) => h('div', null, h('span', { class: 'rotulo-campo', id }, rotulo),
    h('div', { class: 'chips', role: 'group', 'aria-labelledby': id }, itens.map(([val, nome]) =>
      h('button', { type: 'button', class: 'chip', 'aria-pressed': val === atual ? 'true' : 'false', onclick: (e) => { definir(val); marcar(e.currentTarget); iniciar(); } }, nome))));
  const marcar = (b) => [...b.parentElement.children].forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  const filtros = h('div', { class: 'barra-filtros' },
    grupo('quiz-tema', 'Tema', [['', 'Todos'], ...temas.map(t => [t, t])], tema, x => (tema = x)),
    grupo('quiz-nivel', 'Nível', [['', 'Todos'], ...NIVEIS.map(n => [n, n])], nivel, x => (nivel = x)));

  main.replaceChildren(h('div', { class: 'container secao' },
    h('p', { class: 'sobretitulo' }, 'Teste seus conhecimentos'),
    h('h1', null, 'Quiz'),
    h('p', { class: 'lead' }, `${D.quiz.length} perguntas sobre todos os temas. Cada rodada sorteia até 10. Ao responder, você vê a explicação e o link para revisar o conceito.`),
    filtros, area));

  function iniciar() {
    const rng = aleatorio(Date.now());
    const pool = D.quiz.filter(q => (!tema || temaDe(q) === tema) && (!nivel || (q.nivel || achar(slug(q.conceito))?.nivel) === nivel));
    const rodada = embaralhar(pool, rng).slice(0, 10);
    let i = 0, acertos = 0;
    const erradas = [];
    const chave = (tema || 'todos') + '|' + (nivel || 'todos');
    const passo = () => {
      if (!rodada.length) { area.replaceChildren(h('p', { class: 'vazio' }, 'Ainda não há perguntas para essa combinação. Escolha outro tema ou nível.')); return; }
      if (i >= rodada.length) {
        const anterior = progresso.quiz()[chave];
        progresso.gravarQuiz(chave, acertos, rodada.length);
        const pctAc = Math.round(100 * acertos / rodada.length);
        // conceitos das perguntas erradas, sem repetir: é por onde vale recomeçar o estudo
        const revisar = [...new Map(erradas.map(q => achar(slug(q.conceito))).filter(Boolean).map(v => [v.slug, v])).values()];
        const titulo = h('h2', { class: 'placar', tabindex: '-1' }, h('span', { class: 'vh' }, 'Resultado: '), `${acertos}/${rodada.length}`);
        area.replaceChildren(h('div', { class: 'cartao resultado-quiz' },
          titulo,
          h('p', null, pctAc >= 80 ? 'Excelente! Você domina esse conteúdo.' : pctAc >= 50 ? 'Bom resultado. Revise os conceitos que errou.' : 'Vale revisar os conceitos e tentar de novo.'),
          anterior ? h('p', { class: 'fonte' }, `Seu melhor resultado anterior: ${anterior.acertos}/${anterior.total}`) : null,
          revisar.length ? h('div', { class: 'revisar-lista' }, h('h3', null, 'Para revisar'),
            h('div', { class: 'chips' }, revisar.map(v => h('a', { class: 'chip', href: '#/conceito/' + v.slug }, v.termo)))) : null,
          h('div', { class: 'chips acoes-resultado' },
            h('button', { type: 'button', class: 'botao', onclick: () => { iniciar(); area.querySelector('.quiz-pergunta')?.focus(); } }, 'Nova rodada'),
            h('a', { class: 'botao secundario', href: '#/trilhas' }, 'Ir para as trilhas'))));
        titulo.focus({ preventScroll: true });
        return;
      }
      const q = rodada[i];
      const prox = h('button', { type: 'button', class: 'botao proxima', hidden: true }, i === rodada.length - 1 ? 'Ver resultado' : 'Próxima pergunta', icone('seta'));
      prox.addEventListener('click', () => { i++; passo(); area.querySelector('.quiz-pergunta')?.focus({ preventScroll: true }); area.scrollIntoView({ block: 'nearest' }); });
      const placar = h('span', null, plural(acertos, 'acerto', 'acertos'));
      const barra = h('span', { style: `width:${100 * i / rodada.length}%` });
      const item = perguntaInterativa(q, { rng, aoResponder: (certo) => {
        if (certo) acertos++; else erradas.push(q);
        placar.textContent = plural(acertos, 'acerto', 'acertos');
        barra.style.width = `${100 * (i + 1) / rodada.length}%`;
        prox.hidden = false; prox.focus({ preventScroll: true }); prox.scrollIntoView({ block: 'nearest' });
      } });
      item.querySelector('.quiz-pergunta').tabIndex = -1;
      area.replaceChildren(h('div', { class: 'cartao' },
        h('div', { class: 'quiz-topo' }, h('span', null, `Pergunta ${i + 1} de ${rodada.length}`), placar),
        h('div', { class: 'barra-progresso', 'aria-hidden': 'true' }, barra),
        item, prox));
    };
    passo();
  }
  iniciar();
}
