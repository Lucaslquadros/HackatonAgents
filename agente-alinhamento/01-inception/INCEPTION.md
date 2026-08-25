# Inception — Agente de Alinhamento Contínuo

## Objetivo

O segundo subagente da plataforma. Ao longo da jornada do hackathon, o squad
manda **reports de progresso** (o que fez, o que decidiu, para onde está
indo), e o agente audita se o que está sendo construído ainda responde ao
edital — usando a matriz de critérios do Agente Enquadrador como referência
fixa e o roteiro de decisão de Ackoff como motor. A resposta do agente é
**sempre uma pergunta**, nunca um veredito ("vocês estão certos/errados")
nem uma sugestão de caminho — ele automatiza o papel "quem sustenta o
problema" da Aula 2: *"faz a pergunta 'isso resolve o quê?' quando todos se
empolgam."*

Diferente do Agente Enquadrador (que roda uma vez, stateless, no início),
este agente é **stateful** e roda várias vezes ao longo da jornada: precisa
lembrar o que já foi reportado e perguntado antes, e precisa decidir não só
*o quê* perguntar, mas *quando* vale a pena interromper o squad para
perguntar — o recurso mais escasso do hackathon é tempo, e uma pergunta feita
na hora errada é tão custosa quanto uma resposta pronta.

## Contexto

- **Disciplina:** Hackathons, Innovation Challenges e IA — IBMEC, Prof. Ari
  Amaral, 2026 (7º período, 80h).
- **Material-base:** Aula 2 — os papéis do squad (em especial "quem sustenta
  o problema" e "quem protege o tempo") e a jornada de 48h (Enquadrar →
  Divergir → Decidir → Construir → Narrar → Defender); "A Fórmula da
  Eficácia" (Ackoff/Drucker/Vale), cujo roteiro de 5 perguntas — qual
  problema isso resolve, que suposição está sendo assumida, qual o menor
  teste possível, o que conta como evidência, qual o Δt — é o motor
  conceitual deste agente. Arquivos em `aulas/`.
- **Onde isso se encaixa na plataforma maior:** este agente lê a saída do
  Agente Enquadrador (`agente-enquadrador/`) como **estado compartilhado em
  arquivo**, conforme o padrão já registrado em `Hack_OS/ROADMAP.md`. Ele não
  refaz a leitura do edital — assume que a matriz de critérios já existe e a
  trata como referência fixa contra a qual audita cada report do squad.
- **Alinhamento com o plano de ensino oficial:** a disciplina tem 5 entregas
  de Avaliação Continuada (AC) — matriz de análise de edital; **problem
  framing e discovery**; Product Vision e hipóteses; **AI Hackathon Stack e
  plano de validação**; protótipo inicial e roteiro de pitch (ver
  `Plano_Aula_2026.1...pdf`, seção 8). Este agente sustenta diretamente a
  **AC2** (problem framing/discovery — é literalmente reforçar o framing do
  problema a cada report) e a **AC4** (AI Hackathon Stack e plano de
  validação — o próprio ciclo Inception→Construction deste agente é um nó
  real desse "stack de agentes de IA" que a semana 14 do plano de ensino
  pede para desenhar). Também sustenta a "Blindagem de Q&A" (semana 18): um
  squad que já foi questionado várias vezes ao longo do caminho chega mais
  preparado para a banca do que um squad que só ouviu "ótimo trabalho".
- **Nota real de teste (2026-08-24):** ao rodar o Agente Enquadrador contra o
  edital real do I Hackathon TJCE-UFC 2026, descobrimos que nem todo
  hackathon segue as 48h contínuas da Aula 2 — esse edital específico tem
  ~8 semanas de duração com marcos síncronos espalhados no tempo. Isso é
  central para este Inception: "os momentos certos da jornada" (fim de
  Enquadrar, fim de Divergir, fim de Decidir, checkpoints do Construir,
  antes de Narrar) não podem ser hardcoded como horas fixas de uma janela de
  48h — precisam ser inferidos a partir da estrutura real do edital/squad, ou
  perguntados diretamente. Ver Riscos e Perguntas de validação abaixo.
