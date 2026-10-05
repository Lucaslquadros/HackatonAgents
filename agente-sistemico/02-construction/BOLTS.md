# Construction — Backlog de Bolts — Agente de Visão Sistêmica

> Um **bolt** é uma unidade pequena de trabalho, com um objetivo único e
> verificável. Um bolt por vez; parar no checkpoint antes de seguir.
>
> Status: `todo` → `em andamento` → `checkpoint` → `feito`

Peças escolhidas a partir do Inception (decisões 6–11) e de
`FLUXO-PEDAGOGICO.md`. Diferente dos agentes 1 e 2, este agente tem uma
interface própria (quadro + painel), então a ordem dos bolts entrega valor
cedo **sem LLM**: modelo de dados → validador → quadro → painel com
validador → só então o motor do agente.

Decisão de linguagem: o validador e o quadro rodam no navegador, então são
**JavaScript** (sem build, para começar). Os testes de schema do Bolt 0 usam
**Python + jsonschema**, já instalados no ambiente; são ferramenta de
desenvolvimento, não código que o squad roda.

## Bolt 0 — Modelo de dados compartilhado

- **Objetivo:** definir em JSON Schema os objetos que quadro, painel, motor
  do agente, aba CSD, ritual do fundo do U, estacionamento e glossário
  trocam entre si, incluindo o contrato de entrada e saída do motor (opção
  (c) do Inception).
- **Entregável:** `Hack_OS/modelo-dados/` com `hackos.schema.json`,
  `README.md`, um exemplo completo e válido (case last-mile da aula),
  exemplos inválidos de propósito e `testes/validar_exemplos.py`.
- **Checkpoint:** os testes passam (válidos aceitos, inválidos recusados
  pelo motivo certo) e o Lucas revisa o README do modelo.
- **Status:** feito (aprovado pelo Lucas em 2026-10-05)

## Bolt 1 — Validador de CLD (JavaScript, sem interface)

- **Objetivo:** função que recebe um `mapa` e devolve os loops fechados
  (ciclos simples), a classificação R/B pela contagem de setas negativas e
  os problemas do checklist da aula (B sem meta, variável fora de loop,
  mais de 12 variáveis, nome com verbo/direção, seta sem mecanismo, loop
  sem atraso marcado quando há suspeita).
- **Entregável:** `agente-sistemico/quadro/validador.js` + testes com os
  gabaritos da aula (exercício 2 a–g, Suporte, Loja Alfa, Nexa Pay,
  last-mile).
- **Checkpoint:** todos os gabaritos passam.
- **Status:** feito (aprovado pelo Lucas em 2026-10-05; proposta de
  agrupar "loops combinados" no painel fica para o Bolt 3)
- **Resultado (2026-10-05):** `npm test` em `agente-sistemico/quadro/`
  roda 28 testes, todos passando: exercício 2 (a–g), Suporte, Loja Alfa,
  Nexa Pay (15 setas tiradas do HTML da aula) e o last-mile do Bolt 0 (o
  validador reproduz exatamente a validação escrita à mão). Teste de
  mutação: trocar a regra de paridade por "qualquer negativa = B" derruba
  7 testes. Grafo completo de 12 variáveis: corta em 1000 loops em ~30 ms e
  marca `truncado`.
- **Achados para os próximos bolts:**
  - **Loops compostos.** O gabarito da Loja Alfa nomeia 4 loops, mas o
    grafo tem 6 ciclos simples: 2 combinam contratação com refação (um
    deles com 3 negativas, logo B). São reais, e a contagem os classifica
    certo. O painel (Bolt 3) precisa destacar os loops que o squad anotou
    e agrupar os demais como "loops combinados", senão vira ruído.
  - **Limite da heurística de nomes.** "Time desmotivado" (estado em vez
    de quantidade) não é detectado. Uma regra de particípio pegaria, mas
    daria falso positivo em "Chamados resolvidos", que é do próprio
    exercício do professor. Fica para o agente (Bolt 6), como pergunta.
  - **`truncado`** não faz parte do contrato `pedido_visao`; o painel deve
    avisar o squad quando ele vier `true`.

## Bolt 2 — Quadro mínimo

