# Glossário da Economia

Site de educação econômica e financeira em português. O projeto foi desenvolvido por estudantes de Ciências Econômicas da UFPB (TPAE II, Equipe 01), em parceria com o Conselho Regional de Economia da Paraíba (CORECON-PB) e em apoio ao programa **PB sem dívidas**.

**[Acesse o site](https://samuel000px.github.io/educacao-financeira/#/)**

## O que você encontra no site

- **Enciclopédia e glossário A–Z** com termos de economia, exemplos, busca e conteúdos de nível básico, intermediário e avançado.
- **Simuladores** para explorar como juros, inflação e outras variáveis afetam decisões financeiras.
- **Trilhas de estudo e quiz** para aprender por tema e praticar o conteúdo.
- **[Metodologia e fontes](https://samuel000px.github.io/educacao-financeira/#/sobre)** para entender como o conteúdo foi organizado.

## Como copiar o projeto para sua conta

1. Entre na sua conta do GitHub e [abra este repositório](https://github.com/samuel000px/educacao-financeira).
2. Clique em **Fork**, no canto superior direito.
3. Em **Owner**, selecione sua conta. Mantenha o nome `educacao-financeira` e clique em **Create fork**.
4. Confira se o topo da página mostra seu usuário ao lado do nome do projeto.

## Como publicar sua cópia

1. Abra **Settings → Pages** no repositório da sua conta.
2. Em **Build and deployment → Source**, selecione **Deploy from a branch**.
3. Escolha a branch **main** e a pasta **/(root)**. Clique em **Save**.
4. Aguarde a publicação. Quando terminar, volte a **Pages** e clique em **Visit site**.

Se mantiver o nome do repositório, seu site ficará em `https://SEU-USUARIO.github.io/educacao-financeira/#/`. Você pode acompanhar a publicação pela aba **Actions**.

## Onde editar

| Arquivo ou pasta | O que contém |
| --- | --- |
| `index.html` | Estrutura inicial, menus e navegação do site |
| `assets/css/estilo.css` | Aparência do site |
| `assets/js/` | Navegação, busca, gráficos, simuladores e quiz |
| `data/glossario.json` | Termos, definições e exemplos |
| `data/trilhas.json` e `data/quiz.json` | Trilhas de estudo e perguntas |
| `data/indicadores.json` | Dados de indicadores econômicos |

O site usa HTML, CSS e JavaScript e carrega o conteúdo dos arquivos JSON. Para testar uma cópia no seu computador, abra a pasta com um servidor HTTP local. Se tiver Python instalado, execute `python -m http.server 8000` nessa pasta e abra [localhost:8000](http://localhost:8000/).

## Ativar login e acompanhamento no Supabase

1. **Banco.** Use um projeto Supabase dedicado ao Glossário. No **SQL Editor**, execute uma vez o arquivo [`supabase/migrations/20261110000000_trilhas_e_estatisticas.sql`](supabase/migrations/20261110000000_trilhas_e_estatisticas.sql). Ele cria as tabelas e funções e carrega o catálogo inicial a partir dos arquivos JSON do site.
2. **Login por e-mail.** Em **Authentication**, habilite o provedor de e-mail e novos cadastros por e-mail. Configure a URL do site em **URL Configuration**. Nos modelos **Confirm signup** e **Magic link**, use um corpo como `<p>Seu código para entrar no Glossário da Economia é <strong>{{ .Token }}</strong>.</p>`. Para abrir o login ao público, configure um [serviço de envio SMTP](https://supabase.com/docs/guides/auth/auth-smtp) próprio. O envio padrão do Supabase é limitado aos endereços da organização.
3. **Site.** Em [`assets/js/supabase-config.js`](assets/js/supabase-config.js), preencha a URL HTTPS do projeto e a chave **Publishable** (`sb_publishable_…`) obtidas no Supabase. Mantenha credenciais de banco, SMTP e chaves secretas fora do repositório. As duas configurações vazias deixam o site em modo local.
4. **Equipe.** Depois que cada integrante entrar no site uma vez, copie o **User UID** em **Authentication → Users**. No **SQL Editor**, libere apenas os UIDs autorizados com a instrução abaixo. A opção **Estatísticas da equipe** aparecerá em **Minha conta** na próxima carga.
5. **Validação e publicação.** Use duas contas de teste e uma conta da equipe. Confirme o recebimento de código, o acesso a uma trilha pelo link direto, a recuperação das marcações em outro navegador, o isolamento entre contas e o bloqueio do painel para alunos. No painel, confira as contagens antes e depois de marcar todos os conceitos de uma trilha. Após essa validação, integre a branch à `main` para publicar no GitHub Pages.

```sql
insert into educacao.equipe (usuario_id)
values ('SUBSTITUA_PELO_USER_UID')
on conflict do nothing;
```

### O que o acompanhamento mede

- Uma conta inicia uma trilha quando abre a página da trilha ou um de seus conceitos por um link da trilha. Reabrir uma trilha atualiza a atividade da conta sem aumentar o número de pessoas.
- A mesma marcação conta em todas as trilhas que incluem aquele conceito. Uma trilha é concluída quando a conta que a abriu marcou todos os seus conceitos como estudados. Remover a marcação recalcula o progresso e pode reverter a conclusão.
- O painel mostra pessoas que abriram trilhas, atividade nos últimos 30 dias, conclusões, taxa e progresso médio por trilha e quantas pessoas marcaram cada etapa. O painel recebe somente agregados. A lista de membros fica restrita à administração do banco.
- As marcações de visitante que já existiam continuam no navegador. Cada conta começa com seu próprio progresso, sem atribuir à pessoa atual o histórico de um dispositivo possivelmente compartilhado. O quiz continua registrando apenas o melhor resultado local, e os valores digitados nos simuladores ficam fora do acompanhamento.
- Se mudar os IDs ou a composição das trilhas no JSON, adicione uma migração que atualize o catálogo correspondente no banco antes de publicar. Mudanças de composição alteram o cálculo da conclusão.
