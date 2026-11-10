import { conta, iniciarConta, enviarCodigo, validarCodigo, sairDaConta, consultarEstatisticas } from './conta.js';
import { h } from './util.js';

const botao = (rotulo, acao, classe = 'botao secundario') =>
  h('button', { type: 'button', class: classe, onclick: acao }, rotulo);
const link = (rotulo, href) => h('a', { class: 'botao secundario', href }, rotulo);
const status = () => h('p', { class: 'fonte', role: 'status' });
const numero = new Intl.NumberFormat('pt-BR');

export function paginaConta(main, destino = '#/trilhas') {
  const titulo = conta.usuario ? 'Minha conta' : 'Entre para acompanhar seu progresso';
  const area = h('div', { class: 'conta-area' });
  main.replaceChildren(h('div', { class: 'estreito secao' },
    h('p', { class: 'sobretitulo' }, 'Trilhas de aprendizagem'),
    h('h1', null, titulo), area));

  if (conta.modo === 'carregando') {
    area.append(h('p', { role: 'status' }, 'Carregando sua conta…'));
  } else if (conta.modo === 'desativado') {
    area.append(h('p', null, 'O login ainda não está disponível nesta versão.'), link('Ver trilhas', '#/trilhas'));
  } else if (conta.modo === 'erro') {
    area.append(h('p', { role: 'status' }, 'Não foi possível conectar sua conta. Confira a conexão e tente de novo.'),
      h('div', { class: 'chips' }, botao('Tentar novamente', iniciarConta, 'botao'),
        conta.usuario ? botaoSair(area) : null));
  } else if (conta.modo === 'online') {
    area.append(h('p', { class: 'conta-email' }, conta.usuario.email),
      h('p', null, 'Seu progresso nos conceitos é salvo nesta conta.'),
      h('div', { class: 'chips' }, link('Ver minhas trilhas', '#/trilhas'),
        conta.equipe ? link('Estatísticas da equipe', '#/equipe') : null, botaoSair(area)));
  } else {
    formulario(area, destino);
  }
}

function botaoSair(area) {
  const aviso = status();
  area.append(aviso);
  return botao('Sair da conta', async (e) => {
    const acao = e.currentTarget;
    acao.disabled = true;
    aviso.textContent = '';
    try { await sairDaConta(); }
    catch { aviso.textContent = 'Não foi possível sair. Tente novamente.'; }
    finally { acao.disabled = false; }
  });
}

function formulario(area, destino) {
  let email = '';
  const aviso = status();
  function montar(comCodigo) {
    const entrada = h('input', {
      id: 'conta-entrada', class: 'campo-texto', required: true,
      type: comCodigo ? 'text' : 'email',
      autocomplete: comCodigo ? 'one-time-code' : 'email',
      inputmode: comCodigo ? 'numeric' : 'email',
      pattern: comCodigo ? '[0-9]{6,10}' : null,
      maxlength: comCodigo ? 10 : 254,
      value: comCodigo ? '' : email,
    });
    const enviar = h('button', { type: 'submit', class: 'botao' }, comCodigo ? 'Entrar' : 'Enviar código');
    const trocar = botao('Trocar e-mail ou reenviar', () => {
      aviso.textContent = '';
      montar(false).focus();
    });
    const form = h('form', { class: 'conta-form' },
      h('label', { for: 'conta-entrada' }, comCodigo ? 'Código recebido por e-mail' : 'Seu e-mail'), entrada,
      h('div', { class: 'chips' }, enviar, comCodigo ? trocar : null), aviso);
    area.replaceChildren(h('p', { class: 'conta-email' }, comCodigo
      ? `Enviamos um código para ${email}. Se não chegar, confira o spam ou solicite outro com o mesmo e-mail.`
      : 'Enviaremos um código para criar sua conta ou entrar nela.'),
      form, h('p', { class: 'fonte' }, 'O Supabase guarda seu e-mail para o login. O site registra os conceitos que você marca e as trilhas que abre. A equipe vê contagens e médias sem nomes ou e-mails.'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      enviar.disabled = entrada.disabled = trocar.disabled = true;
      aviso.textContent = comCodigo ? 'Verificando código…' : 'Enviando código…';
      try {
        if (comCodigo) {
          const origem = location.hash;
          await validarCodigo(email, entrada.value.trim());
          if (conta.usuario && location.hash === origem && origem !== destino) location.hash = destino;
        } else {
          email = entrada.value.trim();
          await enviarCodigo(email);
          aviso.textContent = '';
          if (form.isConnected) montar(true).focus();
        }
      } catch (erro) {
        aviso.textContent = erro.status === 429 ? 'Aguarde um minuto antes de tentar de novo.'
          : comCodigo ? 'Não foi possível validar o código. Confira os dígitos ou solicite outro código.'
            : 'Não foi possível enviar o código. Confira o e-mail e tente novamente.';
      } finally {
        enviar.disabled = entrada.disabled = trocar.disabled = false;
      }
    });
    return entrada;
  }
  montar(false);
}

