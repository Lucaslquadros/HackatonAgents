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
  como cards, prosa abaixo), para conferir os 4 testes numa tela só em vez de
  abrir arquivo por arquivo.
- **Entregável:** a definir na implementação (ex.: página local ou artifact).
- **Checkpoint:** Lucas confere os 4 outputs numa tela só.
- **Status:** todo

## Bolt 5 — Preencher Operations

- **Objetivo:** Documentar em `03-operations/OPERATIONS.md` como rodar
  (`/enquadrar <pdf>`), como verificar que está saudável (os 2 critérios de
  aceite testados nos bolts 3 e 4), e o changelog desta primeira versão.
- **Entregável:** `OPERATIONS.md` preenchido.
- **Checkpoint:** Lucas confirma que o agente está pronto pra entrar no
  toolkit pré-hackathon.
- **Status:** todo
