// Questionários: pergunta interativa reutilizável e página de quiz por tema.
import { D, achar, progresso, NIVEIS } from './dados.js';
import { h, slug, icone, aleatorio } from './util.js';

const LETRAS = 'ABCDE';

export function perguntaInterativa(q, { aoResponder } = {}) {
  const caixa = h('div', { class: 'quiz-item' });
  const v = achar(slug(q.conceito));
  caixa.append(h('p', { class: 'quiz-pergunta' }, q.pergunta));
  const opcoes = h('div', { class: 'opcoes', role: 'group', 'aria-label': 'Alternativas' });
  const retorno = h('div', { 'aria-live': 'polite' });
  q.opcoes.forEach((texto, i) => {
    const b = h('button', { type: 'button', class: 'opcao' }, h('span', { class: 'letra', 'aria-hidden': 'true' }, LETRAS[i]), h('span', null, texto));
    b.addEventListener('click', () => {
      const certo = i === q.correta;
      [...opcoes.children].forEach((x, k) => { x.disabled = true; if (k === q.correta) x.classList.add('certa'); });
      if (!certo) b.classList.add('errada');
      b.setAttribute('aria-label', (certo ? 'Resposta certa: ' : 'Resposta errada: ') + texto);
      retorno.replaceChildren(h('div', { class: 'explicacao' }, h('b', null, certo ? 'Correto!' : `Não é essa. A resposta é ${LETRAS[q.correta]}.`), q.explicacao,
        v ? h('p', { style: 'margin:.5rem 0 0' }, h('a', { href: '#/conceito/' + v.slug }, `Revisar: ${v.termo} →`)) : null));
      aoResponder && aoResponder(certo);
    });
    opcoes.append(b);
  });
  caixa.append(opcoes, retorno);
  return caixa;
}

function embaralhar(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export function paginaQuiz(main, params) {
  const temaDe = (q) => achar(slug(q.conceito))?.tema || 'Geral';
  const temas = [...new Set(D.quiz.map(temaDe))].sort((a, b) => D.temas.indexOf(a) - D.temas.indexOf(b));
  let tema = params.get('tema') || '', nivel = params.get('nivel') || '';
  const hist = progresso.quiz();
  const area = h('div', { class: 'quiz' });

  const filtros = h('div', { class: 'barra-filtros' },
    h('div', null, h('label', null, 'Tema'), h('div', { class: 'chips', role: 'group', 'aria-label': 'Tema do quiz' },
      [['', 'Todos'], ...temas.map(t => [t, t])].map(([val, nome]) => h('button', { type: 'button', class: 'chip', 'aria-pressed': val === tema ? 'true' : 'false', onclick: (e) => { tema = val; marcar(e.currentTarget); iniciar(); } }, nome)))),
    h('div', null, h('label', null, 'Nível'), h('div', { class: 'chips', role: 'group', 'aria-label': 'Nível do quiz' },
      [['', 'Todos'], ...NIVEIS.map(n => [n, n])].map(([val, nome]) => h('button', { type: 'button', class: 'chip', 'aria-pressed': val === nivel ? 'true' : 'false', onclick: (e) => { nivel = val; marcar(e.currentTarget); iniciar(); } }, nome)))));
  const marcar = (b) => [...b.parentElement.children].forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));

  main.replaceChildren(h('div', { class: 'container secao' },
    h('p', { class: 'sobretitulo' }, 'Teste seus conhecimentos'),
    h('h1', null, 'Quiz'),
    h('p', { class: 'lead' }, `${D.quiz.length} perguntas sobre todos os temas. Cada rodada sorteia até 10. Ao responder, você vê a explicação e o link para revisar o conceito.`),
    filtros, area));

  function iniciar() {
    const pool = D.quiz.filter(q => (!tema || temaDe(q) === tema) && (!nivel || (q.nivel || achar(slug(q.conceito))?.nivel) === nivel));
    const rodada = embaralhar(pool, aleatorio(Date.now())).slice(0, 10);
    let i = 0, acertos = 0;
    const chave = (tema || 'todos') + '|' + (nivel || 'todos');
    const passo = () => {
      if (!rodada.length) { area.replaceChildren(h('p', null, 'Ainda não há perguntas para essa combinação. Escolha outro tema ou nível.')); return; }
      if (i >= rodada.length) {
        progresso.gravarQuiz(chave, acertos, rodada.length);
        const pctAc = Math.round(100 * acertos / rodada.length);
        area.replaceChildren(h('div', { class: 'cartao', style: 'text-align:center;padding:2rem' },
          h('p', { class: 'placar' }, `${acertos}/${rodada.length}`),
          h('p', null, pctAc >= 80 ? 'Excelente! Você domina esse conteúdo.' : pctAc >= 50 ? 'Bom resultado. Revise os conceitos que errou.' : 'Vale revisar os conceitos e tentar de novo.'),
          hist[chave] ? h('p', { class: 'fonte' }, `Seu melhor resultado anterior: ${hist[chave].acertos}/${hist[chave].total}`) : null,
          h('div', { class: 'chips', style: 'justify-content:center;margin-top:1rem' },
            h('button', { type: 'button', class: 'botao', onclick: iniciar }, 'Nova rodada'),
            h('a', { class: 'botao secundario', href: '#/trilhas' }, 'Ir para as trilhas'))));
        return;
      }
      const q = rodada[i];
      const prox = h('button', { type: 'button', class: 'botao', hidden: true, style: 'margin-top:1rem' }, i === rodada.length - 1 ? 'Ver resultado' : 'Próxima pergunta', icone('seta'));
      prox.addEventListener('click', () => { i++; passo(); area.querySelector('.quiz-pergunta')?.focus(); });
      const item = perguntaInterativa(q, { aoResponder: (certo) => { if (certo) acertos++; prox.hidden = false; prox.focus(); } });
      item.querySelector('.quiz-pergunta').tabIndex = -1;
      area.replaceChildren(h('div', { class: 'cartao' },
        h('div', { class: 'quiz-topo' }, h('span', null, `Pergunta ${i + 1} de ${rodada.length}`), h('span', null, `${acertos} ${acertos === 1 ? 'acerto' : 'acertos'}`)),
        h('div', { class: 'barra-progresso', 'aria-hidden': 'true' }, h('span', { style: `width:${100 * i / rodada.length}%` })),
        item, prox));
    };
    passo();
  }
  iniciar();
}
