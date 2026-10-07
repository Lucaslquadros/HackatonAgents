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
- **Novo teste de verdade do comando (2026-10-05):** disparado
  `/visao-sistemica rec_lastmile` como comando de barra de fato numa sessão
  headless do Claude Code (`claude -p`) com `cwd` dentro de
  `agente-sistemico/`, contra o pedido de exemplo do last-mile (copiado
  para um recorte `rec_lastmile` temporário em `sessoes/`). O comando achou
  o pedido, invocou o subagente `agente-sistemico` de verdade, validou a
  resposta de primeira (`validar_resposta.py`) e gravou
  `resposta-visao.json`: 3 visões (2 `visao_ausente`, 1 `cobertura_ritual`).
  Confirma que o mecanismo comando→subagente→validação→arquivo funciona
  ponta a ponta fora de uma sessão interativa. Recorte de teste removido
  depois (não é dado real do squad).

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
- **Checkpoint:** Lucas revisa o desenho abaixo — em especial a decisão de
  design do "recusar seta" sem motivo (nº 2) e o limite de 1 rascunho aberto
  por vez (nº 4) — e testa um rascunho de verdade pelo quadro antes de
  aprovar.
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-05):**
  - **Contrato** (`modelo-dados/hackos.schema.json`): novo `$def` `id_temp`
    (padrão `tmp_<algo>`, só existe dentro de uma proposta) e `id_ou_temp`;
    `variavel_rascunho` (`id_temp`, `nome`, `tipo`); `seta_rascunho` (como
    uma seta normal, mas sem `classificacao` — o rascunho inteiro já é
    suposição por definição, e `de`/`para` aceitam tanto um id real quanto
    um `id_temp` do mesmo rascunho); `rascunho_mapa` (`variaveis`: 1 a 12,
    `setas`: mínimo 1). Novo tipo de visão `rascunho_mapa` +
    `proposta_rascunho`, exigido por `allOf` como os outros tipos.
  - **Validador** (`modelo-dados/validar_resposta.py`,
    `problemas_do_rascunho`): ids temporários únicos dentro do rascunho;
    toda seta refere-se a uma variável do mapa ou a um `id_temp` do próprio
    rascunho (nunca a nada fora dos dois); sem auto-laço; sem repetir uma
    seta que já existe no mapa; sem repetir a mesma seta duas vezes dentro
    do rascunho. Reaproveitadas as guardas de legibilidade (id técnico no
    mecanismo, linguagem de solução no nome da variável ou no mecanismo) —
    bastou ligar `proposta_rascunho` em `textos_da_visao` e
    `problemas_de_legibilidade`. Catálogo de fontes
    (`fontes-teoricas.json`): `rascunho_mapa` passou a combinar com "CLD:
    variáveis, setas e mecanismo", "CLD: atrasos" e "CLD: loops de reforço
    e balanceamento" — sem isso toda resposta real seria recusada por fonte
    incompatível com o tipo.
  - **Quadro** — mesmo padrão do Bolt 5 (setas fantasma), generalizado para
    um conjunto de itens em vez de um item avulso:
    - `estado.js`: `aceitarSetaRascunho(mapa, proposta, mapaTemp)` resolve
      `de`/`para` através de `mapaTemp` (id_temp → id real já criado) e
      delega para `aceitarConexao` — mesma garantia de sempre nascer
      suposição, autor `agente`. `aceitarVariavel` já existente é
      reaproveitado sem mudança para criar a variável real a partir de uma
      `variavel_rascunho` (mesmo formato `{nome, tipo}`).
    - `visoes.js`: cartão do rascunho lista cada variável com botão
      "Adicionar" (vira variável real, registra o mapeamento id_temp→id em
      `v.mapaTemp`) e cada seta com "Aceitar esta seta"/"Recusar" — só
      liberados quando as duas pontas já foram resolvidas (variável real ou
      id_temp já adicionado); antes disso mostra "Adicione as variáveis
      desta seta primeiro". Seta aceitável mostra a mesma prévia de loops
      novos do Bolt 5 (`htmlPrevia`/`preverConexao`, reaproveitados sem
      mudança). `mapaTemp` e `decisoesSetas` (o que foi aceito/recusado,
      por índice) são campos só do quadro — `paraContrato` os tira antes de
      mandar a visão de volta no próximo pedido.
    - `app.js`: setas do rascunho cujas duas pontas já são reais entram na
      mesma lista de "fantasmas" tracejados desenhados no quadro
      (reaproveita a classe CSS `.sugerida`, sem CSS novo para o SVG);
      clicar nelas abre o cartão, como as conexões sugeridas do Bolt 5.
      Três ações novas no handler de cliques:
      `rascunho_adicionar_var`/`rascunho_aceitar_seta`/`rascunho_recusar_seta`.
    - `estilo.css`: `.itens-rascunho`/`.item-rascunho` (lista de itens no
      painel, estilo "ideias" do estacionamento) e `.visao.rascunho_mapa`
      no destaque lateral (mesma cor do `conexao_sugerida`).
  - **Prompt do subagente** (`.claude/agents/agente-sistemico.md`): nova
    seção "Rascunho do CLD (Bolt 7b)" — quando propor (pergunta-problema
    definida, mapa ainda com poucas variáveis ou nenhum loop), formato do
    bloco, regra de 6 a 12 variáveis, só suposição, não propor um novo
    rascunho enquanto houver um aberto. Regra 6 ("não invente sistema")
    passou a cobrir os dois casos: sem pergunta-problema → entrevista; com
    pergunta-problema mas mapa pobre → rascunho.
  - **Testes:** 9 novos em JavaScript
    (`agente-sistemico/quadro/testes/rascunho.test.js`: situação da seta
    conforme a resolução das pontas, aceitar com/sem variáveis resolvidas,
    inicialização de `mapaTemp`/`decisoesSetas` pelo `mesclarVisoes`,
    `paraContrato` não vaza os dois campos internos, HTML do cartão em cada
    estado) e 7 em Python (`agente-sistemico/testes/test_motor.py`:
    rascunho válido, ids temporários repetidos, seta para variável
    inexistente, seta repetindo uma do mapa, seta repetida dentro do
    próprio rascunho, id técnico no mecanismo, variável/mecanismo com
    linguagem de solução). Suíte completa depois da mudança: 74/74 em
    JavaScript (`npm test` em `agente-sistemico/quadro/`), 39/39 em Python
    (`python -m unittest agente-sistemico.testes.test_motor`, rodado da
    raiz do `Hack_OS`) e `python modelo-dados/testes/validar_exemplos.py`
    sem regressão.
  - **Não testado ainda:** um rascunho gerado pelo agente real (só
    exercitado com fixtures manuais nos testes); `modelo-dados/exemplos/invalidos/casos.json`
    não ganhou um caso de rascunho inválido (a cobertura desse tipo de erro
    ficou só no `test_motor.py`) — decisão de escopo para não alongar o
    bolt, não falta técnica.
  - **Decisões de design que merecem seu olhar:**
    1. **Setas do rascunho não aparecem tracejadas no quadro até as duas
       pontas existirem de verdade.** Se o rascunho propõe 6 variáveis
       novas conectadas entre si, nada aparece no canvas até o squad clicar
       "Adicionar" variável por variável no painel — só a lista de itens no
       painel mostra tudo de uma vez. Alternativa seria desenhar as
       variáveis provisórias no canvas (como "fantasmas", estilo `.var
       .fantasma` que já existe no CSS) antes de qualquer aceite; não fiz
       isso porque settar a posição de uma variável que ainda não existe
       exigiria inventar um layout, e decidir isso sozinho pareceu
       passar do escopo deste bolt.
    2. **Recusar uma seta do rascunho não pede motivo** (diferente da
       recusa de uma `conexao_sugerida` no Bolt 5, que abre um campo de
       texto). Ganho de simplicidade; perda é o agente não saber por que
       uma seta específica foi recusada na próxima rodada. Dá para alinhar
       com o Bolt 5 depois, se fizer falta.
    3. **Variável não tem "recusar" explícito** — se o squad não clica
       "Adicionar", ela simplesmente nunca entra no mapa quando o cartão é
       fechado. Pareceu desnecessário ter um terceiro estado para algo que
       já é "não fiz nada".
    4. **O prompt pede no máximo 1 `rascunho_mapa` aberto por vez**, mas
       isso só está escrito no prompt (comportamento do modelo), não
       garantido pelo validador — diferente das outras garantias mecânicas
       deste projeto. Dava para o validador recusar uma segunda proposta de
       rascunho enquanto a primeira segue aberta; não implementei por não
       ter certeza de que é isso que você quer (ex.: e se o squad quiser
       dois rascunhos de recortes diferentes ao mesmo tempo?).