- **Prazo:** sem data travada. O ROADMAP registra que este Inception só
  deveria abrir depois do Agente Enquadrador validado, para não travar dois
  ciclos ao mesmo tempo — isto está sendo escrito **em paralelo**, como
  pesquisa e redação, enquanto o Lucas termina de validar o Agente 1; a
  Construction deste agente só começa depois que este documento for validado
  por ele.
- **Metodologia de processo:** AI-DLC (versão solo). Mesma decisão do Agente
  1: "AI-DLC" aqui é processo (Inception → Construction → Operations), sem
  compromisso com stack de execução AWS.
- **Padrão técnico de implementação (já decidido para toda a plataforma, não
  reabrir aqui):** Claude Code subagent (`.claude/agents/*.md`) com `tools`
  restritas como guarda mecânica; comando de barra como gatilho
  determinístico; arquivo em disco como estado compartilhado; checkpoint
  humano como gate de fase. Detalhe completo em `Hack_OS/ROADMAP.md` e
  `ai-dlc-template/FERRAMENTAS-CLAUDE-CODE.md` (a seção 5, "Interação
  estruturada com o squad", é a peça mais relevante para este agente
  especificamente — ver Requisitos não-funcionais).

## Requisitos funcionais

- [ ] Ler a saída do Agente Enquadrador (front-matter YAML + prosa) como
      referência fixa: `criterios[]`, `pesos`, `alocacao_horas_sugerida`,
      `riscos[]`, `expectativas_implicitas[]`, `desafio_central`.
- [ ] Receber um report de progresso do squad (formato exato — texto livre,
      resposta a um comando de barra com perguntas fixas, ou outro — é uma
      pergunta de validação em aberto, ver abaixo).
- [ ] Decidir, a cada report recebido, se **este é um momento que vale
      intervir** — não perguntar sempre que o squad manda um report, só
      quando há sinal real de risco de desalinhamento com a matriz de
      critérios ou com o desafio central. Essa decisão precisa considerar a
      estrutura real da jornada daquele hackathon específico (48h contínuas
      ou não — ver Riscos), não uma janela fixa hardcoded.
- [ ] Quando decidir intervir, comparar o conteúdo do report contra a matriz
      de critérios de referência e aplicar o roteiro de Ackoff ao que o
      squad está reportando: qual problema isso resolve, que suposição está
      sendo assumida, qual o menor teste possível, o que conta como
      evidência, qual o Δt.
- [ ] Devolver a intervenção **exclusivamente como pergunta(s)** — nunca
      como resposta, veredito ("vocês estão no caminho certo/errado") ou
      sugestão de solução/próximo passo.
- [ ] Usar o mecanismo de **pergunta estruturada ao usuário** (múltipla
      escolha nomeada + texto livre — ver seção 5 do
      `FERRAMENTAS-CLAUDE-CODE.md`) para forçar uma decisão objetiva do
      squad, em vez de devolver um parágrafo de "pense a respeito" fácil de
      ignorar sob pressão de tempo.
- [ ] Manter um histórico dos reports recebidos e das perguntas já feitas
      (arquivo em disco, mesmo padrão de estado da plataforma) — para não
      repetir a mesma pergunta duas vezes e para o squad poder olhar para
      trás e ver a evolução do próprio alinhamento ao longo do hackathon.
- [ ] Reconhecer quando um report não tem informação suficiente para avaliar
      alinhamento (ex.: "estamos indo bem", sem conteúdo verificável) e, nesse
      caso, sinalizar a insuficiência em vez de forçar uma pergunta genérica
      sem substância — mesmo princípio de rastreabilidade do Agente 1
      aplicado aqui: não fabricar um sinal de desalinhamento que não está lá.
- [ ] Quando sinalizar uma possível divergência, apontar explicitamente a
      qual critério/expectativa da matriz de referência ela se relaciona —
      a pergunta devolvida precisa ser rastreável até um ponto concreto do
      edital, não uma dúvida filosófica solta.

## Requisitos não-funcionais

