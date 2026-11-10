begin;

create schema educacao;
revoke all on schema educacao from public, anon, authenticated, service_role;
grant usage on schema educacao to authenticated;

create table educacao.conceitos (
  id text primary key,
  titulo text not null
);

create table educacao.trilhas (
  id text primary key,
  titulo text not null,
  ordem integer not null unique
);

create table educacao.trilha_conceitos (
  trilha_id text not null references educacao.trilhas,
  conceito_id text not null references educacao.conceitos,
  ordem integer not null,
  primary key (trilha_id, conceito_id),
  unique (trilha_id, ordem)
);

create table educacao.progresso (
  usuario_id uuid not null references auth.users on delete cascade,
  conceito_id text not null references educacao.conceitos,
  estudado boolean not null,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, conceito_id)
);

create table educacao.trilhas_abertas (
  usuario_id uuid not null references auth.users on delete cascade,
  trilha_id text not null references educacao.trilhas,
  ultimo_acesso_em timestamptz not null default now(),
  primary key (usuario_id, trilha_id)
);

create table educacao.equipe (
  usuario_id uuid primary key references auth.users on delete cascade
);

alter table educacao.conceitos enable row level security;
alter table educacao.trilhas enable row level security;
alter table educacao.trilha_conceitos enable row level security;
alter table educacao.progresso enable row level security;
alter table educacao.trilhas_abertas enable row level security;
alter table educacao.equipe enable row level security;

revoke all on all tables in schema educacao from public, anon, authenticated, service_role;

-- A API expõe apenas os pontos de entrada em public. As funções privilegiadas
-- e as tabelas permanecem no schema privado educacao.
create function educacao.usuario_autenticado()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare usuario uuid := auth.uid();
begin
  if usuario is null or auth.jwt() ->> 'is_anonymous' = 'true' then
    raise exception 'É necessário entrar com uma conta' using errcode = '42501';
  end if;
  return usuario;
end;
$$;

create function educacao.ge_estado()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with conta as materialized (select educacao.usuario_autenticado() as id)
  select jsonb_build_object(
    'estudados', coalesce(
      (select jsonb_agg(p.conceito_id order by p.conceito_id)
       from educacao.progresso p where p.usuario_id = conta.id and p.estudado),
      '[]'::jsonb
    ),
    'equipe', exists (select 1 from educacao.equipe e where e.usuario_id = conta.id)
  )
  from conta;
$$;

