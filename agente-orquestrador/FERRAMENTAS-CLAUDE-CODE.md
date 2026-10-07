# Ferramentas do Claude Code para construir os agentes

Sem usar stack da AWS, o Claude Code sozinho já cobre criação,
personalização e edição de cada agente da plataforma. Este arquivo cataloga
essas peças e quando usar cada uma. Objetivo: nas decisões de Construction
(`BOLTS.md`), escolher a peça certa em vez de decidir ad-hoc a cada bolt.

Este arquivo mora no `ai-dlc-template/` — todo agente novo (copiado do
template) já nasce com ele. Não precisa ser redecidido a cada Inception.

## 1. Definição do agente em si

**Subagente** — `.claude/agents/<nome>.md`. A unidade fundamental de "um
agente especializado".

- Front-matter: `name`, `description` (usada por humanos e também pelo
  Claude Code pra decidir sozinho quando invocar esse subagente, se o
  pedido bater com a descrição), `tools` (lista branca do que ele PODE
  fazer), `model` (pode fixar um modelo mais barato/rápido pra tarefas
  simples).
- Corpo do arquivo = prompt de sistema do agente.
- Uso no projeto: cada agente da plataforma (Enquadrador, Alinhamento, os
  que vierem depois) é um arquivo desses.

## 2. Como/quando o agente é chamado

- **Comando de barra** — `.claude/commands/<nome>.md`. Gatilho fixo e
  repetível (ex.: `/enquadrar edital.pdf`). Roda no contexto principal e
  pode instruir a chamar um subagente. É o jeito mais determinístico de "o
  squad sabe exatamente como iniciar cada etapa", sem depender de like
  natural ambíguo.
- **Skill** — `.claude/skills/<nome>/SKILL.md`. Parecido com comando, mas
  pode ser autoinvocado por descrição — o Claude decide usar sozinho quando
  o contexto pede, sem o usuário digitar `/nome`.
- **Diferença prática para este projeto:** comando de barra = ritual
  explícito do squad ("agora vamos rodar o enquadrador"); skill = ativação
  implícita. Pra manter o squad no controle — regra de ouro da disciplina —
  **prefira comando de barra**: quem decide quando invocar é o squad, não a
  IA sozinha.

## 3. Garantias mecânicas (não dependem do modelo "lembrar" do prompt)

- **`tools` no front-matter do subagente** — ex.: um agente sem `Write`/
  `Edit` fisicamente não consegue propor/escrever solução, mesmo que
  "esqueça" a instrução. Já é o mecanismo usado para a regra "não propor
  solução" do Agente Enquadrador.
- **Hooks** — `.claude/settings.json`. Comandos de shell reais disparados em
  eventos (antes/depois de uma tool call, ao parar de responder). É o único
  mecanismo verdadeiramente determinístico, no sentido de state machine.
  Uso possível: validar que a saída de um agente tem os campos obrigatórios
  do front-matter antes de considerar um bolt concluído.
- **Permissions** — `.claude/settings.local.json`. Allow/deny/ask por
  ferramenta ou comando. Já existe um exemplo no template (WebFetch liberado
  só para `github.com` e `aws.amazon.com`).

## 4. Estado e memória

- **Arquivo em disco** — padrão adotado para estado compartilhado entre
  agentes (ex.: a saída do Enquadrador sendo lida pelo Agente de
  Alinhamento). Vantagem sobre memória de sessão: versionável no git,
  revisável, transparente.
- **`CLAUDE.md`** — carregado automaticamente em toda sessão do projeto; é
  onde regras permanentes vivem (já rege o fluxo Inception → Construction →
  Operations).
- **Memória de longo prazo entre sessões** (recurso mais avançado do Claude
  Code, fora do repositório do projeto) — só vale considerar se um dia um
  agente precisar "lembrar" contexto sem reler um arquivo de estado
  explícito. Não necessário agora: arquivo em disco já resolve com mais
  transparência.

## 5. Interação estruturada com o squad

- **Pergunta estruturada ao usuário** (múltipla escolha + texto livre, com
  opções nomeadas) — é o mecanismo certo para um agente que precisa **forçar
  uma decisão** do squad em vez de só sugerir em prosa. Relevante sobretudo
  para o futuro Agente de Alinhamento: em um checkpoint da jornada de 48h,
  ele pode obrigar o squad a escolher/responder objetivamente, em vez de
  devolver um parágrafo de "pense a respeito" que é fácil de ignorar.

## 6. Integração externa (se um dia precisar)

- **MCP servers** — conectam o Claude Code a sistemas externos (ex.: ler um
  board de Trello do squad, um e-mail, um site de edital publicado). Não é
  necessário agora, mas é o caminho nativo se algum agente precisar puxar
  dados direto de onde o squad já trabalha, em vez do squad colar tudo
  manualmente.

## 7. Empacotar e distribuir (quando for além do seu squad)

- **Plugins** — empacotam agentes/comandos/skills num pacote instalável por
  outras pessoas. Só relevante quando a plataforma abrir para outros squads
  da turma — hoje o escopo decidido é "só o seu squad" (ver Inception de
  cada agente). Guardar essa opção para quando o escopo mudar.

## Como isso se aplica no dia a dia

- Ao escrever `BOLTS.md` de um agente novo, para cada bolt pergunte: "isso é
  definição de agente (seção 1), gatilho (2), garantia mecânica (3), estado
  (4), interação (5), integração externa (6) ou distribuição (7)?" — e use a
  peça correspondente em vez de inventar um mecanismo novo.
- Regras de negócio específicas de um agente (ex.: "não propor solução")
  continuam vivendo no `INCEPTION.md` daquele agente; este arquivo só lista
  o *como* implementar esse tipo de regra com as ferramentas disponíveis.