## Bolt 8 — Integração com a Matriz CSD

- **Objetivo:** setas e hipóteses viram itens propostos na CSD; o painel
  mostra de quantas suposições uma alavanca depende.
- **Checkpoint:** Lucas revisa as decisões de design abaixo (em especial a
  nº 1, sobre certezas ficarem fora deste bolt) e testa o fluxo pelo quadro
  antes de aprovar.
- **Status:** checkpoint — aguardando revisão do Lucas
- **Correção de modelagem no meio do caminho:** a primeira versão guardava
  `csd` dentro do `mapa` (`mapa.csd.itens`). Conferindo o contrato
  (`hackos.schema.json`), `csd` é **irmã** do `mapa` dentro do
  `pedido_visao`/`resposta_visao` — o `$def` de `mapa` tem
  `additionalProperties: false` e não lista `csd`, então a versão errada
  quebraria o "Salvar" (o quadro grava `JSON.stringify(mapa)` direto como
  `mapa.json`) assim que houvesse qualquer item na CSD. Corrigido antes de
  terminar o bolt: `csd` agora é um pedaço de estado do quadro à parte,
  igual a `estacionamento`, com seu próprio arquivo (`csd.json`), endpoint
  no servidor e chave no `localStorage`. O teste já existente
  `montarPedido: só visões abertas vão ao agente...` (Bolt 4) — que confere
  as chaves do pedido contra `pedido_visao.properties` — ajudou a confirmar
  a correção.