export function paginaEquipe(main) {
  if (conta.modo === 'visitante' || conta.modo === 'carregando' || conta.modo === 'erro') {
    paginaConta(main, '#/equipe');
    return;
  }

  const area = h('div', { class: 'conta-area' });
  main.replaceChildren(h('div', { class: 'container secao' },
    h('p', { class: 'sobretitulo' }, 'Acompanhamento das trilhas'), h('h1', null, 'Estatísticas da equipe'), area));
  if (!conta.equipe) {
    area.append(h('p', null, 'Este painel é reservado às contas autorizadas pela equipe.'), link('Voltar à conta', '#/conta'));
    return;
  }

  async function carregar() {
    area.replaceChildren(h('p', { role: 'status' }, 'Carregando estatísticas…'));
    try {
      const dados = await consultarEstatisticas();
      if (!area.isConnected) return;
      const indicador = (rotulo, valor) => h('div', { class: 'cartao' },
        h('dt', null, rotulo), h('dd', null, numero.format(valor)));
      area.replaceChildren(
        h('dl', { class: 'grade grade-3 painel-indicadores' },
          indicador('Pessoas que abriram uma trilha', dados.pessoas),
          indicador('Ativas nos últimos 30 dias', dados.ativas_30d),
          indicador('Concluíram pelo menos uma trilha', dados.pessoas_concluiram)),
        h('p', { class: 'fonte' }, 'Uma trilha conta como iniciada quando a pessoa abre sua página ou um conceito pelo link da trilha. A conclusão exige que todos os conceitos estejam marcados como estudados.'),
        h('h2', null, 'Desempenho por trilha'),
        ...dados.trilhas.map(t => {
          const taxa = t.iniciaram ? numero.format(Math.round(100 * t.concluiram / t.iniciaram)) + '%' : '—';
          const media = t.progresso_medio === null ? '—' : numero.format(t.progresso_medio) + '%';
          return h('details', { class: 'cartao painel-trilha' },
            h('summary', null, h('strong', null, t.titulo)),
            h('p', null, `${numero.format(t.iniciaram)} iniciaram · ${numero.format(t.concluiram)} concluíram · taxa de conclusão ${taxa} · progresso médio ${media}`),
            h('ul', { class: 'lista-simples' }, t.etapas.map(e =>
              h('li', null, `${e.titulo} · ${numero.format(e.estudaram)} de ${numero.format(t.iniciaram)} estudaram`))));
        }));
    } catch (erro) {
      if (!area.isConnected) return;
      if (erro.code === '42501') area.replaceChildren(h('p', { role: 'status' }, 'Sua conta não tem acesso a este painel.'));
      else area.replaceChildren(h('p', { role: 'status' }, 'Não foi possível carregar as estatísticas.'),
        botao('Tentar novamente', carregar));
    }
  }
  carregar();
}
