# Inception — Agente Enquadrador de Editais

## Objetivo

O primeiro subagente de uma plataforma maior que vai apoiar squads de alunos em
hackathons com agentes de IA. Consome um edital de hackathon (PDF) e devolve ao
squad, **antes de qualquer decisão de solução**, os pontos que exigem atenção
redobrada para um desenvolvimento eficaz: a anatomia do edital decomposta,
os critérios traduzidos em matriz de peso → alocação de horas, as expectativas
implícitas não escritas, riscos de desclassificação, e o desafio central
formulado como perguntas de decisão — nunca como respostas prontas.

É a ferramenta que sustenta a fase **Enquadrar** (0-4h) da jornada de 48h
ensinada na Aula 2. O objetivo é atacar o erro nº1 apontado nas aulas: times
tecnicamente excelentes perdem porque leram o edital rápido, se apaixonaram
por uma ideia, e responderam a uma pergunta que ninguém fez.

## Contexto

- **Disciplina:** Hackathons, Innovation Challenges e IA — IBMEC, Prof. Ari
  Amaral, 2026 (7º período, 80h).
- **Material-base:** Aulas 1 e 2 (território e anatomia do hackathon,
  engenharia reversa de editais) + "A Fórmula da Eficácia" (Ackoff/Drucker/
  Vale) — arquivos em `aulas/`.
- **Onde isso se encaixa na plataforma maior:** este é o primeiro de vários
  subagentes planejados por um orquestrador. A ideia (do Lucas) é que, no
  futuro, o orquestrador encadeie leitura de edital → ideação → validação de
  hipóteses → narrativa/pitch, evoluindo até uma interface visual onde o
  squad acompanha as hipóteses que criou e validou ao longo do hackathon —
  "orgânico e dinâmico conforme eles forem desenvolvendo". As 6 fases da
  jornada da Aula 2 (Enquadrar, Divergir, Decidir, Construir, Narrar,
  Defender) são um candidato natural de mapa para os futuros subagentes.
  O próximo subagente já desenhado (fora de escopo deste ciclo, ver
  `Hack_OS/ROADMAP.md`) é um **agente de alinhamento contínuo**: recebe
  reports do squad ao longo das 48h e devolve perguntas (nunca respostas)
  checando aderência ao edital, usando a saída deste Agente Enquadrador
  como referência. Ele automatiza o papel "quem sustenta o problema" da
  Aula 2 e o roteiro de decisão de Ackoff da Fórmula da Eficácia.
