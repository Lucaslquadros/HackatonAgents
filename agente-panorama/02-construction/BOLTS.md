# Construction — Backlog de Bolts — Agente de Panorama e Priorização

> Um **bolt** é uma unidade pequena de trabalho, com um objetivo único e
> verificável. Um bolt por vez; parar no checkpoint antes de seguir.
>
> Status: `todo` → `em andamento` → `checkpoint` → `feito`

**Onde a UI mora:** o Inception (decisão 3) já fixou que este agente
**reaproveita o quadro do Sistêmico**, não constrói uma interface nova do
zero. Na prática: os Bolts 1-5 mexem principalmente dentro de
`../agente-sistemico/quadro/` (um novo modo/aba "Panorama", ao lado de
Editar/Análise/Visões), não dentro de `agente-panorama/`. O que mora
em `agente-panorama/` é o Inception, este backlog, o Operations, e — a
partir do Bolt 6 — o subagente (`.claude/agents/`) e o comando
(`.claude/commands/`), seguindo o mesmo padrão orchestrator-subagent dos
outros agentes.

**Ordem do backlog:** mesmo princípio do Sistêmico — entrega valor cedo
**sem LLM** (modelo de dados → fatos/CSD → clusters → problemas
candidatos → ranqueamento → handoff), motor do agente só entra no Bolt 6.

## Bolt 0 — Modelo de dados do Panorama

- **Objetivo:** estender `../modelo-dados/hackos.schema.json` com os
  objetos que faltam para o funil completo: `cenario` (tema/categoria em
  avaliação), `fato_panorama` (texto, fonte+data ou estimativa,
  `classificacao_csd`, autor), `cluster` (nome, elementos — ids de fatos
  ou atores), `problema_candidato` (pergunta-problema, magnitude, fonte,
  cluster de origem), `criterio_ranqueamento` (nome, peso — squad
  define), `ranqueamento_item` (problema × critério × nota),
  `finalista_panorama` (o objeto final compatível com `mapa.contexto` +
  `atores[]`, ver Contrato de saída do Inception).
- **Entregável:** schema atualizado; exemplo completo e válido (reaproveitar
  o cenário Green Tech & Agtech do Campus Mobile como caso real, já
  enquadrado); exemplos inválidos de propósito;
  `../modelo-dados/testes/validar_exemplos.py` cobrindo os casos novos.
- **Checkpoint:** testes passam, Lucas revisa o formato antes dos bolts de
  UI consumirem esse contrato.
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-06):** 9 novos `$defs` em
  `modelo-dados/hackos.schema.json`: `cenario` (tema/categoria + atores),
  `fato_panorama` (reaproveita `$defs/evidencia` direto — já tinha
  `tipo: "estimativa"` com campo de conta aberta, não precisou inventar
  nada novo), `cluster`, `problema_candidato`, `criterio_ranqueamento`,
  `nota_ranqueamento`, `finalista_panorama` (o contrato de saída pro
  Sistêmico, já no formato `tema`/`pergunta_problema`/`fronteira`/
  `atores`/`fonte_enquadrador`) e o container `panorama`.
  Exemplo real completo em `modelo-dados/exemplos/lastmile/panorama.json`
  — cenário Green Tech & Agtech grounded no edital de verdade (fato
  `fat_01` cita o item 2.5 do regulamento), 2 problemas candidatos, 3
  critérios de ranqueamento com pesos, notas, e um finalista escolhido.
  Checagem de integridade nova em `validar_exemplos.py` (autor no squad,
  referências entre cenário/fato/cluster/problema/critério/finalista) e
  2 casos inválidos novos em `casos.json`. Suíte completa sem regressão:
  `validar_exemplos.py` (15 casos inválidos agora), 44/44 Python do
  Sistêmico, 8/8 Python do Orquestrador, 99/99 JavaScript.

## Bolt 1 — Fatos do Panorama + classificação CSD, por cenário

