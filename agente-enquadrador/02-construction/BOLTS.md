# Construction — Backlog de Bolts — Agente Enquadrador de Editais

> Um **bolt** é uma unidade pequena de trabalho, com um objetivo único e
> verificável. Um bolt por vez; parar no checkpoint antes de seguir.
>
> Status: `todo` → `em andamento` → `checkpoint` → `feito`

Peças escolhidas via `ai-dlc-template/FERRAMENTAS-CLAUDE-CODE.md`: este
agente é um Claude Code subagent (camada 1) + comando de barra como gatilho
(camada 2), sem hooks por enquanto (nenhuma validação mecânica crítica o
suficiente pra justificar ainda).

## Bolt 1 — Criar o subagente `agente-enquadrador`

- **Objetivo:** Escrever `.claude/agents/agente-enquadrador.md` com
  front-matter (`name`, `description`, `tools` restritas a leitura, sem
  `Write`/`Edit`) e o prompt de sistema cobrindo todos os requisitos
  funcionais e não-funcionais do Inception (anatomia do edital, engenharia
  reversa de critérios, expectativas implícitas, riscos, roteiro de Ackoff
  como perguntas, formato de saída front-matter + prosa, rastreabilidade
  fato vs. inferência, regra de não propor solução).
- **Entregável:** o arquivo do subagente.
- **Checkpoint:** Lucas revisa o prompt de sistema antes de qualquer teste.
- **Status:** feito

## Bolt 2 — Criar o comando de barra `/enquadrar`

- **Objetivo:** Escrever `.claude/commands/enquadrar.md` — gatilho fixo que
  recebe o caminho de um PDF e invoca o subagente `agente-enquadrador`.
- **Entregável:** o arquivo do comando.
- **Checkpoint:** Lucas confirma que o comando existe e o texto faz sentido
  (ainda sem rodar).
- **Status:** checkpoint — aguardando revisão do Lucas

## Bolt 3 — Testar contra editais bem estruturados

- **Objetivo:** Rodar contra `01-ufc-tjce-hackathon-2026.pdf`,
  `02-lowhack-2026-online.pdf` e `03-climatonbrasil-tcu-2026.md`, conferindo
  se a matriz de critérios sai correta em cada um.
- **Entregável:** outputs em `saidas/01-*.md`, `saidas/02-*.md`,
  `saidas/03-*.md`.
- **Checkpoint:** Lucas leu os 3 outputs. Achado relevante do próprio teste:
  nenhum dos 3 declara peso percentual nos critérios — "critério nomeado sem
  peso" é o caso comum, não a exceção; e a duração real varia bastante (8
  semanas / 37h corridas / 2 dias) — a suposição de 48h do prompt precisa
  seguir tratada como default, não como verdade.
- **Status:** checkpoint — aguardando confirmação do Lucas
  (nota: ainda rodado manualmente seguindo o prompt, não via `/enquadrar` de
  verdade — ver limitação de ambiente registrada no Bolt 2)

## Bolt 4 — Testar contra o caso de informação insuficiente

- **Objetivo:** Rodar contra `04-aws-breaking-barriers-2026.md` e confirmar
  que o agente sinaliza a ausência de critérios/restrições em vez de
  inventar uma matriz completa.
- **Entregável:** `saidas/04-aws-breaking-barriers-2026.md`.
- **Checkpoint:** Lucas confirma que não houve alucinação — o output ficou
  com `criterios: []`, `informacao_insuficiente: true` e uma recomendação
  (não inferência sobre conteúdo) para o squad buscar o edital real da
  edição específica.
- **Status:** checkpoint — aguardando confirmação do Lucas

## Bolt 4.1 — Tela de visualização dos testes

- **Objetivo:** Renderizar os `.md` de `saidas/` de forma legível (front-matter
  como cards, prosa abaixo), para conferir os testes numa tela só em vez de
  abrir arquivo por arquivo.
- **Entregável:** Artifact HTML publicado, cobrindo os 6 outputs de `saidas/`.
- **Checkpoint:** Lucas confere os outputs numa tela só e dá feedback sobre a
  qualidade do agente.
- **Status:** feito

## Bolt 6 — Testar contra o lote novo de editais (`editais-referencia/editais_hackathons/`)