- **Resultado (2026-10-05):**
  - **`estado.js`:** `novoCsd()`, `proporItemCsd(csd, mapa, {...})` (cria
    item `proposto`, exige `pergunta_pesquisa` em suposição e
    `tarefa_discovery` em dúvida), `proporSetaParaCsd(csd, mapa, setaId,
    {...})` (só para setas `classificacao: "suposicao"` sem `csd_item`
    ainda; liga `seta.csd_item` ao item criado), `aceitarItemCsd(csd,
    propostaCsd)` (registra o item já pronto que veio de uma visão
    `hipotese`), `mudarStatusItemCsd(csd, id, status)`. `proximoId` ganhou
    um 4º parâmetro (`extras`) para gerar ids únicos de uma lista que não
    mora dentro do mapa. `adicionarAlavanca` ganhou `suposicoes` (filtra
    para só os ids que existem de fato na lista de CSD recebida).
  - **`painel.js`:** nova seção "Matriz CSD" no Bloco 4 (Intervenção),
    com cada item (tipo, status, origem pelo nome da seta/variável,
    pergunta de pesquisa ou tarefa de discovery) e botões
    Confirmar/Descartar/Reabrir. Cada alavanca mostra "Depende de N
    suposições da CSD (X confirmadas, Y ainda não)". O formulário de nova
    alavanca ganhou um seletor múltiplo opcional com as suposições da CSD.
  - **`visoes.js`:** visão `hipotese` com `proposta_csd` mostra o texto e o
    botão "Aceitar para a CSD" (em vez do genérico "Discutimos e
    respondemos").
  - **`app.js`:** seta suposição sem `csd_item` ganha, no inspetor, um
    campo "Propor esta suposição para a Matriz CSD" (pede a pergunta de
    pesquisa, obrigatória pelo schema); com `csd_item`, mostra o status
    atual. Novo estado `csd` (módulo), persistido como
    `estacionamento`/`entrevista`: `localStorage` por recorte +
    sincronização com o servidor ao abrir o quadro.
  - **`servidor.py`:** rota `GET/POST /api/sessoes/<recorte>/csd` (arquivo
    `csd.json`), mesmo mecanismo genérico de `estacionamento`/`entrevista`.
  - **Prompt do subagente:** a instrução de `hipotese` + `proposta_csd` não
    pedia `id`/`criado_em`, embora o schema exija os dois (`item_csd` tem
    `required: [id, ..., criado_em, ...]`) — toda hipótese do agente seria
    recusada pelo validador. Corrigido: o prompt agora pede `id`
    (`"csd_<curto>"`) e `criado_em` (a mesma data-hora da resposta).
  - **Testes:** 14 novos em JavaScript (7 em `estado.test.js`: propor seta,
    recusar seta-certeza, exigir pergunta/tarefa, geração de id sem
    colisão, aceitar/duplicar item, mudar status, alavanca filtrando
    suposições inválidas; 4 em `painel.test.js`: CSD vazia, listagem com
    escape e origem pelo nome, resumo por alavanca, filtro de tipo no
    formulário; 2 em `visoes.test.js`: `montarPedido` só inclui `csd` não
    vazia, cartão da hipótese) e 5 em Python (`test_motor.py`: hipótese com
    `proposta_csd` completa passa, falta de `id` ou `pergunta_pesquisa` é
    recusada pelo schema, ida-e-volta do endpoint `/csd` do servidor).
    Suíte completa: 88/88 em JavaScript (`npm test`), 43/43 em Python
    (`python -m unittest agente-sistemico.testes.test_motor`, da raiz do
    `Hack_OS`) e `python modelo-dados/testes/validar_exemplos.py` sem
    regressão.
  - **Não testado ainda:** o fluxo pelo navegador de verdade (abrir o
    quadro, marcar uma seta como suposição, propor para a CSD, aceitar uma
    hipótese do agente, criar uma alavanca com suposições) — só testado via
    as funções puras e a geração de HTML. Falta também gerar uma hipótese
    de verdade com o agente real e confirmar que `/visao-sistemica` grava
    `id`/`criado_em` do jeito que o prompt agora pede.
  - **Decisões de design que merecem seu olhar:**
    1. **Só suposição entra na CSD por este bolt — certeza não.** O
       `item_csd` tipo `certeza` exige `evidencias` com pelo menos um item
       (fonte, link, data), e isso pede uma tela de anexar evidência que
       não existe ainda; implementá-la pareceu um bolt próprio. Hoje uma
       seta `certeza` não ganha nenhum botão de CSD no inspetor.
    2. **Nada é proposto para a CSD automaticamente.** Nem toda seta
       suposição vira item sozinha, nem aceitar uma visão `hipotese` sem
       clicar "Aceitar para a CSD" entra no registro — mesmo princípio dos
       Bolts 5/7b ("nada muda sem o squad decidir"), mas significa que o
       squad pode esquecer de propor uma seta e ela nunca aparecer na CSD.
    3. **Apagar uma seta não remove o item da CSD que ela gerou.** O item
       fica no registro com `origem.ref` apontando para um id que não
       existe mais (mostra o id cru em vez do nome, no painel). Decisão:
       evidência registrada não deveria sumir só porque o mapa mudou depois
       — mas pode confundir se isso acontecer com frequência.
    4. **Proponho a seta para a CSD não está no histórico de desfazer
       (Ctrl+Z).** Igual a estacionar uma ideia: Ctrl+Z desfaz mudanças no
       `mapa` (inclusive o `seta.csd_item` que foi setado), mas o item já
       criado em `csd.itens` continua lá, agora órfão. Mesmo trade-off do
       item 3, só que por um caminho diferente.

## Bolt 9 — Ritual do fundo do U (um dispositivo)

- **Objetivo:** painel oculto, cronômetro, entradas individuais
  ("ocultar e passar"), botão "Terminamos nossa reflexão", revelação e
  cobertura por membro.
- **Contrato:** nenhum novo — o bloco `ritual` já existia no schema desde o
  Bolt 0 (`FLUXO-PEDAGOGICO.md` 5.1); este bolt só constrói o dispositivo no
  quadro que o produz e consome. Mecânico, sem chamar o subagente/LLM.
- **Checkpoint:** Lucas testa o ritual de ponta a ponta pelo navegador (abrir,
  3+ reflexões, encerrar, ligar ao mapa, uma divergência, uma pergunta
  enviada para a CSD, reabrir o painel) e revisa as decisões de design
  abaixo — em especial a nº 1 (ligação manual, não automática).
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-05):**
  - **`agente-sistemico/quadro/ritual.js`** (novo, no padrão de
    `entrevista.js`: funções puras + HTML, rede e eventos em `app.js`):
    `abrirRitual` (exige pergunta generativa, 3–15 min, recusa "qual é a
    solução?"), `enviarReflexao` (recusa texto vazio e linguagem de solução
    — mesmas frases do `LINGUAGEM_DE_SOLUCAO` do validador Python, adaptadas
    para o que o squad digita), `encerrarReflexoes` (exige 1+ reflexão,
    guarda `seguiu_sem`), `ligarAoMapa`, `registrarDivergencia`,
    `enviarReflexaoParaCsd` (só reflexão tipo `pergunta`, reusa
    `proporItemCsd` do Bolt 8 com `origem.etapa: "ritual_u"` — já previsto
    no catálogo `etapa` do schema), `ritualParaPedido` (tira os campos
    internos do quadro) e `htmlRitual` com as 5 telas do dispositivo.
  - **`app.js`:** estado `ritual` (local + servidor, mesmo padrão de
    `estacionamento`/`csd`), overlay de tela cheia (`#ritual-overlay`) que
    cobre o quadro inteiro — inclusive a aba Visões, que fica "oculta" por
    estar coberta, não por ter o DOM escondido à parte. Um `setInterval`
    próprio atualiza só o texto do cronômetro a cada segundo, sem redesenhar
    o formulário (perderia o que a pessoa está digitando) — mesmo cuidado de
    "digitando" que já existia no inspetor/painel.
  - **`visoes.js`:** `montarPedido` ganhou a opção `ritual`, incluída no
    pedido só quando `encerrado_em` está presente (mandar um ritual ainda em
    reflexão individual não serve a nenhum gatilho do contrato).
  - **`servidor.py`:** rota `ritual` adicionada ao mecanismo genérico que já
    servia `estacionamento`/`entrevista`/`csd` — `ritual.json` tem uma lista
    obrigatória própria (`reflexoes`), então não precisou de código novo,
    só entrar no dicionário `DOCUMENTOS` e no regex de rotas.
  - **Index/CSS:** botão "Ritual do fundo do U" na barra, overlay com tema
    claro/escuro reaproveitando as variáveis de cor existentes.
  - **Testes:** 11 novos em JavaScript (`testes/ritual.test.js`: heurística
    de linguagem de solução, abertura com as 3 validações, envio de
    reflexão, encerramento, ligação ao mapa, divergência, envio para a CSD,
    `ritualParaPedido` tirando campos internos e validando contra
    `$defs/ritual` do schema campo a campo, e um teste de fumaça das 5 telas
    de HTML conferindo que o texto do squad é escapado; mais 1 em
    `visoes.test.js` para o novo parâmetro de `montarPedido`) e 1 em Python
    (`test_motor.py`: ida e volta do endpoint `/ritual`, igual ao padrão já
    usado para `/csd`/`/entrevista`). Suíte completa: 99/99 em JavaScript
    (`npm test`), 44/44 em Python (`python -m unittest
    agente-sistemico.testes.test_motor`, da raiz do `Hack_OS`) e `python
    modelo-dados/testes/validar_exemplos.py` sem regressão.
  - **Não testado ainda:** o fluxo completo pelo navegador de verdade (só
    testado via as funções puras, o teste de fumaça do HTML, e o endpoint do
    servidor) — abrir o ritual, passar o dispositivo entre "membros"
    simulados, encerrar, ligar reflexões a elementos do mapa pelo
    `<select>`, registrar uma divergência e mandar uma pergunta para a CSD.
  - **Decisões de design que merecem seu olhar:**
    1. **Ligar uma reflexão a um elemento do mapa é manual, não automático.**
       O squad escolhe num `<select multiple>` (atores, variáveis, loops
       nomeados); não há busca por palavra-chave nem qualquer heurística de
       "palpite". Fiel ao "o squad decide" do projeto e ao fato de este
       bolt não ter LLM, mas significa mais cliques no momento da revelação.
    2. **Loop vira a lista de setas dele, não um id próprio.** O contrato
       (`$defs/id`, padrão `prefixo_algo`) não tem um id de loop — a chave
       de um loop é o conjunto ordenado de setas. Escolher a opção "Loop: R1"
       no `<select>` grava todas as setas daquele loop em `elementos`. Único
       jeito de respeitar o schema sem inventar um novo tipo de id.
    3. **"Ocultar e passar" é sequencial num dispositivo só** (o squad passa
       o mesmo notebook/tablet de mão em mão), não multiplayer de verdade
       (várias pessoas em abas/aparelhos diferentes ao mesmo tempo). O
       quadro continua sendo single-user local em todo o resto; não criei
       nenhuma sincronização nova só para o ritual.
    4. **O cronômetro é um só para toda a rodada de reflexão** (3–15 min no
       total, não por pessoa) — é como o exemplo last-mile do Bolt 0 já
       registrava (`duracao_min: 5` cobrindo 3 reflexões) e como a dinâmica
       "U em Miniatura" da disciplina é descrita. Esgotar o tempo só muda a
       cor do aviso; não bloqueia novos envios nem força o encerramento —
       quem decide que terminou é o botão, não o relógio.
    5. **Marcar "ausente do mapa" é um botão à parte, não só deixar o
       `<select>` vazio e salvar.** Evita confundir "ainda não fiz essa
       etapa" com "decidi que não está no mapa" — os dois são estados
       diferentes no painel (pendente vs. ausente), mas só o segundo é
       uma pergunta real `presente_no_mapa: false` no contrato.