- **Objetivo:** no quadro do Sistêmico, novo modo "Panorama": criar
  cenários, registrar fatos (texto + fonte/data ou "estimativa" com a
  conta aberta), e classificar cada fato como certeza/suposição/dúvida
  pela tela — com explicação visível da diferença (decisão 11, não é
  rótulo escondido). Só squad, sem agente ainda.
- **Entregável:** telas + lógica em `../agente-sistemico/quadro/`
  (arquivo novo, ex. `panorama.js`, seguindo a separação lógica/DOM já
  usada no resto do quadro); testes JS.
- **Checkpoint:** Lucas cria um cenário de verdade (Green Tech & Agtech),
  registra uns 5 fatos reais sobre o tema, classifica cada um.
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-06):**
  - **Onde a tela mora:** overlay de tela cheia, mesma mecânica do Ritual
    do fundo do U (Bolt 9) — não uma aba na lateral estreita, porque uma
    lista de fatos por cenário precisa de mais espaço do que o painel
    lateral do quadro oferece. Botão "Panorama" no cabeçalho, ao lado do
    botão do Ritual.
  - **Onde o dado mora** (decisão de arquitetura exposta para revisão):
    `agente-sistemico/panorama.json`, na raiz de `agente-sistemico/` —
    **não** dentro de `sessoes/<recorte>/`, porque o Panorama existe
    *antes* de qualquer recorte do Sistêmico nascer (só nasce no Bolt 5,
    quando o finalista é escolhido). Novo endpoint `GET/POST
    /api/panorama` em `agente-sistemico/servidor.py`, fora do padrão
    `/api/sessoes/<recorte>/...` dos outros documentos do squad —
    validação leve (campo `cenarios` precisa ser lista), mesmo nível de
    rigor que o resto deste servidor (validação completa de schema fica
    pro motor do Bolt 6, não pro servidor).
  - **Novo arquivo** `agente-sistemico/quadro/panorama.js`: funções puras
    (`novoPanorama`, `normalizarPanorama`, `adicionarCenario`/
    `atualizarCenario`/`removerCenario` — remover cenário também remove
    os fatos dele, cascata —, `adicionarFato`/`atualizarFato`/
    `removerFato`, `pendencias`, `avisos`, `paraContrato`) + HTML
    (`htmlPanorama`), mesma separação lógica/DOM do resto do quadro.
  - **Explicação da CSD na tela** (decisão 11): bloco `<details>`
    "O que significa certeza / suposição / dúvida?" visível em cada
    cenário aberto, com uma frase por classificação (`EXPLICACAO_CSD`
    em `panorama.js`) — não é só um `<select>` mudo com 3 opções.
  - **Evidência por fato:** reaproveita `$defs/evidencia` direto — tipo
    (fonte pública/entrevista/observação/dado/experimento/estimativa),
    descrição (obrigatória — texto do que comprova, ou a conta aberta se
    for estimativa), referência e data opcionais.
  - **Avisos não-bloqueantes** (mesmo princípio do Bolt 2.1 do
    Orquestrador, correção pós-teste real do Lucas: avisar em vez de só
    descartar): fato sem texto, ou com texto mas sem a descrição da
    evidência, aparece como aviso antes de `paraContrato` descartá-lo em
    silêncio.
  - **Primeira pergunta do Panorama** (decisão 5, Vuja Dé): dica fixa no
    topo de cada cenário aberto — "qual é a explicação oficial deste
    problema? Registrem-na como um fato — e questionem se ela é mesmo
    uma certeza."
  - **Testes:** 13 novos em JavaScript
    (`agente-sistemico/quadro/testes/panorama.test.js` — cobre cascata de
    remoção, validação de classificação CSD, avisos, e o que
    `paraContrato` descarta/preserva) e 1 em Python
    (`agente-sistemico/testes/test_motor.py`, `test_panorama_grava_e_le`
    — ciclo completo via HTTP real, isolado com `servidor.PANORAMA_ARQ`
    trocado por um arquivo temporário, mesmo padrão dos outros testes de
    servidor). Suíte completa sem regressão: 112/112 JavaScript (99
    existentes + 13 novos), 45/45 Python do Sistêmico (44 + 1 novo), 8/8
    Python do Orquestrador, schema sem mudança de resultado.
  - **Smoke test real** (servidor de verdade, porta 8768, fora do
    harness de teste): página e `panorama.js` respondem 200; `GET
    /api/panorama` sem arquivo devolve panorama vazio; `POST` salva um
    cenário de teste e `GET` lê de volta idêntico. Servidor parado e o
    `panorama.json` de teste apagado ao final — não é dado real do
    squad.
  - **Não testado ainda:** uso real pelo Lucas no navegador (o checkpoint
    deste bolt). Também não implementado: busca de fatos pelo agente via
    WebSearch (isso é o Bolt 6, motor) — este bolt é só squad.

