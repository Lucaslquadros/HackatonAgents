# Hack_OS — Roadmap da plataforma

> Visão geral de longo prazo. Não substitui o Inception de cada subagente —
> cada item abaixo vira seu próprio ciclo AI-DLC (`01-inception/INCEPTION.md`
> próprio) quando chegar a vez dele. Isto aqui é só o mapa pra não perder o
> desenho enquanto trabalhamos um agente por vez.

## Visão

Uma plataforma de agentes de IA que apoia squads de alunos a vencer
hackathons, mantendo o time — não a IA — dono das decisões que importam
(Fórmula da Eficácia: "eficácia exige escolha, não conformidade"). Um
orquestrador encadeia subagentes especializados; a interface evolui, no
tempo, para algo visual onde o squad acompanha as hipóteses que criou e
validou ao longo do hackathon.

Base pedagógica: disciplina *Hackathons, Innovation Challenges e IA*
(IBMEC, Prof. Ari Amaral) — ver `aulas/`. A jornada de 48h ensinada na
Aula 2 (**Enquadrar → Divergir → Decidir → Construir → Narrar → Defender**)
é o mapa natural para os subagentes: cada fase tem um tipo de decisão
diferente, e um agente por fase é mais fácil de testar do que um agente
genérico fazendo tudo.

## Padrão técnico de implementação

Decisão (confirmada nesta conversa): usar só as ferramentas nativas do
Claude Code para construir os agentes, sem comprometer com stack AWS
(Bedrock Agents etc.) por enquanto — "AI-DLC" aqui é processo, não
infraestrutura. Isso corresponde ao padrão **orchestrator-subagent** que a
AWS Prescriptive Guidance descreve para arquitetura multiagente (orquestrador
decompõe, delega, rastreia estado e sintetiza resultados sem executar o
trabalho ele mesmo) — só que implementado com os mecanismos abaixo em vez de
Bedrock/Step Functions/DynamoDB.

| Papel no padrão AWS | Peça equivalente no Claude Code |
|---|---|
| Subagente especializado | `.claude/agents/*.md` — front-matter (nome, descrição, `tools`, modelo) + prompt de sistema no corpo |
| Guarda de escopo do subagente | A lista `tools` do front-matter — restrição aplicada pelo harness, não pelo prompt. Ex.: um agente que não pode propor solução simplesmente não tem `Write`/`Edit` liberado |
| Gatilho de quando o orquestrador delega | Comandos de barra (`.claude/commands/*.md`) — chamada determinística e repetível, em vez do orquestrador "decidir sozinho" quando rodar cada etapa |
| Validação mecânica (opcional) | Hooks (`settings.json`) — únicos pontos realmente determinísticos no sentido tradicional |
| Estado/memória compartilhada entre agentes | Arquivo em disco (ex.: a saída do Agente Enquadrador lida como referência pelo Agente de Alinhamento) — versionável no git, sem precisar de S3/DynamoDB |
| Gate final antes de avançar de fase | Checkpoint humano (já previsto no `CLAUDE.md` do AI-DLC) — o gate mais importante pro objetivo pedagógico: o squad decide, a IA não decide por ele |

Esse padrão vale para todo agente novo da plataforma, não só o Enquadrador —
não precisa ser redecidido a cada Inception. Catálogo completo, com todos os
mecanismos do Claude Code disponíveis (incluindo os ainda não usados, como
MCP servers e plugins) em `ai-dlc-template/FERRAMENTAS-CLAUDE-CODE.md` — esse
arquivo viaja com o template para todo agente novo.

## Subagentes

| # | Nome (provisório) | Fase da jornada | Entrega da disciplina que cobre | Status |
|---|---|---|---|---|
| 1 | Agente Enquadrador de Editais | Enquadrar (0-4h) | AC1 — matriz de análise de edital | Em Inception → `agente-enquadrador/` |
| 2 | Agente de Alinhamento Contínuo | Divergir → Decidir → Construir → Narrar | AC2 (problem framing/discovery) e AC4 (AI Hackathon Stack e plano de validação) | Backlog — Inception próprio ainda não iniciado |
| 3 | Agente Orquestrador + experiência (porta/pacto/sala) | Toda a jornada (camada visual + gestão do squad) | AC4 (AI Hackathon Stack) / AP2 (Demo Day) | Ideia capturada → `VISAO-EXPERIENCIA.md` — Inception ainda não iniciado |

### Agente 1 — Enquadrador de Editais

Lê o edital (PDF), destrincha a anatomia (desafio, restrições, entregáveis,
critérios), faz engenharia reversa dos critérios em matriz de peso →
alocação de horas, levanta expectativas implícitas e risco de
desclassificação. Não propõe solução. Roda uma vez (stateless), no início
do hackathon. Ver `agente-enquadrador/01-inception/INCEPTION.md`.

### Agente 2 — Alinhamento Contínuo (conceito, ainda sem Inception)

Ideia original do Lucas: o squad manda "reports" de progresso pra IA ao
longo das 48h, e a IA observa se o que está sendo construído ainda está
alinhado ao edital — devolvendo **perguntas**, não vereditos ou respostas
prontas, nos momentos certos da jornada (ex.: fim de Enquadrar, fim de
Divergir, fim de Decidir, checkpoints do Construir, antes de Narrar).

- Diferença estrutural do Agente 1: é **stateful** — precisa da matriz de
  critérios do Agente 1 como referência fixa contra a qual audita os
  reports do squad, e precisa saber *quando* intervir, não só *o quê*
  perguntar.
- Motor conceitual: o roteiro de decisão de Ackoff (Fórmula da Eficácia —
  qual problema isso resolve, que suposição está sendo assumida, qual o
  menor teste possível, o que conta como evidência, qual o Δt) e o papel
  "quem sustenta o problema" da Aula 2.
- Risco de design a vigiar: se começar a sugerir respostas em vez de só
  perguntar, mina o próprio propósito pedagógico do curso — time que só
  recebe decisão pronta não é eficaz, só eficiente naquilo que a IA decidiu.
- Quando abrir o Inception: depois que o Agente 1 estiver validado e rodando
  — evita travar os dois ciclos ao mesmo tempo.

### Componente 3 — Orquestrador + experiência (conceito, ainda sem Inception)

Ideia original do Lucas: front-end começa fechado (metáfora de porta/casa),
o squad sela um "pacto" de alinhamento com o edital antes de entrar — gesto
com peso emocional, não um checkbox — e só então a sala se abre revelando os
agentes disponíveis, com o orquestrador explicando o fluxo e ajudando a
executar a etapa da vez. Detalhe completo, com a conexão pedagógica de cada
parte da ideia, em `VISAO-EXPERIENCIA.md`.

- Diferença dos agentes 1 e 2: este é o componente **de gestão e interface**
  — ele não faz análise de edital nem checkpoint de alinhamento sozinho,
  orquestra os agentes que fazem isso e dá forma à experiência do squad.
- Quando abrir o Inception: depois que os Agentes 1 e 2 estiverem validados
  — o orquestrador precisa ter o que orquestrar antes de fazer sentido
  desenhar a experiência em cima dele.

## Por que dois agentes e não um só

Testado contra a regra do próprio `CLAUDE.md` do AI-DLC: um bolt/ciclo tem
que ser descritível em 1-2 frases. "Ler um edital e estruturar critérios"
e "acompanhar o squad por 48h e questionar alinhamento" são objetivos,
ciclos de vida e critérios de teste diferentes — combiná-los num agente só
quebraria essa regra e tornaria qualquer um dos dois mais difícil de
validar isoladamente.
