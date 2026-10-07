# Inception — Agente Orquestrador + Experiência (Porta, Pacto, Sala)

> **Status deste Inception:** aberto em 2026-10-05, de propósito **enxuto**
> — hospeda decisões, não abre Construction ainda. Motivo: ao escrever o
> Inception do Agente de Panorama (`../agente-panorama/`), uma decisão
> cross-agent (Cadastro do Time) quase ficou morando lá só por ter surgido
> naquela conversa. Esse risco de confusão entre "Inception de um agente" e
> "Inception do Programa" é real (Lucas, 2026-10-05) — este arquivo existe
> pra dar um endereço fixo a esse tipo de decisão, sem forçar a construção
> do Orquestrador antes da hora.

## Objetivo

Duas coisas, deliberadamente numa Inception só porque são a mesma peça
vista de dois ângulos:

1. **Produto:** o componente que guia o squad pela jornada — porta/pacto/
   sala (ver `../VISAO-EXPERIENCIA.md`, que vira a base deste Objetivo/
   Contexto a partir de agora) — explicando o fluxo, ajudando a executar a
   etapa da vez, sem fazer a análise que cada agente especializado faz.
2. **Governança:** o lugar onde moram decisões que **atravessam mais de um
   agente** — sequenciamento da jornada completa, telas/dados
   compartilhados (ex.: Cadastro do Time), e mudanças no
   `../modelo-dados/hackos.schema.json` que afetam mais de um agente — pra
   que o Inception de cada agente (`agente-enquadrador/`, `agente-sistemico/`,
   `agente-panorama/`, e os que vierem) fique só sobre o que aquele agente
   faz, isolado, testável sozinho.

"Pronto" pro **Objetivo 2** (governança) é: qualquer decisão nova que
atravesse agentes tem um lugar óbvio pra ir, e os Inceptions dos agentes
individuais apontam pra cá em vez de duplicar. "Pronto" pro **Objetivo 1**
(produto) é muito mais longe — depende do gate abaixo.

## Contexto

- **Gate original** (`../ROADMAP.md`, componente 3): abrir este Inception
  "depois que os Agentes 1 e 2 estiverem validados" — Agente Enquadrador
  está (confirmado pelo Lucas), Agente de Visão Sistêmica tem os Bolts 0-6
  aprovados mas **5 checkpoints ainda pendentes** (7, 7b, 8, 9, 10). O gate
  não está 100% cumprido — este Inception abre mesmo assim, mas **só para
  o Objetivo 2 (governança)**; o Objetivo 1 (produto/front-end de verdade)
  continua esperando o Sistêmico fechar.
- **Visão de produto já registrada:** `../VISAO-EXPERIENCIA.md` (2026-08-24)
  — porta fechada, pacto de alinhamento com peso emocional, sala que se
  abre revelando os agentes, orquestrador que explica e ajuda a executar.