- **Alinhamento com o plano de ensino oficial:** a matriz de critérios que
  este agente produz é literalmente a **AC1** da disciplina ("matriz de
  análise de edital", ver `Plano_Aula_2026.1...pdf`, seção 8). A semana 14
  do plano de aula tem uma oficina chamada "AI Hackathon Stack" — desenhar
  papéis, entradas, saídas e critérios de qualidade de um conjunto de
  agentes — que é exatamente a arquitetura de orquestrador + subagentes que
  este projeto está adiantando desde a Aula 2.
- **Prazo:** sem data travada, mas a AC1 (matriz de edital) é a entrega mais
  próxima que este agente precisa servir, e a AP1 (Mini-Hackathon — "do
  edital ao conceito") é o primeiro teste real de fogo.
- **Metodologia de processo:** AI-DLC (versão solo, baseada em
  awslabs/aidlc-workflows), com Claude Code como agente construtor. Decisão
  explícita: por ora, "AI-DLC" aqui é só o processo (Inception → Construction
  → Operations) — nenhum compromisso com stack de execução AWS (Bedrock
  Agents etc.) neste ciclo.
- **Padrão técnico de implementação (decisão desta conversa, vale para toda
  a plataforma, não só este agente):** cada agente é um **Claude Code
  subagent** (`.claude/agents/*.md`), com a lista de `tools` no front-matter
  funcionando como guarda mecânica — não apenas instrução de prompt — para
  regras como "não propor solução". Comandos de barra (`.claude/commands/*.md`)
  são o gatilho determinístico de quando cada agente roda. Estado
  compartilhado entre agentes (ex.: a matriz que este agente produz sendo
  lida pelo futuro Agente de Alinhamento) vive em arquivo, não em memória de
  sessão. Detalhe completo do padrão em `Hack_OS/ROADMAP.md`. Isso corresponde
  ao padrão *orchestrator-subagent* que a AWS Prescriptive Guidance descreve
  para arquitetura multiagente — aqui implementado sem stack AWS, só com as
  ferramentas nativas do Claude Code.

## Requisitos funcionais

- [ ] Aceitar um edital de hackathon em PDF como entrada.
- [ ] Extrair e estruturar as 4 seções da anatomia do edital (Aula 2):
      Desafio, Restrições, Entregáveis, Critérios.
- [ ] Fazer a "engenharia reversa de critérios": transformar cada critério de
      avaliação em uma pergunta que a solução precisa responder, com o peso
      (%) correspondente.
- [ ] Traduzir os pesos em sugestão de alocação de horas do squad — regra da
      aula: *"se um critério vale 25% e o time gastou 5% do tempo nele, a
      conta não fecha"*.
- [ ] Levantar expectativas implícitas não escritas no edital: o problema por
      trás do problema, o provável perfil da banca, o que seria constrangedor
      a organização adotar, e o critério não declarado (Aula 2).
- [ ] Sinalizar riscos e ambiguidades do edital que podem desclassificar o
      squad.
- [ ] Aplicar o roteiro de decisão de Ackoff ao desafio central como
      **perguntas abertas** para o squad responder — nunca como respostas
      prontas: qual problema isso resolve, que suposição está sendo
      assumida, qual o menor teste possível, o que conta como evidência,
      qual é o Δt disso.
- [ ] Devolver a saída em Markdown com front-matter estruturado (campos como
      `criterios[]`, `pesos`, `alocacao_horas_sugerida`, `riscos[]`,
      `expectativas_implicitas[]`) — corpo em prosa legível pelo squad,
      front-matter já pronto para virar JSON quando a plataforma escalar.

## Requisitos não-funcionais

- [ ] **Não propor solução.** Regra explícita da oficina da Aula 2: *"é
      proibido propor solução nesta oficina — quem já sabe o que vai
      construir parou de ler o edital."* O agente estrutura o problema; a
      decisão de solução é do squad. **Mecanismo:** implementado como Claude
      Code subagent com `tools` restrito a leitura no front-matter (ex.:
      `Read`, `Grep`, `WebFetch` se precisar consultar o site do
      patrocinador) — sem `Write`/`Edit`. A regra é garantida pelo harness,
      não depende do modelo "lembrar" de obedecer o prompt.
- [ ] **Rastreabilidade fato vs. inferência.** Toda afirmação do output
      precisa deixar claro se veio literalmente do texto do edital ou é
      inferência do agente — mitiga o risco de "alucinação apresentada como
      dado" citado na Aula 1 como um dos riscos que a IA trouxe para
      hackathons.
- [ ] Tempo de leitura do output pelo squad: alvo de 15-20 minutos (não há
      hora sobrando num hackathon de 48h).
- [ ] Estrutura do output já pensada para consumo futuro por outros
      subagentes/pela plataforma, mesmo entregando só Markdown agora.

## Riscos / pontos de incerteza

- Alucinação de critérios ou restrições que não estão de fato no edital.
- Viés não examinado na leitura (ex.: subestimar peso de critérios "soft"
  como qualidade da apresentação).
- Se o agente for longe demais e começar a insinuar caminhos de solução, ele
  mina o próprio propósito pedagógico da disciplina — a "Fórmula da
  Eficácia" é direta: *"um time que só recebe decisões prontas não pode ser
  eficaz — no máximo, eficiente naquilo que outro decidiu."*
- Editais em PDF têm formatos muito variados (às vezes mal estruturados, com
  informação em imagens ou tabelas) — a extração pode ser frágil.

## Critérios de aceite

- Rodar contra `Hack_OS/editais-referencia/`: pelo menos um PDF bem
  estruturado (`01-ufc-tjce-hackathon-2026.pdf` ou `02-lowhack-2026-online.pdf`)
  produzindo a matriz de critérios corretamente, **e** o caso de informação
  insuficiente (`04-aws-breaking-barriers-2026.md`) reconhecendo e sinalizando
  a ausência de critérios/restrições em vez de inventar uma matriz.
- O squad consegue ler o output em até 20 minutos e apontar de cabeça: quais
  são os 2-3 critérios que mais pesam, o que é ambíguo no edital, e quais
  perguntas ainda precisa responder antes de propor solução.
- Nenhuma frase do output afirma algo que não está no edital sem estar
  marcada como inferência.
- O front-matter de `.claude/agents/agente-enquadrador.md` não lista `Write`
  nem `Edit` em `tools` — verificável por inspeção do arquivo, não só por
  teste de comportamento.

## Decisões já tomadas (não reabrir sem motivo novo)

- **Implementação:** Claude Code subagent (`.claude/agents/*.md`), tools
  restritas a leitura. Vale como padrão para os próximos agentes da
  plataforma também (ver `Hack_OS/ROADMAP.md`).
- **Editais de teste:** `Hack_OS/editais-referencia/` — 4 editais reais de
  2026 (universidade+judiciário, hackathon privado online, governo/TCU,
  corporativo/AWS), escolhidos de propósito por variarem de "bem
  estruturado" a "sem critérios técnicos declarados" (ver `README.md` da
  pasta).
- **Nome:** Agente Enquadrador de Editais — confirmado.
- **Formato de saída:** front-matter YAML estruturado (`criterios[]`,
  `pesos`, `alocacao_horas_sugerida`, `riscos[]`, `expectativas_implicitas[]`)
  + corpo em Markdown/prosa no mesmo arquivo — confirmado.

## Status

**Inception validado em 2026-08-24.** Nenhuma pergunta em aberto. Segue para
`02-construction/BOLTS.md`.