- **Objetivo:** página local para criar, mover, renomear e apagar
  variáveis (com cor por tipo) e setas (polaridade, atraso, mecanismo);
  salvar e carregar `mapa.json`.
- **Entregável:** `agente-sistemico/quadro/index.html` (+ JS/CSS).
- **Checkpoint:** recriar o mapa last-mile do Bolt 0 à mão no quadro e
  salvar um arquivo que passa no schema.
- **Status:** feito (aprovado pelo Lucas em 2026-10-05)
- **Resultado (2026-10-05):** `index.html`, `estilo.css`, `app.js` e
  `estado.js` (regras de edição, sem interface, com 9 testes; `npm test`
  roda 37). Testado no navegador embutido: carregar o exemplo, criar
  variável com duplo clique, ligar arrastando a alça, preencher mecanismo,
  marcar certeza (pede fonte) e atraso, mover, apagar (leva a seta junto) e
  desfazer. O mapa resultante passa no schema do Bolt 0.
- **Defeitos achados e corrigidos no teste:** (1) o atributo `hidden` não
  esconde elementos SVG no Chrome, então a linha temporária da ligação
  ficava por cima do alvo e a seta não era criada; (2) o inspetor não se
  redesenhava quando a seleção mudava com um campo de texto em foco, e
  mostrava uma variável que já não existia; (3) apagar uma variável
  deixava viva uma alavanca que apontava para um loop desfeito (pego pelo
  teste de `estado.js`).
- **Como abrir:** servidor local na raiz do `Hack_OS` e acessar
  `/agente-sistemico/quadro/` (ver `03-operations/OPERATIONS.md`). Aberto
  direto como arquivo, tudo funciona menos o botão "Exemplo last-mile".

## Bolt 3 — Painel com o validador ao vivo

- **Objetivo:** painel lateral mostrando loops (R/B pintados no quadro) e
  os problemas do checklist a cada edição, seguindo os 4 blocos do
  template da aula.
- **Entregável:** painel integrado ao quadro.
- **Checkpoint:** errar de propósito (verbo como variável, B sem meta) e
  ver o painel apontar.
- **Status:** feito (aprovado pelo Lucas em 2026-10-05)
- **Resultado (2026-10-05):** a lateral ganhou as abas **Editar** e
  **Análise** (com contador de perguntas). A aba Análise segue os 4 blocos
  do template da aula:
  1. **Variáveis:** perguntas sobre nome, ator, tamanho do mapa e
     variável fora de loop; a variável ganha uma marca laranja no quadro.
  2. **Loops:** os loops que o squad nomeou ficam em destaque; os demais
     (inclusive os combinados) ficam agrupados em "sem nome". Abrir um
     loop mostra o caminho, a contagem de negativas e o formulário de
     nome, história, meta e lacuna; no quadro, o loop fica destacado e o
     resto esmaece. Loops nomeados ganham selo R/B no centro do loop.
     Nomes de loops que deixaram de existir são avisados.
  3. **Análise:** loop principal, Cynefin com justificativa, delay,
     variável ignorada, arquétipo e comportamento ao longo do tempo.
  4. **Intervenção:** alavancas com onde intervir (loop, variável ou
     seta), nível de Meadows, impacto esperado e teste de sanidade; o
     formulário recusa alavanca incompleta e não tem campo de solução.

  Cada pergunta é clicável e leva ao ponto do quadro de que fala. Testes:
  44 (`npm test`), mais a verificação de que um mapa editado com as
  funções novas passa no schema. Testado no navegador: perguntas do bloco
  1, abrir loop com destaque, apagar a meta de um B (a pergunta aparece e
  o Ctrl+Z traz a meta de volta), navegação pela pergunta, alavanca
  recusada e depois criada.
- **Ajuste feito no teste:** ir a uma pergunta agora fecha o destaque do
  loop e rola o quadro até o elemento (antes, ele podia ficar fora da
  área visível).

## Bolt 4 — Motor v1 com sessão do Claude Code

- **Objetivo:** o quadro grava um `pedido-visao.json`; um comando de barra
  invoca o subagente `agente-sistemico` (só leitura) e grava
  `resposta-visao.json`; o painel lê e mostra as visões.