create function educacao.ge_marcar_conceito(p_conceito text, p_estudado boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into educacao.progresso as atual (usuario_id, conceito_id, estudado)
  values ((select educacao.usuario_autenticado()), p_conceito, p_estudado)
  on conflict (usuario_id, conceito_id) do update
    set estudado = excluded.estudado, atualizado_em = now()
    where atual.estudado is distinct from excluded.estudado;
$$;

create function educacao.ge_abrir_trilha(p_trilha text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into educacao.trilhas_abertas as atual (usuario_id, trilha_id)
  values ((select educacao.usuario_autenticado()), p_trilha)
  on conflict (usuario_id, trilha_id) do update
    set ultimo_acesso_em = greatest(atual.ultimo_acesso_em, excluded.ultimo_acesso_em);
$$;

create function educacao.ge_estatisticas()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  usuario uuid := educacao.usuario_autenticado();
  resultado jsonb;
begin
  if not exists (select 1 from educacao.equipe e where e.usuario_id = usuario) then
    raise exception 'Acesso restrito à equipe' using errcode = '42501';
  end if;

  with atividade as (
    select a.usuario_id, a.trilha_id, tc.conceito_id,
           coalesce(p.estudado, false) as estudado,
           greatest(a.ultimo_acesso_em, p.atualizado_em) as atividade_em
    from educacao.trilhas_abertas a
    join educacao.trilha_conceitos tc on tc.trilha_id = a.trilha_id
    left join educacao.progresso p on p.usuario_id = a.usuario_id and p.conceito_id = tc.conceito_id
  ), por_pessoa as (
    select usuario_id, trilha_id, count(*) as total,
           count(*) filter (where estudado) as feitos, max(atividade_em) as atividade_em
    from atividade
    group by usuario_id, trilha_id
  ), por_trilha as (
    select trilha_id, count(*) as iniciaram,
           count(*) filter (where feitos = total) as concluiram,
           round(avg(100.0 * feitos / total), 1) as progresso_medio
    from por_pessoa
    group by trilha_id
  ), por_conceito as (
    select trilha_id, conceito_id, count(*) filter (where estudado) as estudaram
    from atividade
    group by trilha_id, conceito_id
  ), etapas as (
    select tc.trilha_id, jsonb_agg(jsonb_build_object(
      'titulo', c.titulo, 'estudaram', coalesce(pc.estudaram, 0)
    ) order by tc.ordem) as itens
    from educacao.trilha_conceitos tc
    join educacao.conceitos c on c.id = tc.conceito_id
    left join por_conceito pc on pc.trilha_id = tc.trilha_id and pc.conceito_id = tc.conceito_id
    group by tc.trilha_id
  )
  select jsonb_build_object(
    'pessoas', (select count(distinct usuario_id) from por_pessoa),
    'ativas_30d', (select count(distinct usuario_id) from por_pessoa where atividade_em >= now() - interval '30 days'),
    'pessoas_concluiram', (select count(distinct usuario_id) from por_pessoa where feitos = total),
    'trilhas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'titulo', t.titulo, 'iniciaram', coalesce(pt.iniciaram, 0),
        'concluiram', coalesce(pt.concluiram, 0), 'progresso_medio', pt.progresso_medio,
        'etapas', coalesce(e.itens, '[]'::jsonb)
      ) order by t.ordem)
      from educacao.trilhas t
      left join por_trilha pt on pt.trilha_id = t.id
      left join etapas e on e.trilha_id = t.id
    ), '[]'::jsonb)
  ) into resultado;

  return resultado;
end;
$$;

create function public.ge_estado()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select educacao.ge_estado(); $$;

create function public.ge_marcar_conceito(p_conceito text, p_estudado boolean)
returns void language sql security invoker set search_path = ''
as $$ select educacao.ge_marcar_conceito(p_conceito, p_estudado); $$;

create function public.ge_abrir_trilha(p_trilha text)
returns void language sql security invoker set search_path = ''
as $$ select educacao.ge_abrir_trilha(p_trilha); $$;

create function public.ge_estatisticas()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select educacao.ge_estatisticas(); $$;

revoke all on all functions in schema educacao from public, anon, authenticated, service_role;
grant execute on function educacao.ge_estado(), educacao.ge_marcar_conceito(text, boolean),
  educacao.ge_abrir_trilha(text), educacao.ge_estatisticas() to authenticated;

revoke all on function public.ge_estado(), public.ge_marcar_conceito(text, boolean),
  public.ge_abrir_trilha(text), public.ge_estatisticas() from public, anon, authenticated, service_role;
grant execute on function public.ge_estado(), public.ge_marcar_conceito(text, boolean),
  public.ge_abrir_trilha(text), public.ge_estatisticas() to authenticated;

-- Catálogo da versão inicial, a partir de data/glossario.json e data/trilhas.json.