## Bolt 2 — Board de clusters (squad-first)

- **Objetivo:** squad agrupa fatos/atores em clusters por relação
  (decisão 12 — squad constrói primeiro); validação mecânica (sem LLM)
  aponta **nós** (elemento presente em mais de um cluster) — é lógica de
  conjunto, não julgamento, cabe aqui sem agente.
- **Entregável:** UI de clusters + função pura de detecção de nós, com
  testes (gabaritos simples, mesmo espírito do `validador.js` do
  Sistêmico).
- **Checkpoint:** Lucas monta um board real com os fatos do Bolt 1 e vê
  pelo menos um nó apontado corretamente (ou confirma que não há, se for
  o caso).
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-06):** estendido o mesmo `panorama.js`/
  `panorama.json` do Bolt 1 (não um sistema paralelo). Novas funções
  puras: `adicionarCluster`/`atualizarCluster`/`removerCluster`,
  `adicionarElementoCluster`/`removerElementoCluster` (remover cluster
  não apaga o fato, só a referência), `nosDoCenario` (conjunto puro:
  elemento em >1 cluster do mesmo cenário = nó, sem agente). Seção
  "Clusters" nova dentro de cada cenário aberto na tela: criar cluster,
  escolher fatos/atores disponíveis num `<select>`, nome editável,
  elemento marcado com selo "nó" quando repetido. `avisos()` e
  `paraContrato()` estendidos: cluster sem nome ou sem elementos vira
  aviso não-bloqueante e é descartado ao salvar; referências a fatos que
  não sobreviveram ao `paraContrato` (sem texto/evidência) são limpas dos
  clusters que restam, em vez de deixar id quebrado. De quebra, também
  cobri uma lacuna do Bolt 1: `avisos()` existia mas não estava
  renderizado na tela — agora aparece como caixa no topo do Panorama
  (mesmo visual `--aviso`/`--aviso-fundo` do Cadastro do Time, Bolt 2.1
  do Orquestrador — variáveis novas em `estilo.css`).
  **Testes:** 7 novos em `agente-sistemico/quadro/testes/panorama.test.js`
  (119/119 no total, eram 112). Suíte completa sem regressão: 45/45
  Python do Sistêmico, 8/8 Python do Orquestrador,
  `validar_exemplos.py` sem mudança de resultado. `node --check` nos
  dois arquivos JS tocados, e smoke test via curl contra o servidor já
  em execução (porta 8766): quadro e `panorama.js` respondendo 200.
  **Não testado:** uso real pelo Lucas montando um board de verdade
  (checkpoint deste bolt).

## Bolt 3 — Problemas candidatos

- **Objetivo:** a partir dos clusters, squad registra problemas
  candidatos como pergunta-problema + magnitude + fonte.
- **Entregável:** UI + validação de schema (todo problema candidato
  rastreável a um fato ou cluster de origem).