- **Entregável:** `.claude/agents/agente-sistemico.md`,
  `.claude/commands/visao-sistemica.md`, leitura das visões no painel.
- **Checkpoint:** um ciclo completo pedido → resposta com o mapa last-mile.
- **Status:** feito (aprovado pelo Lucas em 2026-10-05).
- **Primeira execução real do agente (2026-10-05):** pedido do exemplo
  last-mile original gravado pelo quadro; o prompt do
  `agente-sistemico.md` rodado sem alterações por um subagente só de
  leitura (a sessão não estava aberta em `agente-sistemico/`, então o
  agente registrado não estava disponível); resposta em ~35 s, aprovada
  pelo `validar_resposta.py` na primeira tentativa e exibida no quadro.
  - **Bom:** as 3 visões citam elementos reais, terminam em pergunta, não
    repetem o painel e não descrevem produto. Duas trazem análise que o
    código não faz: (1) a meta do B2, "Capacidade de entrega da praça",
    não existe como variável, embora a alavanca `alv_01` dependa dela;
    (2) o mecanismo da `seta_03` (fila de espera) enfraquece a crença da
    `seta_09` (velocidade), sinal de soluções que falham.
  - **Ajustar no Bolt 6:** (a) o mecanismo da conexão sugerida acrescentou
    um detalhe que o contexto não dá ("rotas dos lojistas que mais
    reclamam"): exigir que o que não está no contexto venha marcado como
    suposição; (b) a fonte teórica de uma visão não combina com ela
    (conexão sugerida citando o iceberg): ligar tipo de visão a fontes
    adequadas; (c) textos longos e até 7 refs por visão: limitar tamanho
    e refs; (d) perguntas compostas ("o que…, quem… e quanto tempo…?"):
    uma pergunta por visão.
  - **Não testado ainda:** mapa com ideia de produto (estacionar) e mapa
    sem loop (intervenção programada).
- **Cenário do Lucas: mobilidade por bicicleta em São Paulo (2026-10-05).**
  - **Só o tema** (2 variáveis, sem setas, sem pergunta-problema): o agente
    devolveu `informacao_insuficiente: true` e uma única visão pedindo a
    situação concreta e o recorte, sem inventar mapa. Comportamento certo.
  - **Rascunho do CLD** (9 variáveis, 10 setas, todas suposição, dois
    loops R, uma alavanca de nível parâmetro), pedido feito pelo quadro.
    Três visões, aprovadas pelo validador na primeira tentativa:
    1. Notou que o mapa só tem loops de reforço e sugeriu a seta Número de
       ciclistas → Acidentes (+), por exposição. A prévia do quadro
       confirma que ela fecharia um loop B (limites ao crescimento).
    2. Visão ausente: por qual meta a Prefeitura/CET é cobrada no trânsito
       e a crença que decide dividir a via; propôs a variável "Prioridade
       dada à fluidez do tráfego motorizado".
    3. Usou a intervenção programada do professor ("resolvendo ou
       reagindo?") sobre a alavanca de nível parâmetro e apontou o loop
       uso aparente → apoio público como fluxo de informação.
  - **Mais ajustes para o Bolt 6:** (e) o `texto` mostra ids técnicos
    ("var_5 → var_7", "seta_06") para o squad: ids só em `refs`, no texto
    só nomes; (f) perguntas compostas de novo nas três visões; (g) refs
    demais (até 7). Os ajustes (a)–(d) da execução anterior continuam
    valendo.
- **Resultado (2026-10-05):**
  - `agente-sistemico/servidor.py` (só biblioteca padrão) substitui o
    `http.server`: serve o quadro sem cache e expõe
    `POST/GET /api/sessoes/<recorte>/pedido` e
    `GET /api/sessoes/<recorte>/resposta` (202 enquanto não há resposta
    para o pedido atual). Arquivos em `agente-sistemico/sessoes/`.
  - `modelo-dados/validar_resposta.py`: guarda mecânica da resposta
    (schema, pedido certo, limite, refs que existem, seta proposta válida
    e inédita, nada de repetir visão aberta, nada de linguagem de solução
    de produto).
  - Subagente `.claude/agents/agente-sistemico.md` (versão 1 do prompt,
    só leitura) e comando `.claude/commands/visao-sistemica.md` (lê o
    pedido, chama o subagente, valida, corrige uma vez se preciso, grava).
  - Aba **Visões** no quadro: pedir visão, instrução com o comando a
    rodar, espera com consulta a cada 3 s (sobrevive a recarregar a
    página), cartões por tipo com pergunta, referências clicáveis e fonte
    teórica, "Discutimos e respondemos" / "Dispensar…" (com motivo).
  - Testes: 49 em JavaScript e 15 em Python (servidor, validador e um
    pedido montado pelo quadro conferido contra o schema).
- **Teste ponta a ponta no navegador:** pedido gravado pelo quadro (passa
  no schema) → resposta escrita no papel do subagente, seguindo o prompt
  → `validar_resposta.py` aprovou → o quadro mostrou as 3 visões sozinho.
  Marcar uma como respondida fez o pedido seguinte levar só as 2 abertas.
  **O subagente em si não rodou nesta sessão**: ele só é registrado numa
  sessão do Claude Code aberta na pasta `agente-sistemico/`. A qualidade
  das visões geradas pelo modelo é o teste que falta no checkpoint.
- **Defeito achado e corrigido:** o filtro de log do servidor quebrava ao
  registrar um erro 404 e derrubava a conexão (pego pelo teste do caminho
  com `..`, que em si ficou contido na pasta do projeto).

## Bolt 5 — Setas fantasma e estacionamento

- **Objetivo:** conexões sugeridas aparecem tracejadas; aceitar vira seta
  real, recusar pede motivo. Solução proposta na fase de problema vai para
  o estacionamento.
- **Checkpoint:** aceitar uma e recusar outra; estacionar uma ideia.
- **Status:** feito (aprovado pelo Lucas em 2026-10-05)
- **Decisão de desenho:** a seta sugerida **não entra no mapa** enquanto o
  squad não aceita; ela é desenhada tracejada a partir da visão aberta.
  Assim o mapa só tem o que o squad decidiu, e recusar não deixa rastro
  nele. Ao aceitar, a seta entra com autor `agente` (de onde veio a ideia),
  status `aceita` (a decisão do squad) e classificação `suposicao`
  (ninguém verificou ainda).
- **Resultado (2026-10-05):**
  - Setas tracejadas em roxo no quadro para cada conexão sugerida aberta;
    clicar numa delas abre o cartão da visão na aba Visões.
  - Cartão de conexão mostra a **prévia** do que aceitar muda: os loops
    novos que a seta fecharia, calculados pelo mesmo validador do painel.
    Se o mapa mudou (seta já desenhada pelo squad ou variável apagada), o
    cartão avisa em vez de oferecer "Aceitar".
  - Recusar e dispensar pedem o motivo num campo dentro do cartão (não
    mais a janela `prompt()` do navegador); o motivo vai no próximo
    pedido junto com a visão.
  - Variável proposta pelo agente: botão "Adicionar" cria a variável perto
    da primeira variável citada.
  - **Estacionamento** na aba Visões: estacionar a ideia sugerida pelo
    agente ou uma ideia digitada pelo time, com a etapa em que ela volta;
    retomar, descartar, estacionar de novo. Gravado em
    `sessoes/<recorte>/estacionamento.json` pelo servidor (o arquivo é o
    estado oficial; o navegador guarda uma cópia).
  - Contrato: `pedido_visao` ganhou `estacionamento` (opcional), e o
    validador recusa sugerir estacionar uma ideia que já está lá.
  - Testes: 57 em JavaScript e 18 em Python.
- **Teste no navegador:** com duas conexões sugeridas abertas, clicar na
  tracejada abriu o cartão certo; aceitar uma criou a `seta_13` e o 4º
  loop; recusar a outra (com motivo) apagou a tracejada sem mexer no mapa;
  a ideia "App de roteirização com IA" foi estacionada pelo cartão e uma
  ideia do time pelo campo; a variável proposta foi adicionada.

## Bolt 6 — Prompt do agente: template da aula e fronteira

- **Objetivo:** prompt do subagente cobrindo os 4 blocos, as intervenções
  programadas do professor, a fronteira "onde intervir × o que construir",
  visões ausentes e marcação certeza/suposição.
- **Checkpoint:** Lucas revisa o prompt antes dos testes de aceite.
- **Status:** feito (aprovado pelo Lucas em 2026-10-05)
- **Resultado (2026-10-05):**
  - **Prompt v2** (`.claude/agents/agente-sistemico.md`): roteiro pelos 4
    blocos do template da aula (variáveis e atores; loops, incluindo "só
    há loops R? onde está o limite?"; análise, com campos vazios,
    arquétipos e explicação oficial tratada como causa; intervenção), as
    3 intervenções programadas do professor com seus gatilhos, regras de
    escrita (nomes em vez de ids, uma pergunta, texto curto, até 4 refs,
    não acrescentar fatos sem marcar como hipótese) e quando estacionar.
  - **Catálogo de fontes das aulas** (`modelo-dados/fontes-teoricas.json`):
    17 conceitos, cada um com os tipos de visão que pode fundamentar.
  - **Guardas novas no `validar_resposta.py`:** id técnico no texto ou na
    pergunta; mais de uma interrogação; texto acima de 450 caracteres;
    pergunta acima de 240; mais de 4 refs; fonte fora do catálogo ou
    incoerente com o tipo da visão (salvo `suplementar: true`).
  - Testes: 25 em Python.
- **Antes × depois, com os mesmos pedidos** (`execucoes-agente/`):
  - Prompt v1: as respostas do last-mile e da bicicleta são recusadas
    pelo validador novo (ids no texto, textos de até 500 caracteres, até
    7 refs, fontes fora do catálogo).
  - Prompt v2: as duas passam na primeira tentativa. Textos de 317 a 382
    caracteres, até 4 refs, perguntas simples e respondíveis com dado
    ("nas semanas em que a cobrança por velocidade aumentou, o tempo médio
    caiu, ficou igual ou subiu?"), hipóteses marcadas ("Hipótese: com mais
    pessoas pedalando…"). As visões continuaram trazendo análise que o
    código não faz (ex.: o prazo prometido é a meta do B1 e não existe
    como variável).
- **Limite conhecido:** pergunta composta escrita com uma só interrogação
  ("quem decide e quanto tempo leva?") não é pega pelo validador; depende
  do prompt. — Entrevista inicial no painel (conversa guiada em rodadas)

- **Objetivo:** levar o squad de um tema ou recorte incompleto até uma
  pergunta-problema e um primeiro rascunho, em rodadas (decisão 12 do
  Inception): o agente devolve de 3 a 5 perguntas com opções e campo
  livre; o squad responde num formulário no painel; cada resposta
  preenche um campo do mapa (fronteira, horizonte, ator, item da CSD); a
  rodada seguinte parte das respostas; ao final, o agente propõe a
  pergunta-problema, a fronteira e o horizonte (o squad aceita ou edita).
  O rascunho do CLD ficou para o Bolt 7b (decisão de 2026-10-05: propor
  variáveis que ainda não existem muda o contrato e merece bolt próprio).
- **Por quê (teste de 2026-10-05):** com só o tema "mobilidade em São
  Paulo, algo com bicicleta", o agente marcou informação insuficiente
  corretamente, mas devolveu uma única pergunta composta — insuficiente
  para chegar a um recorte.
- **Exemplo de rodada 1 para esse caso:** que situação concreta incomoda
  (poucos usam bicicleta / acidentes / ciclovias ociosas / outra)? para
  quem? que comportamento piorou, e em quanto tempo? Rodada 2: fronteira,
  quem decide, o que já se sabe com fonte e o que é suposição.
- **Contrato:** a resposta do motor ganha um bloco de entrevista (perguntas
  com opções e o campo do mapa que cada resposta preenche); o pedido leva
  as respostas da rodada anterior.
- **Status:** checkpoint — aguardando o Lucas fazer uma entrevista real
- **Resultado (2026-10-05):**
  - **Contrato:** `resposta_visao` ganhou `entrevista` (rodada com 1 a 5
    perguntas; cada uma com opções, se aceita várias e o `campo` do mapa
    que a resposta preenche) e `proposta_contexto`; `pedido_visao` ganhou
    o histórico `entrevista` e o gatilho `entrevista`. A pergunta-problema
    deixou de ser obrigatória no `mapa` (pode faltar enquanto a entrevista
    não termina) e o quadro não manda mais campos de texto vazios.
  - **Validador:** informação insuficiente exige rodada de entrevista;
    rodada na ordem certa; ids de pergunta únicos; uma pergunta só, sem id
    técnico; opção ou proposta que descreva produto é recusada.
  - **Quadro** (`entrevista.js`): formulário da rodada na aba Visões
    (opções, campo livre, "ainda não sabemos"); ao enviar, as respostas
    entram no mapa (fronteira e horizonte no contexto; afetados e
    decisores viram atores; o resto vai para a descrição) e o pedido da
    rodada seguinte sai sozinho; a proposta final aparece editável, com
    "Usar no mapa", "Pedir mais uma rodada" e "Encerrar a entrevista".
    Histórico gravado em `sessoes/<recorte>/entrevista.json`.
  - **Prompt v3:** seção "Entrevista em rodadas" (quando entrevistar,
    rodada 1 do tema à situação, rodada 2 do recorte ao sistema, opções
    são situações e nunca soluções, até 3 rodadas, quando propor).
  - Testes: 65 em JavaScript e 32 em Python.
- **Teste ponta a ponta com o agente real**, partindo só do tema da
  bicicleta: rodada 1 com 4 perguntas e 5 opções cada (aprovada de
  primeira) → respostas de teste no formulário → atores e contexto
  atualizados → pedido automático → proposta de recorte aceita no quadro
  ("Por que as pessoas experimentam pedalar para ir ao trabalho ou à
  escola e depois desistem, apesar da expansão das ciclovias…?").
- **Defeitos e ajustes do teste:** (1) o pedido durante a entrevista não
  passava no schema, que exigia a pergunta-problema (contradição
  corrigida); (2) o agente propôs o recorte depois de uma só rodada,
  deduzindo a fronteira e sem perguntar quem decide: o prompt passou a
  exigir que fronteira e decisores sejam perguntados.

## Bolt 7b — Rascunho do CLD proposto pelo agente

- **Objetivo:** com a pergunta-problema definida, o agente propõe um
  primeiro rascunho (variáveis novas e setas entre elas, todas suposição),
  desenhado tracejado no quadro; o squad aceita ou recusa item a item.
- **Contrato:** a resposta ganha um bloco de rascunho com variáveis
  provisórias (ids temporários) e setas que podem ligar variáveis novas ou
  existentes.
- **Status:** todo

## Bolt 8 — Integração com a Matriz CSD

- **Objetivo:** setas e hipóteses viram itens propostos na CSD; o painel
  mostra de quantas suposições uma alavanca depende.
- **Status:** todo

## Bolt 9 — Ritual do fundo do U (um dispositivo)

- **Objetivo:** painel oculto, cronômetro, entradas individuais
  ("ocultar e passar"), botão "Terminamos nossa reflexão", revelação e
  cobertura por membro.
- **Status:** todo

## Bolt 10 — Testes de aceite do Inception

- **Objetivo:** rodar os critérios de aceite (gabaritos da aula, Energisa
  com dois recortes, descrição pobre, erros plantados, nenhuma frase de
  solução de produto).
- **Status:** todo

## Próximas rodadas (fora deste backlog)

Ideias registradas durante a construção, para a próxima rodada de bolts
deste agente ou da plataforma.

- **Migrar o motor para a API do Claude** (opção (a) do Inception). O
  contrato JSON já é o mesmo; o ganho é responder em segundos sem uma
  sessão do Claude Code aberta. É pré-requisito do item seguinte.
- **Chat ancorado numa visão.** O squad discute uma sugestão específica
  (ex.: discorda da seta "ciclistas → acidentes") e o agente responde
  dentro daquele cartão. Conversa curta e presa a um ponto do mapa, não um
  chat livre (decisão 12 do Inception). Hoje o motivo da recusa cumpre
  parte desse papel.
- **Pedir visão automaticamente na pausa** (gatilho `pausa` do contrato),
  quando o motor responder rápido o bastante.
- **Integração com o Agente de Panorama:** os finalistas do Panorama
  chegam aqui como recortes prontos (tema, pergunta-problema, atores),
  dispensando a primeira rodada da entrevista.