## Bolt 10 — Testes de aceite do Inception

- **Objetivo:** rodar os critérios de aceite (gabaritos da aula, Energisa
  com dois recortes, descrição pobre, erros plantados, nenhuma frase de
  solução de produto).
- **Checkpoint:** Lucas revisa o resultado de cada um dos 6 critérios abaixo
  — em especial o achado do critério 2 (taxa de falha do prompt em domínio
  novo) — e decide se algum merece um bolt de correção antes de fechar o
  agente.
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-05):** os 6 critérios do Inception, um por um:
  1. **Gabaritos da disciplina — passou.** A detecção de loops (Suporte,
     Loja Alfa, Nexa Pay, exercício 2 a–g, last-mile) já está coberta pelos
     28 testes do Bolt 1, ainda passando dentro da suíte de 99. Quanto à
     parte específica do last-mile ("o painel leva o squad a concluir que
     'os entregadores precisam ser mais rápidos' é hipótese, não causa"):
     confirmado que `seta_09` (Velocidade exigida → Tempo médio) está
     `classificacao: "suposicao"` no exemplo canônico, e que o inspetor de
     seta em `app.js` (linhas ~636–641) renderiza o rádio "Suposição"
     marcado para ela — distinto de "Certeza" — então clicar nessa seta no
     quadro mostra explicitamente que é hipótese. Verificado por leitura de
     código, não por um teste automatizado novo (não há harness de DOM
     para `app.js` na suíte hoje; criar um só para isto pareceu
     desproporcional ao bolt).
  2. **Edital real — Ideathon Energisa com dois recortes — passou, com um
     achado relevante sobre confiabilidade do prompt.** Montei dois pedidos
     de teste grounded no edital real (`agente-enquadrador/saidas/06-ideathon-energisa-2026.md`
     e no texto original, item 5.2): `rec_energisa_urbano` (ligações
     clandestinas e pipas, loop B balanceador com atraso) e
     `rec_energisa_rural` (colisão de veículo → poste caído → cabo no
     solo → tempo de resposta, loop R de reforço com atraso) — dois
     sistemas estruturalmente diferentes a partir do mesmo desafio central
     do edital. Disparei `/visao-sistemica` de verdade (sessão headless,
     `cwd` em `agente-sistemico/`) para os dois:
     - **Rural:** 1ª rodada (com a correção interna de uma tentativa)
       recusada duas vezes (id técnico no texto, depois texto longo); 2ª
       rodada (comando disparado de novo, do zero) passou de primeira: 3
       visões (`visao_ausente` sobre a ausência de loop balanceador,
       `validacao_relacao` questionando a hipótese de exposição,
       `alavanca` de nível meta sobre SLA de tempo de resposta).
     - **Urbano:** 1ª rodada recusada duas vezes (id técnico + texto
       longo); 2ª rodada recusada de novo, duas vezes, só por texto longo
       (459 e 451 caracteres, pouco acima do limite de 450) — essa
       tentativa foi interrompida por um limite de uso da sessão antes de
       terminar a correção. 3ª rodada (de novo do zero, após o limite
       resetar) passou de primeira: 3 visões (`visao_ausente` sobre a
       causa raiz das ligações clandestinas, `validacao_relacao`
       questionando se fiscalização de fato reduz ligações, 
       `intervencao_programada` sobre o loop solto do uso de pipas).
     - **Achado real, não só sucesso:** em domínio novo (Energisa, nunca
       testado antes — diferente do last-mile/bicicleta já exercitados
       nos Bolts 4/6/7), o prompt **falhou a validação em 2 de 2 primeiras
       tentativas independentes**, quase sempre por estourar o limite de
       450 caracteres (uma vez por poucos caracteres). Só emendou depois
       de tentativas extras fora do orçamento normal de 1 correção por
       chamada do comando. Isso sugere que o limite de tamanho do prompt é
       mais apertado do que a margem real do modelo em textos sobre um
       domínio que ele não viu antes — vale o Lucas decidir se isso pede
       um bolt de ajuste (ex.: subir o limite, ou reforçar no prompt para
       contar caracteres antes de responder) ou se cai dentro da margem
       aceitável de "2ª tentativa resolve".
     - Os dois mapas finais são **comparáveis**: mesma estrutura de 4
       variáveis + 4 setas + 1 loop por recorte, mesmo desafio central do
       edital, mas um loop B (urbano) contra um loop R (rural), e visões
       que respondem ao que cada recorte tem de específico — não há
       conteúdo genérico repetido entre os dois.
     - Pares de pedido/resposta arquivados em
       `execucoes-agente/energisa-urbano_*.json` e `energisa-rural_*.json`;
       pastas de sessão de teste (`sessoes/rec_energisa_*`) removidas.
  3. **Descrição pobre — passou (evidência já existente, não repeti o
     teste).** O teste "só o tema" do Bolt 7 (mobilidade por bicicleta em
     São Paulo) já cobre exatamente este critério: `informacao_insuficiente:
     true` e o agente devolveu perguntas de entrevista em vez de desenhar
     um mapa.
  4. **Modo crítica (erros plantados) — passou.** Peguei o `mapa.json` do
     last-mile e plantei 3 erros: (a) `var_carga` renomeada para "Reduzir a
     carga por entregador" (verbo); (b) `meta`/`lacuna` removidos do loop
     B1 anotado; (c) o loop B2 (1 negativa, deveria ser B) com `tipo`
     forçado para `"R"` em `validacao.loops`, contradizendo o próprio nome
     "B2 · Limite do crescimento" que o squad deu a ele. Resultado:
     - Os erros (a) e (b) são pegos **mecanicamente** pelo
       `validador.js` já existente, sem precisar do agente: rodei
       `validarMapa` direto contra este mapa e confirmei os códigos
       `nome_com_verbo_ou_direcao` (ref `var_carga`) e `b_sem_meta` (refs
       `seta_07`/`08`/`09`) nos `problemas` retornados.
     - O erro (c) — que exige julgamento, não só contagem — foi pego pelo
       **agente real**: a primeira das 3 visões geradas
       (`vis_loop_b2_tipo`, tipo `validacao_relacao`) aponta exatamente a
       contradição entre o loop ser nomeado "B2 · Limite do crescimento" e
       a validação computada classificá-lo como R, citando a mesma conta
       de 1 seta negativa que classificou corretamente o B1.
     - Pedido/resposta arquivados em `execucoes-agente/criticar-erros_*.json`.
  5. **Nenhuma frase de solução — passou.** Busquei por padrões de
     solução ("vocês poderiam", "construir um app", "fazer um app", etc.)
     nos 9 textos de visão gerados pelos 3 testes reais deste bolt (3 do
     Energisa urbano, 3 do rural, 3 do modo crítica): nenhuma ocorrência.
     Mecanismo mecânico de guarda (`problemas_de_legibilidade` em
     `validar_resposta.py`, desde o Bolt 6) continua ativo e sem mudança.
  6. **Front-matter sem Write/Edit — passou.** `tools: Read, Grep, Glob`
     em `.claude/agents/agente-sistemico.md` — confirmado, sem mudança
     necessária.
  - **Suíte depois do bolt:** 99/99 JavaScript, 44/44 Python e
    `validar_exemplos.py` sem regressão — idêntico ao início do bolt
    (nenhum código de produção foi alterado, só fixtures de teste geradas
    e depois arquivadas/limpas).
  - **Fora de escopo, achado à parte:** a pasta `sessoes/rec_lastmile/`
    ficou com `csd.json`/`estacionamento.json`/`ritual.json` de um teste de
    um bolt anterior (7b/8/9) que não foi limpo — não é deste bolt, não
    toquei nela, mas fica registrado para você decidir se quer apagar.

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