- **Checkpoint:** Lucas registra ao menos 2 problemas candidatos reais
  pra Green Tech & Agtech.
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-06):** seção "Problemas candidatos" dentro de cada
  cenário aberto, depois da seção de clusters, mesmo overlay do Panorama.
  Squad cria um problema (pergunta-problema + magnitude, ambos texto
  livre), marca 1+ fatos **do mesmo cenário** como fonte (checkbox por
  fato; `alternarFonteProblema` recusa fato de outro cenário) e,
  opcionalmente, associa a um cluster de origem (`<select>`, só aparece se
  o cenário já tiver cluster). `estado.js`/`panorama.js` ganharam
  `adicionarProblema`/`atualizarProblema`/`removerProblema`/
  `alternarFonteProblema`/`problemasDoCenario`. `avisos()` e
  `paraContrato()` estendidos: problema sem pergunta, sem magnitude ou
  sem nenhuma fonte vira aviso não-bloqueante e é descartado ao salvar
  (mesmo princípio dos Bolts 1/2).
  **Cascata corrigida/estendida:** `removerFato` agora tira a referência
  de qualquer problema que o usava como fonte (antes só existia a cascata
  de cenário→fatos); `removerCluster` desliga `cluster_origem` de
  problemas que apontavam pra ele, sem apagar o problema;
  `removerCenario` agora também leva clusters e problemas junto — isso
  era uma lacuna do Bolt 2 (só cascateava fatos), corrigida aqui.
  **Testes:** 10 novos em `agente-sistemico/quadro/testes/panorama.test.js`
  (129/129 no total, eram 119). Suíte completa sem regressão: 45/45
  Python do Sistêmico, 8/8 Python do Orquestrador, `validar_exemplos.py`
  sem mudança de resultado. `node --check` limpo, smoke test via curl
  contra o servidor em execução (porta 8766): quadro e `panorama.js`
  respondendo 200.
  **Não testado:** uso real pelo Lucas registrando problemas de verdade
  (checkpoint deste bolt).

## Bolt 4 — Ranqueamento

- **Objetivo:** matriz com os critérios do Inception (magnitude,
  centralidade sistêmica, alavancagem alcançável, tratabilidade,
  aderência ao edital, **aderência ao time**); squad define os pesos,
  pontua cada problema candidato, o agente não escolhe. "Aderência ao
  time" lê `Hack_OS/squad.json` (Cadastro do Time, Bolt 2 do
  `agente-orquestrador`) — dependência externa já resolvida e testada.
- **Entregável:** UI da matriz + cálculo do total ponderado; leitura do
  `squad.json` real.