insert into educacao.conceitos (id, titulo) values
  ('acoes', 'Ações'),
  ('alocacao-de-ativos', 'Alocação de ativos'),
  ('arrecadacao-tributaria', 'Arrecadação tributária'),
  ('balanca-comercial', 'Balança comercial'),
  ('balanco-de-pagamentos', 'Balanço de pagamentos'),
  ('banco-central-do-brasil', 'Banco Central do Brasil'),
  ('bancos-comerciais', 'Bancos comerciais'),
  ('bancos-de-investimento', 'Bancos de investimento'),
  ('bdrs', 'BDRs'),
  ('bens-substitutos-e-complementares', 'Bens substitutos e complementares'),
  ('cdb', 'CDB'),
  ('cdi', 'CDI'),
  ('ciclos-economicos', 'Ciclos econômicos'),
  ('comissao-de-valores-mobiliarios-cvm', 'Comissão de Valores Mobiliários (CVM)'),
  ('concorrencia-perfeita', 'Concorrência perfeita'),
  ('conselho-monetario-nacional', 'Conselho Monetário Nacional'),
  ('consumo-das-familias', 'Consumo das famílias'),
  ('copom', 'Copom'),
  ('credito', 'Crédito'),
  ('credito-rotativo-do-cartao', 'Crédito rotativo do cartão'),
  ('crescimento-economico', 'Crescimento econômico'),
  ('curva-de-juros', 'Curva de juros'),
  ('custo-de-oportunidade', 'Custo de oportunidade'),
  ('custo-efetivo-total-cet', 'Custo Efetivo Total (CET)'),
  ('custo-marginal', 'Custo marginal'),
  ('debentures', 'Debêntures'),
  ('deflacao', 'Deflação'),
  ('depositos', 'Depósitos'),
  ('desemprego', 'Desemprego'),
  ('desinflacao', 'Desinflação'),
  ('diversificacao', 'Diversificação'),
  ('divida-publica', 'Dívida pública'),
  ('dividendos', 'Dividendos'),
  ('dolar', 'Dólar'),
  ('elasticidade', 'Elasticidade'),
  ('endividamento', 'Endividamento'),
  ('equilibrio-de-mercado', 'Equilíbrio de mercado'),
  ('estagflacao', 'Estagflação'),
  ('etfs', 'ETFs'),
  ('expectativas-inflacionarias', 'Expectativas inflacionárias'),
  ('externalidades', 'Externalidades'),
  ('fiis', 'FIIs'),
  ('fluxo-de-caixa', 'Fluxo de caixa'),
  ('fundo-garantidor-de-creditos-fgc', 'Fundo Garantidor de Créditos (FGC)'),
  ('gastos-publicos', 'Gastos públicos'),
  ('hiperinflacao', 'Hiperinflação'),
  ('ibovespa', 'Ibovespa'),
  ('igp-m', 'IGP-M'),
  ('inadimplencia', 'Inadimplência'),
  ('inflacao', 'Inflação'),
  ('inflacao-acumulada', 'Inflação acumulada'),
  ('inflacao-de-custos', 'Inflação de custos'),
  ('inflacao-de-demanda', 'Inflação de demanda'),
  ('inflacao-inercial', 'Inflação inercial'),
  ('inflacao-monetaria', 'Inflação monetária'),
  ('inpc', 'INPC'),
  ('investimento-fbcf', 'Investimento (FBCF)'),
  ('investimentos', 'Investimentos'),
  ('ipca', 'IPCA'),
  ('juros', 'Juros'),
  ('juros-compostos', 'Juros compostos'),
  ('juros-nominais', 'Juros nominais'),
  ('juros-pos-fixados', 'Juros pós-fixados'),
  ('juros-prefixados', 'Juros prefixados'),
  ('juros-reais', 'Juros reais'),
  ('juros-remuneratorios', 'Juros remuneratórios'),
  ('juros-simples', 'Juros simples'),
  ('lci-e-lca', 'LCI e LCA'),
  ('liquidez', 'Liquidez'),
  ('lpa', 'LPA'),
  ('marcacao-a-mercado', 'Marcação a mercado'),
  ('mercado-interbancario', 'Mercado interbancário'),
  ('monopolio', 'Monopólio'),
  ('nucleos-de-inflacao', 'Núcleos de inflação'),
  ('oferta-e-demanda', 'Oferta e demanda'),
  ('oligopolio', 'Oligopólio'),
  ('orcamento-pessoal', 'Orçamento pessoal'),
  ('p-l', 'P/L'),
  ('p-vp', 'P/VP'),
  ('pib', 'PIB'),
  ('pib-nominal-e-real', 'PIB nominal e real'),
  ('pib-per-capita', 'PIB per capita'),
  ('poder-de-compra', 'Poder de compra'),
  ('politica-cambial', 'Política cambial'),
  ('politica-fiscal', 'Política fiscal'),
  ('politica-monetaria', 'Política monetária'),
  ('precos-monitorados', 'Preços monitorados'),
  ('produtividade', 'Produtividade'),
  ('recessao', 'Recessão'),
  ('regime-de-metas-para-a-inflacao', 'Regime de metas para a inflação'),
  ('renda-fixa', 'Renda fixa'),
  ('renda-variavel', 'Renda variável'),
  ('reserva-de-emergencia', 'Reserva de emergência'),
  ('reservas-internacionais', 'Reservas internacionais'),
  ('resultado-primario', 'Resultado primário'),
  ('risco-e-retorno', 'Risco e retorno'),
  ('roe', 'ROE'),
  ('roic', 'ROIC'),
  ('selic-meta-e-selic-efetiva', 'Selic meta e Selic efetiva'),
  ('sistema-financeiro-nacional', 'Sistema Financeiro Nacional'),
  ('spread-bancario', 'Spread bancário'),
  ('taxa-de-cambio', 'Taxa de câmbio'),
  ('taxa-de-participacao', 'Taxa de participação'),
  ('taxa-selic', 'Taxa Selic'),
  ('tesouro-direto', 'Tesouro Direto'),
  ('utilidade-marginal', 'Utilidade marginal'),
  ('valor-intrinseco', 'Valor intrínseco'),
  ('valuation', 'Valuation'),
  ('volatilidade', 'Volatilidade'),
  ('vpa', 'VPA');