- **Objetivo:** Garantir que todo edital de teste disponível no repositório
  passa pelo agente. Essa pasta (movida pelo Lucas de `aulas/` para dentro de
  `editais-referencia/` entre sessões) trazia 2 arquivos candidatos:
  `Ideathon_Energisa_2026_Regulamento.md` e `Low_Hack_2026_Regulamento.md`.
- **Achado antes de rodar o agente:** `Low_Hack_2026_Regulamento.md` é o
  **mesmo edital** já coberto por `saidas/02-lowhack-2026-online.md` (mesmo
  eventos Siemens/Mendix, mesmo texto — só reconstruído em formato diferente
  a partir do PDF oficial). Rodar de novo seria trabalho redundante, não um
  caso de teste novo — pulado conscientemente, não por omissão.
- **Rodado:** `Ideathon_Energisa_2026_Regulamento.md` (edital de fato inédito
  na coleção) → `saidas/06-ideathon-energisa-2026.md`. Achado principal: é o
  primeiro edital da coleção com duração real *abaixo* de 48h (13h corridas,
  9h-22h de um único dia) — o oposto do problema visto no edital 01 (~8
  semanas). Achado secundário: ambiguidade entre a nota de "entregáveis"
  (documentação, item 8.2) e a nota dos 5 critérios (item 8.2.4) — o
  regulamento não deixa claro se compõem o mesmo ranking ou se a primeira só
  serve de desempate.
- **Checkpoint:** Lucas confirma que a cobertura está completa (todo edital
  disponível em `editais-referencia/` — incluindo a subpasta — tem uma saída
  correspondente ou está explicitamente marcado como duplicata) e avalia a
  qualidade do output 06 na tela do Bolt 4.1.
- **Status:** checkpoint — aguardando confirmação do Lucas

## Bolt 7 — Testar edital trazido pelo Lucas (Hackathon Climático: Água — SECLIMA/SP)

- **Objetivo:** Lucas trouxe um link do Diário Oficial da Cidade de São
  Paulo (Edital 02/2026, Hackathon Climático: Água, SECLIMA) e pediu para
  adicionar esse edital à coleção de testes.
- **Como foi capturado:** primeira tentativa via WebFetch (resumo por IA)
  ficou incompleta — não pegou a estrutura de duas etapas de avaliação
  nem o critério de "justiça climática" citado no texto oficial. Segunda
  tentativa: baixei o HTML da página diretamente (`curl`) e extraí o texto
  literal decodificando as entidades HTML — o `md_epubli_visualizar.php`
  da Prefeitura entrega o texto completo do edital dentro do próprio HTML,
  não só como imagem. Resultado ficou em
  `editais-referencia/06-hackathon-climatico-agua-sp-2026.md`, transcrição
  literal, não resumo.
- **Rodado:** → `saidas/07-hackathon-climatico-agua-sp-2026.md`. Achados:
  (1) primeiro edital da coleção com **peso de critério realmente
  declarado** (tabela de pontos 0-10, não "critério nomeado sem peso" como
  nos 6 casos anteriores); (2) duas etapas de avaliação distintas
  (prévia/SECLIMA e presencial/banca) e um critério de pré-seleção
  ("abordagem de justiça climática") que não aparece na tabela de pontos —
  ambiguidade real não resolvida pelo texto; (3) o edital substitui uma
  versão anterior (01/2026), risco de squad usar edital revogado.
- **Checkpoint:** Lucas confere o output 07 no painel de avaliação e
  confirma se a leitura do critério de "justiça climática" como ambiguidade
  (em vez de simplesmente ignorá-lo por não estar na tabela) faz sentido.
- **Status:** checkpoint — aguardando confirmação do Lucas

## Bolt 5 — Preencher Operations

- **Objetivo:** Documentar em `03-operations/OPERATIONS.md` como rodar
  (`/enquadrar <pdf>`), como verificar que está saudável (os 2 critérios de
  aceite testados nos bolts 3 e 4), e o changelog desta primeira versão.
- **Entregável:** `OPERATIONS.md` preenchido.
- **Checkpoint:** Lucas confirma que o agente está pronto pra entrar no
  toolkit pré-hackathon.
- **Status:** todo
