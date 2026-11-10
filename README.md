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