- **Checkpoint:** Lucas ranqueia os problemas candidatos do Bolt 3 com
  pesos de verdade, vê o resultado calculado bater com a conta manual.
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-06):**
  - **Nível do panorama inteiro, não por cenário** (como o Inception já
    previa): a seção "Ranqueamento" aparece no overlay Panorama assim
    que existe pelo menos 1 problema candidato em qualquer cenário, e a
    matriz lista todos os problemas candidatos juntos, com o nome do
    cenário de cada um — é o lugar certo pra comparar Green Tech & Agtech
    com qualquer outra categoria explorada.
  - **`agente-sistemico/quadro/panorama.js`:** `adicionarCriterio`/
    `atualizarCriterio`/`removerCriterio` (cascata: remover um critério
    tira as notas que o citavam), `definirNota` (upsert por
    problema×critério; nota vazia remove a entrada; valida faixa 0-10),
    `totalPonderado`, `apoioAderenciaTime`, `ehCriterioDeTime`,
    `CRITERIOS_SUGERIDOS` (os 6 do ROADMAP, com botão de atalho na tela
    quando a lista de critérios está vazia). `paraContrato` agora filtra
    de verdade critérios sem nome e notas órfãs (antes só repassava sem
    checar — corrigido de passagem).
  - **Total ponderado é média ponderada, não soma** (decisão exposta pra
    revisão): só conta os critérios já avaliados para aquele problema, e
    mostra "(avaliados/total de critérios)" ao lado — um problema com
    menos critérios preenchidos não fica artificialmente mais baixo só
    por estar em progresso. Pode trocar para soma simples se o Lucas
    preferir, está isolado numa função só.
  - **Apoio de "aderência ao time"** (não calcula a nota sozinho — quem
    decide é o squad): cruza o nome do cenário do problema com
    `membro.areas_afinidade` do `Hack_OS/squad.json` real (Cadastro do
    Time), por substring sem distinguir maiúsculas/acentos ("Green Tech"
    bate com "Green Tech & Agtech"). Aparece como `<details>` "apoio do
    time" só na(s) célula(s) de critério cujo nome contém "time"
    (`ehCriterioDeTime` — heurística pelo nome, documentada, fácil de
    trocar por um campo explícito se for ambíguo na prática).
  - **`agente-sistemico/servidor.py`:** nova rota `GET /api/squad`, só
    leitura, lendo `Hack_OS/squad.json` direto (mesmo arquivo que
    `agente-orquestrador/servidor.py` grava — este servidor nunca
    escreve nele). Devolve squad vazio se o arquivo ainda não existe,
    mesmo padrão do `/api/panorama`.
  - **`app.js`:** `squadCadastro` carregado uma vez no boot
    (`sincronizarSquad()`, igual ao padrão de `sincronizarPanorama()`);
    handlers de clique/input para os critérios e para as notas da matriz,
    seguindo exatamente o padrão já estabelecido nos Bolts 1-3 (estado
    atualiza a cada tecla sem redesenhar, pra não perder foco; o próximo
    `render()` natural — trocar de aba, clicar em outro lugar —
    já mostra o total atualizado).
  - **Testes:** 139/139 JavaScript (129 + 10 novos em
    `panorama.test.js`), 46/46 Python do Sistêmico (45 + 1 novo —
    `test_squad_so_leitura`), 8/8 Python do Orquestrador (inalterado),
    `validar_exemplos.py` sem regressão.
  - **Smoke test real** (servidor novo, porta 8770, parado ao final):
    `/api/panorama` e `/api/squad` responderam certo contra o
    `Hack_OS/squad.json` **real** do Lucas (Time A: Joao e Lucas
    Quadros); POST de um panorama completo com critério e nota salvou e
    leu de volta idêntico. `panorama.json` de teste apagado depois — não
    é dado real do squad.
  - **Não testado:** uso real pelo Lucas no navegador (o checkpoint deste
    bolt).

## Bolt 5 — Escolha do finalista + handoff pro Sistêmico

- **Objetivo:** squad escolhe o finalista; isso gera o objeto compatível
  com `mapa.contexto` + `atores[]` (Contrato de saída do Inception) e
  grava uma sessão nova que o Sistêmico consegue abrir direto, pulando a
  1ª rodada da entrevista (decisão central do Inception).
- **Entregável:** geração do `pedido-visao.json` inicial em
  `../agente-sistemico/sessoes/<recorte>/`, reaproveitando o formato que
  o Sistêmico já lê.