- **Pedagogia:** `../FLUXO-PEDAGOGICO.md`, passo 0 ("Pacto e acordo do
  squad", hoje 🟡 "pacto só com o edital"); Fórmula da Eficácia
  ("eficácia exige escolha, não conformidade"); erro nº5 de squads que
  perdem (Aula 2: "squad sem acordo").
- **Gatilho imediato para abrir isto agora:** o Agente de Panorama
  (`../agente-panorama/01-inception/INCEPTION.md`) precisa que o squad já
  tenha um perfil cadastrado (Cadastro do Time) antes de entrar em
  qualquer cenário — essa funcionalidade não pertence a nenhum agente
  específico, pertence ao Passo 0.

## Decisões já tomadas

1. **Cadastro do Time mora no Passo 0** (Lucas, 2026-10-05, movida do
   Inception do Panorama): ao lado do pacto de alinhamento com o edital,
   o squad preenche um **formulário** (v1 — não entrevista conversacional),
   uma vez, com o perfil de cada integrante.
2. **Schema do Cadastro do Time** (decisão técnica, 2026-10-05): reaproveita
   `$defs/squad` e `$defs/membro` já existentes em
   `../modelo-dados/hackos.schema.json` (`membro.nome`, `membro.frentes` —
   as 5 frentes da Aula 3, que seguem valendo como estão). Estende
   `membro` com `areas_afinidade`: lista de `{area, nivel, como_agrega}`,
   onde `area` é texto (nome da categoria do edital/tema em avaliação —
   **não é enum fixo no schema geral**, porque categorias mudam a cada
   edital), `nivel` é enum leve (`experiencia` / `interesse` / `nenhum`),
   `como_agrega` é texto livre. Motivo: um enum fixo tipo `frentes` não
   serve (varia por edital), texto livre sozinho não seria cruzável no
   ranqueamento do Panorama; a combinação estruturado+livre segue o
   padrão que o schema já usa em outros lugares (ex.: `alavanca` combina
   `nivel_meadows` fixo com `impacto_esperado` livre).
3. **A jornada completa, etapa a etapa, para consulta por qualquer agente**
   (registrada em 2026-10-05, a pedido do Lucas — ver tabela abaixo).
   Agentes individuais **referenciam** esta tabela em vez de redesenhá-la
   nos próprios Inceptions.
4. **Regra de escopo** (para não repetir a confusão que originou este
   arquivo): o Inception de um agente decide o que **aquele agente** faz e
   os contratos de entrada/saída com os vizinhos imediatos (ex.: Panorama
   → `mapa.contexto` do Sistêmico, que continua no Inception do Panorama,
   porque é específico dessa fronteira). Este Inception decide o que
   **atravessa 3+ peças**, ou o que não pertence a nenhum agente
   construído ainda (como o Passo 0).
5. **Onboarding completo do Passo 0** (Lucas, 2026-10-07): achado em uso
   real — depois de cadastrar o time (Bolts 1-2.1, em checkpoint), não
   havia lugar nenhum pra anexar o edital do hackathon nem referências de
   site (FAQ, vencedores de edições anteriores etc.), nem na Inception do
   Enquadrador nem em `FLUXO-PEDAGOGICO.md`. `/enquadrar` sempre exigiu um
   caminho de arquivo passado manualmente, redigitado toda vez. Decisões:
   1. **Onde:** estende a mesma tela do Cadastro do Time
      (`agente-orquestrador/cadastro/`) — não um passo separado. Um squad
      começando o hackathon preenche tudo num lugar só: quem é o time, qual
      o edital, que referências valem a pena.
   2. **Como anexar o edital:** os dois formatos — caminho de arquivo local
      (PDF/MD, como já é hoje) **ou** link direto (URL do regulamento
      oficial, como fizemos manualmente pro Campus Mobile). Guardado como
      campo do squad, não mais como argumento digitado a cada vez que
      `/enquadrar` roda.
   3. **Referências de site:** uma lista de links (FAQ, página de
      vencedores de edições anteriores etc.), guardados junto; **o agente
      lê e resume cada um** — mas seguindo o mesmo padrão arquitetural que
      todo motor desta plataforma já usa (decisão herdada de
      `../ROADMAP.md`, "Padrão técnico de implementação": motor roda como
      sessão do Claude Code, nenhum servidor Python desta plataforma chama
      API de IA direto). Ou seja: salvar o link é mecânico (sem IA,
      instantâneo); **resumir** é um motor — a tela mostra o comando a
      rodar (mesmo padrão `/visao-sistemica <recorte>` e
      `/panorama <cenario>` já usados), e o resumo de cada referência
      volta pro Cadastro depois de rodado. Não é fetch síncrono disparado
      pelo clique de "salvar" no navegador.
   4. **Reaproveita o Agente Enquadrador** para analisar o edital anexado
      (seja arquivo ou link — o front-matter dele já tem `WebFetch`) em vez
      de criar um motor novo só pra isso; o comando `/enquadrar` passa a
      poder ler o caminho/link direto do Cadastro do Time, sem precisar
      redigitar.
   - **Gap relacionado, achado no mesmo momento, mas de outro dono:** o
     quadro do Sistêmico não tem como listar/abrir sessões existentes por
     nome (`rec_bicicleta`, `rec_lastmile` etc.) — só um seletor de arquivo
     do sistema operacional. Isso pertence ao `agente-sistemico/` (é a UI
     dele), não a este Inception — registrado como bolt novo lá, não aqui
     (decisão 4, regra de escopo).

## A jornada completa (referência cross-agent)

| # | Etapa | O que acontece | Quem faz | Status (2026-10-05) |
|---|---|---|---|---|
| 0 | Pacto e acordo do squad | Squad firma compromisso com o edital **+ Cadastro do Time + edital anexado + referências de site** (decisões 1-2, 5) | Este componente | 🟡 Cadastro do Time em checkpoint; onboarding do edital/referências novo |
| 1 | Enquadrar o edital | Critérios, pesos, riscos, entregáveis | Agente Enquadrador | ✅ construído e testado |
| 2a-2f | Panorama → ranqueamento → finalista | Pesquisa por cenário, CSD, clusters, problemas candidatos, ranqueamento (incl. aderência ao time), escolha | Agente de Panorama | 🟡 Inception pronto |
| 3 | Entrevista (rodada 2+) | Pula rodada 1 (já veio do Panorama); aprofunda fronteira/sistema | Agente de Visão Sistêmica | ✅ construído |
| 4 | Mapa sistêmico (CLD) | Variáveis, setas, rascunho proposto pelo agente | Agente de Visão Sistêmica | ✅ construído |
| 5 | Painel de análise ao vivo | Loops R/B, Cynefin, arquétipo, alavancas | Agente de Visão Sistêmica | ✅ construído |
| 6 | Matriz CSD integrada ao mapa | Setas-suposição e hipóteses viram itens da CSD | Agente de Visão Sistêmica | ✅ construído |
| 7 | Ritual do fundo do U | Presencing antes de definir o problema | Agente de Visão Sistêmica | ✅ construído |
| 8 | Problem framing (POV/HMW) | Da alavanca escolhida até um HMW testado | Agente de Framing | ❌ não construído |
| 9 | Construir, com alinhamento contínuo | Audita reports do squad contra a matriz do Enquadrador | Agente de Alinhamento Contínuo | ❌ só Inception rascunhado |
| 10 | Narrar / Defender | Preparação de pitch e defesa | — | ❌ nada |

## Requisitos funcionais

Deliberadamente leve nesta versão do Inception — Construction não abre
ainda (ver gate). Os únicos itens com peso prático imediato, porque outro
agente já depende deles:

- [ ] Cadastro do Time (decisões 1-2) precisa existir, mesmo que de forma
      mínima, antes do bolt de ranqueamento do Agente de Panorama chegar
      lá — ver risco correspondente.
- [ ] Onboarding do edital + referências de site (decisão 5): campo de
      edital (caminho ou link) e lista de referências no Cadastro do Time;
      `/enquadrar` lê o edital anexado sem precisar de argumento
      redigitado; cada referência de site tem um jeito de pedir resumo ao
      agente (mesmo padrão pedido/resposta dos outros motores) e mostrar o
      resultado de volta na tela.
- [ ] O resto (porta, pacto com peso emocional, sala revelando agentes,
      orquestrador explicando o fluxo) fica registrado como visão
      (`../VISAO-EXPERIENCIA.md`) até o gate do Objetivo 1 abrir de
      verdade.

## Riscos / pontos de incerteza

- ~~Cadastro do Time pode virar bloqueador do Panorama~~ — **resolvido em
  2026-10-05**: Construction aberta aqui, já (Pergunta 2), especificamente
  para esta tela — ver `../02-construction/BOLTS.md`.
- Herdados de `../VISAO-EXPERIENCIA.md` (ainda sem resposta):
  - O pacto é conteúdo estático ou dinâmico (gerado a partir da saída do
    Enquadrador)?
  - "Selar o pacto" é ação única ou pode ser reafirmado/quebrado no meio
    do caminho (ligação com o Agente de Alinhamento)?
  - Que agentes ficam visíveis "na sala" — só os construídos (Enquadrador,
    Sistêmico, em breve Panorama) ou placeholders dos que faltam?

## Critérios de aceite (deste Inception, não de uma Construction)

- Qualquer decisão nova que atravesse mais de um agente tem, a partir de
  agora, um lugar óbvio para ir — este arquivo — em vez de ficar
  implícita no Inception do agente que estava sendo trabalhado no
  momento.
- O Inception do Panorama foi revisado e teve as decisões cross-agent
  (Cadastro do Time, journey table) removidas/apontadas para cá.

## Perguntas de validação

1. ~~Confirma a divisão de responsabilidade?~~ — **respondida em
   2026-10-05: sim.**
2. ~~Tela mínima emprestada pelo Panorama, ou solução definitiva aqui?~~ —
   **respondida em 2026-10-05: solução definitiva.** Abre-se Construction
   **só para o Cadastro do Time** (não para porta/pacto/sala — isso
   continua esperando o gate do Objetivo 1). Ver
   `../02-construction/BOLTS.md`.
3. As 3 perguntas herdadas de `VISAO-EXPERIENCIA.md` (pacto estático ou
   dinâmico; selar é único ou reafirmável; quem aparece "na sala") seguem
   em aberto até o gate do Objetivo 1 abrir de verdade — não bloqueiam o
   Cadastro do Time.
4. ~~Onde fica o onboarding de edital/referências? Upload ou link?
   Resumo automático?~~ — **respondidas em 2026-10-07** (decisão 5):
   mesma tela do Cadastro, os dois formatos (caminho ou link), resumo via
   motor (não síncrono). Ver `../02-construction/BOLTS.md` para os bolts.