- [ ] **Nunca sugerir resposta.** É a versão deste agente da regra "não
      propor solução" do Agente 1 — e é ainda mais crítica aqui, porque este
      agente intervém repetidamente ao longo de toda a jornada, não uma vez
      só no início. Referência direta da Fórmula da Eficácia: *"um time que
      só recebe decisões prontas não pode ser eficaz — no máximo, eficiente
      naquilo que outro decidiu."* **Mecanismo:** `tools` do subagente
      restritas a leitura (`Read`, `Grep`, `Glob`) — sem `Write`/`Edit`,
      mesmo padrão do Agente 1. Diferença importante em relação ao Agente 1:
      a falta de `Write`/`Edit` impede o agente de *materializar* uma
      resposta (não consegue escrever um plano, um mockup, um trecho de
      código), mas **não impede sozinha** que ele sugira algo em prosa — o
      reforço mecânico mais forte aqui é o **formato de saída obrigatório em
      pergunta estruturada** (seção 5 do `FERRAMENTAS-CLAUDE-CODE.md`): um
      agente que só pode devolver perguntas com opções nomeadas tem muito
      menos espaço para deslizar para "vocês deveriam fazer X" do que um
      agente devolvendo parágrafos livres. As duas garantias juntas (tools +
      formato de saída) são mais fortes que qualquer uma isolada — mas
      nenhuma das duas é 100% mecânica sozinha; isso é um risco a monitorar
      no teste real (ver Riscos).
- [ ] **Persistência do estado não exige `Write` no próprio agente.** Mesmo
      padrão do Agente Enquadrador: o subagente devolve sua resposta
      completa (perguntas + o que deveria entrar no histórico) como saída;
      quem o invoca (o comando de barra) decide persistir em disco. Isso
      mantém a mesma garantia mecânica de "só leitura" para os dois agentes,
      sem abrir uma exceção de `Write` só porque este agente é stateful.
- [ ] **Rastreabilidade fato vs. inferência**, herdada do Agente 1: toda
      pergunta devolvida precisa deixar claro se está ancorada em algo
      literal do report do squad ou da matriz de referência, ou se é
      inferência do agente.
- [ ] **Não hardcodear a estrutura da jornada em horas de 48h contínuas.**
      A lógica de "quando intervir" precisa funcionar tanto para o formato
      clássico da Aula 2 quanto para formatos como o do edital real
      TJCE-UFC (~8 semanas, marcos síncronos). Ver Riscos e Perguntas de
      validação — este é o requisito não-funcional mais incerto do
      documento, porque depende de uma fonte de informação (cronograma real
      do hackathon) que o Agente 1 hoje não estrutura como campo dedicado.
- [ ] **Custo de intervenção proporcional ao tempo do squad.** O papel
      "quem protege o tempo" (Aula 2) existe por um motivo — este agente não
      pode se comportar como se tivesse tempo infinito para questionar.
      Cada intervenção deve custar pouco tempo de leitura/resposta ao squad
      (na linha do "15-20 minutos" do Agente 1, mas aqui provavelmente bem
      menor por intervenção, já que são várias ao longo da jornada).

## Riscos / pontos de incerteza

- **Risco central (o mesmo do Agente 1, com um vetor de ataque maior):** se
  o agente escorregar de "pergunta" para "sugestão", ele mina o propósito
  pedagógico do curso inteiro — e, diferente do Agente 1 (que roda uma vez),
  este agente tem múltiplas chances de escorregar ao longo da jornada
  inteira, o que aumenta a superfície de risco.
- **Falso positivo / "menino que grita lobo":** se o agente sinalizar
  divergência para escolhas que são, na verdade, decisões legítimas do squad
  dentro da margem que o edital permite, o squad aprende a ignorar as
  perguntas — e a ferramenta perde a força exatamente no momento em que
  fosse mais necessária.
- **Granularidade mal calibrada:** perguntar demais atropela o "quem protege
  o tempo" e rouba tempo de um recurso que a Aula 2 chama de "o único que
  não dá para negociar"; perguntar de menos deixa o squad divergir sem
  perceber até o congelamento de escopo (o "ponto sem retorno" da jornada de
  48h) já ter passado.
- **Dependência de uma informação que o Agente 1 não estrutura hoje.** O
  front-matter atual da saída do Agente Enquadrador
  (`agente-enquadrador/.claude/agents/agente-enquadrador.md`) tem
  `duracao_assumida_horas` como número solto (48 salvo o edital diga outro),
  mas **não tem um campo estruturado de cronograma/marcos**. Para o caso
  TJCE-UFC (~8 semanas com marcos síncronos), a informação de "quando as
  fases realmente acontecem" não está capturada em lugar nenhum de forma
  estruturada — só, na melhor das hipóteses, mencionada em prosa. Como o
  enunciado desta tarefa é explícito que **não devemos tocar no Agente 1
  agora**, este é um gap real que o Agente 2 precisa contornar (perguntando
  ao squad diretamente?) em vez de resolver na fonte — ver Perguntas de
  validação.