insert into educacao.trilhas (id, titulo, ordem) values
  ('primeiros-passos', 'Primeiros passos: dinheiro no dia a dia', 1),
  ('inflacao-e-juros', 'Inflação e juros sem mistério', 2),
  ('investidor-iniciante', 'Investidor iniciante', 3),
  ('politica-monetaria', 'Como funciona a política monetária', 4),
  ('macro-brasil', 'Macroeconomia do Brasil', 5),
  ('microeconomia', 'Microeconomia essencial', 6),
  ('analise-empresas', 'Análise de empresas', 7),
  ('inflacao-avancada', 'Inflação: causas e dinâmica', 8);

insert into educacao.trilha_conceitos (trilha_id, conceito_id, ordem) values
  ('primeiros-passos', 'orcamento-pessoal', 1),
  ('primeiros-passos', 'reserva-de-emergencia', 2),
  ('primeiros-passos', 'juros', 3),
  ('primeiros-passos', 'juros-compostos', 4),
  ('primeiros-passos', 'endividamento', 5),
  ('primeiros-passos', 'credito-rotativo-do-cartao', 6),
  ('primeiros-passos', 'custo-efetivo-total-cet', 7),
  ('primeiros-passos', 'inflacao', 8),
  ('primeiros-passos', 'poder-de-compra', 9),
  ('inflacao-e-juros', 'inflacao', 1),
  ('inflacao-e-juros', 'ipca', 2),
  ('inflacao-e-juros', 'inpc', 3),
  ('inflacao-e-juros', 'igp-m', 4),
  ('inflacao-e-juros', 'inflacao-acumulada', 5),
  ('inflacao-e-juros', 'juros-nominais', 6),
  ('inflacao-e-juros', 'juros-reais', 7),
  ('inflacao-e-juros', 'taxa-selic', 8),
  ('inflacao-e-juros', 'cdi', 9),
  ('investidor-iniciante', 'investimentos', 1),
  ('investidor-iniciante', 'risco-e-retorno', 2),
  ('investidor-iniciante', 'renda-fixa', 3),
  ('investidor-iniciante', 'tesouro-direto', 4),
  ('investidor-iniciante', 'cdb', 5),
  ('investidor-iniciante', 'lci-e-lca', 6),
  ('investidor-iniciante', 'fundo-garantidor-de-creditos-fgc', 7),
  ('investidor-iniciante', 'renda-variavel', 8),
  ('investidor-iniciante', 'acoes', 9),
  ('investidor-iniciante', 'fiis', 10),
  ('investidor-iniciante', 'etfs', 11),
  ('investidor-iniciante', 'diversificacao', 12),
  ('politica-monetaria', 'banco-central-do-brasil', 1),
  ('politica-monetaria', 'conselho-monetario-nacional', 2),
  ('politica-monetaria', 'regime-de-metas-para-a-inflacao', 3),
  ('politica-monetaria', 'copom', 4),
  ('politica-monetaria', 'taxa-selic', 5),
  ('politica-monetaria', 'selic-meta-e-selic-efetiva', 6),
  ('politica-monetaria', 'mercado-interbancario', 7),
  ('politica-monetaria', 'expectativas-inflacionarias', 8),
  ('politica-monetaria', 'nucleos-de-inflacao', 9),
  ('politica-monetaria', 'politica-monetaria', 10),
  ('politica-monetaria', 'curva-de-juros', 11),
  ('macro-brasil', 'pib', 1),
  ('macro-brasil', 'pib-nominal-e-real', 2),
  ('macro-brasil', 'pib-per-capita', 3),
  ('macro-brasil', 'crescimento-economico', 4),
  ('macro-brasil', 'ciclos-economicos', 5),
  ('macro-brasil', 'recessao', 6),
  ('macro-brasil', 'estagflacao', 7),
  ('macro-brasil', 'politica-fiscal', 8),
  ('macro-brasil', 'resultado-primario', 9),
  ('macro-brasil', 'divida-publica', 10),
  ('macro-brasil', 'taxa-de-cambio', 11),
  ('macro-brasil', 'balanca-comercial', 12),
  ('macro-brasil', 'balanco-de-pagamentos', 13),
  ('macro-brasil', 'reservas-internacionais', 14),
  ('macro-brasil', 'desemprego', 15),
  ('macro-brasil', 'taxa-de-participacao', 16),
  ('macro-brasil', 'produtividade', 17),
  ('microeconomia', 'oferta-e-demanda', 1),
  ('microeconomia', 'equilibrio-de-mercado', 2),
  ('microeconomia', 'elasticidade', 3),
  ('microeconomia', 'bens-substitutos-e-complementares', 4),
  ('microeconomia', 'utilidade-marginal', 5),
  ('microeconomia', 'custo-de-oportunidade', 6),
  ('microeconomia', 'custo-marginal', 7),
  ('microeconomia', 'concorrencia-perfeita', 8),
  ('microeconomia', 'monopolio', 9),
  ('microeconomia', 'oligopolio', 10),
  ('microeconomia', 'externalidades', 11),
  ('analise-empresas', 'acoes', 1),
  ('analise-empresas', 'lpa', 2),
  ('analise-empresas', 'vpa', 3),
  ('analise-empresas', 'p-l', 4),
  ('analise-empresas', 'p-vp', 5),
  ('analise-empresas', 'roe', 6),
  ('analise-empresas', 'roic', 7),
  ('analise-empresas', 'dividendos', 8),
  ('analise-empresas', 'fluxo-de-caixa', 9),
  ('analise-empresas', 'valuation', 10),
  ('analise-empresas', 'valor-intrinseco', 11),
  ('analise-empresas', 'marcacao-a-mercado', 12),
  ('inflacao-avancada', 'inflacao-de-demanda', 1),
  ('inflacao-avancada', 'inflacao-de-custos', 2),
  ('inflacao-avancada', 'inflacao-inercial', 3),
  ('inflacao-avancada', 'inflacao-monetaria', 4),
  ('inflacao-avancada', 'hiperinflacao', 5),
  ('inflacao-avancada', 'deflacao', 6),
  ('inflacao-avancada', 'desinflacao', 7),
  ('inflacao-avancada', 'precos-monitorados', 8),
  ('inflacao-avancada', 'nucleos-de-inflacao', 9),
  ('inflacao-avancada', 'expectativas-inflacionarias', 10);

commit;