- **Checkpoint:** teste de ponta a ponta real — escolher o finalista aqui
  e abrir a sessão correspondente no Sistêmico sem redigitar nada.
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-06):** implementado sob prazo apertado (Lucas ia
  usar em sala no mesmo dia) — completo e testado, não cortado.
  - **`agente-sistemico/quadro/panorama.js`:** `montarFinalista` (monta o
    objeto do contrato — tema do nome do cenário, pergunta_problema do
    problema, atores do cenário, fronteira citando o cluster de origem
    quando existe; recusa se a pergunta-problema estiver vazia),
    `recorteDoFinalista` (slugifica o tema → `rec_<slug>`, nunca vazio),
    `escolherFinalista` (grava `pan.finalista`), `pedidoVisaoDoFinalista`
    (monta um `mapa` mínimo mas completo — todos os campos exigidos pelo
    schema presentes mesmo vazios — e **reaproveita `montarPedido` de
    `visoes.js`** em vez de duplicar a lógica de montagem do pedido).
  - **Handoff real:** o botão "Escolher" na matriz de ranqueamento chama
    `escolherFinalistaEGravarPedido` (novo, em `app.js`), que faz POST do
    pedido em `/api/sessoes/<recorte>/pedido` — **a mesma rota que o
    Sistêmico já usa** para a aba Visões normal, não um endpoint novo. O
    servidor cria a pasta `sessoes/<recorte>/` e devolve
    `comando: "/visao-sistemica <recorte>"`, que aparece na tela num
    banner ("Finalista escolhido... rode: `/visao-sistemica rec_...`").
  - Linha da matriz com o finalista fica destacada; escolher outro
    finalista depois é permitido (não é irreversível) — um aviso deixa
    claro que isso não apaga a sessão já criada pro recorte anterior.
  - **Testes:** 8 novos em JavaScript (147 no total, eram 139) —
    `montarFinalista` com/sem fronteira e com atores, recusa de
    pergunta-problema vazia, `recorteDoFinalista` com tema normal e com
    tema sem letras/números (`"???" → "rec_tema"`, nunca vazio),
    `escolherFinalista`, `pedidoVisaoDoFinalista` com todos os campos do
    `mapa` presentes e sem `fronteira` quando o finalista não tem uma.
  - **Teste de ponta a ponta real** (o mais importante deste bolt): script
    Node efêmero (apagado depois) rodou a sequência completa — cenário →
    fato → cluster → problema candidato → critério → nota → escolher
    finalista — contra um servidor de verdade (porta 8779, parado ao
    final). `POST /api/sessoes/rec_green_tech_agtech/pedido` devolveu
    `201` com `comando: "/visao-sistemica rec_green_tech_agtech"`; o
    `pedido-visao.json` gravado em
    `agente-sistemico/sessoes/rec_green_tech_agtech/` foi validado contra
    o schema completo com `jsonschema` (Python) — **passou**, com
    `mapa.contexto` (tema, pergunta_problema, fronteira) e `mapa.atores`
    corretamente populados a partir do finalista. Pasta de teste apagada
    depois (não é dado real do squad).
  - Suíte completa sem regressão: 147/147 JavaScript, 46/46 Python do
    Sistêmico, 8/8 Python do Orquestrador, `validar_exemplos.py` sem
    mudança de resultado.
  - **Não implementado neste bolt** (fora de escopo, adiado por decisão
    explícita de priorizar o essencial pro primeiro dia): Bolt 6 (motor
    com subagente/WebSearch) e Bolt 7 (testes de aceite completos do
    Inception) — o squad já consegue fazer a jornada inteira
    (Cadastro do Time → Panorama → Sistêmico) manualmente pela tela, sem
    precisar do agente pesquisar fatos sozinho.

## Bolt 6 — Motor v1: agente pesquisa fatos e critica clusters

- **Objetivo:** subagente `agente-panorama` (só leitura +
  WebSearch/WebFetch, como o Enquadrador) + comando de barra, no mesmo
  padrão orchestrator-subagent dos outros agentes. Passo 1: propõe fatos
  com fonte e data pro squad aceitar/classificar. Mais pra frente
  (pode virar sub-bolt): aponta lacunas nos clusters que a detecção
  mecânica de nós (Bolt 2) não cobre.
- **Entregável:** `.claude/agents/agente-panorama.md`,
  `.claude/commands/panorama.md`, validador da resposta (mesmo padrão de
  `modelo-dados/validar_resposta.py`).
- **Checkpoint:** ciclo completo pedido → resposta com o cenário Green
  Tech & Agtech, testado de verdade (sessão headless, mesmo mecanismo já
  validado nos outros agentes).
- **Status:** todo

## Bolt 7 — Testes de aceite do Inception

- **Objetivo:** rodar os critérios de aceite do Inception — caso real do
  Campus Mobile com pelo menos a categoria Green Tech & Agtech ponta a
  ponta (cadastro → fatos/CSD → clusters → problemas → ranqueamento →
  finalista → Sistêmico), e um tema aberto (reaproveitar "mobilidade em
  São Paulo") pra confirmar que não depende de lista fechada.
- **Status:** todo