- **Tensão arquitetural entre "squad no controle" e "o agente sabe quando
  intervir".** O `FERRAMENTAS-CLAUDE-CODE.md` recomenda comando de barra
  (gatilho explícito, squad decide quando rodar) em vez de skill autoinvocada,
  exatamente para manter o squad dono da decisão de quando envolver a IA.
  Mas a proposta original deste agente é "saber os momentos certos de
  intervir" — o que soa proativo. Resolução provável (a confirmar com o
  Lucas): o agente é sempre **reativo** — só roda quando o squad manda um
  report via comando de barra — mas, uma vez invocado, a inteligência do
  agente está em decidir *se aquele é um momento que merece pergunta* e
  *qual pergunta*, não em decidir sozinho quando ser chamado. Isso preserva
  "squad no controle" mas desloca parte do requisito "saber quando" para
  dentro de cada invocação, não para fora dela.
- **Reports pobres em conteúdo.** Um squad sob pressão de tempo tende a
  escrever reports curtos e vagos ("seguimos com o MVP"). O agente precisa
  reconhecer isso como informação insuficiente (ver Requisitos funcionais)
  em vez de inventar um sinal de alinhamento ou desalinhamento que o report
  não sustenta.
- **Ainda não existem exemplos reais de report de squad no repositório** —
  diferente do Agente 1, que teve `editais-referencia/` como massa de teste
  desde o início. Os critérios de aceite abaixo dependem de exemplos
  sintéticos até que existam reports reais de um hackathon rodando.

## Critérios de aceite

- Rodar contra pelo menos uma saída real do Agente Enquadrador (assim que
  disponível em `agente-enquadrador/saidas/` ou equivalente) **e** contra
  reports de squad simulados cobrindo pelo menos três cenários: (1) report
  claramente alinhado ao desafio central, (2) report com sinal claro de
  divergência de um critério específico da matriz, (3) report vago demais
  para avaliar.
- No cenário (2), a pergunta devolvida aponta explicitamente para o
  critério/expectativa da matriz de referência que motivou a dúvida.
- No cenário (3), o agente sinaliza informação insuficiente em vez de
  inventar uma divergência — mesmo teste de rigor que o Agente 1 passou
  contra o edital sem critérios declarados.
- Em nenhum dos cenários a resposta do agente contém uma frase que resolva a
  decisão pelo squad (ex.: "vocês deveriam fazer X") — toda intervenção
  termina em pergunta com opções nomeadas + espaço para texto livre.
- O front-matter de `.claude/agents/agente-alinhamento.md` (quando existir,
  em Construction) não lista `Write` nem `Edit` em `tools` — verificável por
  inspeção do arquivo.
- Testado conceitualmente (mesmo antes de ter dois editais reais rodando em
  paralelo) contra os dois formatos de jornada já conhecidos no repositório:
  48h contínuas (padrão da Aula 2) e ~8 semanas com marcos síncronos
  (TJCE-UFC) — confirmando que a lógica de "momento certo" não está
  hardcoded em horas de uma janela de 48h.

## Decisões já tomadas (não reabrir sem motivo novo)

- **Implementação:** Claude Code subagent, `tools` restritas a leitura
  (`Read`, `Grep`, `Glob`, sem `Write`/`Edit`) — mesmo padrão do Agente 1,
  herdado do `Hack_OS/ROADMAP.md`.
- **Referência fixa:** a saída do Agente Enquadrador é lida como arquivo em
  disco (estado compartilhado), não recalculada por este agente.
- **Formato de intervenção:** pergunta estruturada (múltipla escolha nomeada
  + texto livre), nunca prosa livre de sugestão — mecanismo descrito na
  seção 5 do `FERRAMENTAS-CLAUDE-CODE.md`.
- **Persistência do histórico:** fica a cargo do comando de barra que invoca
  o agente, não do agente em si — preserva a garantia mecânica de "só
  leitura" também para este agente stateful.
- **Nome:** "Agente de Alinhamento Contínuo" mantido como no `ROADMAP.md`
  (provisório até confirmação do Lucas — ver Perguntas de validação).

## Perguntas de validação

(perguntas em aberto para o Lucas responder antes de avançar para
Construction — nenhuma delas é retórica, todas mudam requisito funcional
real do agente)

1. **Como exatamente o squad "manda um report"?** Texto livre colado numa
   conversa com o Claude Code? Resposta a um comando de barra com perguntas
   fixas (tipo um checklist curto: "o que fizemos", "o que decidimos", "o
   que mudou de plano")? Anexo de algum artefato externo (print do Kanban,
   link do Miro/Trello)? A resposta muda diretamente o requisito funcional
   de "parsing" do report e se `WebFetch` precisa entrar nas `tools`.
2. **O agente é sempre reativo** (só roda quando o squad decide mandar um
   report via comando de barra) **ou deve existir algum lembrete/gatilho
   por tempo** para o squad não esquecer de reportar? A hipótese de trabalho
   deste Inception é "sempre reativo" (consistente com "squad no controle"),
   mas isso significa que a responsabilidade de *lembrar de mandar o
   report* nos momentos certos fica inteiramente com o squad — vale
   confirmar se está certo assumir isso agora, ou se isso é justamente o
   papel que o futuro Agente Orquestrador (`VISAO-EXPERIENCIA.md`) deveria
   cobrir depois.
3. **Qual a granularidade mínima de intervenção?** Uma checagem possível a
   cada report recebido? Só nos ~5-6 momentos da jornada citados no
   `ROADMAP.md` (fim de Enquadrar, fim de Divergir, fim de Decidir,
   checkpoints do Construir, antes de Narrar)? O próprio squad pede uma
   checagem quando quiser, sem cadência fixa? Isso é o requisito mais
   diretamente ligado ao risco de "cansar" o squad de perguntas.
4. **Quando o hackathon não segue os 6 momentos padrão de 48h** (como o
   TJCE-UFC, ~8 semanas com marcos síncronos), como o agente deve descobrir
   os "momentos certos" daquele hackathon específico? Perguntar ao squad
   diretamente na primeira invocação (ex.: "qual é o cronograma real deste
   hackathon, quais são os marcos síncronos?") e guardar essa resposta como
   parte do próprio estado deste agente (não do Agente 1)? Isso resolveria o
   gap descrito em Riscos sem precisar tocar no Agente 1 agora.
5. **Quem persiste o histórico de reports/perguntas em disco?** A decisão
   provisória acima é "o comando de barra que invoca o agente, não o agente
   em si" (mesmo padrão do Agente 1) — confirma que é essa a direção, ou
   prefere que o agente tenha `Write` restrito só a um arquivo de estado
   específico (abrindo uma exceção nova ao padrão "sem Write" que o Agente 1
   estabeleceu)?
6. **Existe algum exemplo real (ainda que informal) de "report de progresso"** já
   escrito pelo Lucas ou por um squad em teste anterior, para calibrar o
   parsing esperado? Hoje não há nenhum no repositório — os critérios de
   aceite deste documento assumem reports sintéticos até que isso exista.
7. **O que o agente faz se for invocado num hackathon onde o squad pulou a
   fase Enquadrar** (ou seja, não existe saída do Agente Enquadrador para
   servir de referência fixa)? Recusa operar e sinaliza a ausência de
   matriz de referência (mesmo espírito do "informação insuficiente" do
   Agente 1), ou opera em modo degradado, aplicando só o roteiro de Ackoff
   de forma genérica ao que o squad reportar, sem comparação com critérios?
8. **O nome "Agente de Alinhamento Contínuo"** — mantém como está ou prefere
   ajustar agora que o conceito está mais detalhado (por exemplo, para
   deixar mais explícito que ele só pergunta, nunca resolve)?

## Status

**Rascunho pronto para validação do Lucas — 2026-08-24.** Escrito em
paralelo à validação do Agente 1, sem alterar nada de
`agente-enquadrador/`. Não avançar para `02-construction/BOLTS.md` até as
perguntas acima serem respondidas.
