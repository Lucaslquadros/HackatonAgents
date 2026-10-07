# Construction — Backlog de Bolts — Agente Orquestrador

> Um **bolt** é uma unidade pequena de trabalho (minutos a poucas horas),
> com um objetivo único e verificável. Trabalhe **um bolt por vez**. Ao
> terminar um bolt, pare no checkpoint antes de seguir para o próximo.
>
> Status: `todo` → `em andamento` → `checkpoint` → `feito`

**Escopo desta Construction:** só o **Cadastro do Time** (Passo 0,
Inception decisões 1-2). Porta/pacto/sala e o resto da experiência do
Orquestrador **não entram aqui** — continuam esperando o gate do
Objetivo 1 (Sistêmico fechar os checkpoints pendentes). Decidido com o
Lucas em 2026-10-05: solução definitiva, não uma tela emprestada por
outro agente.

**Onde o dado mora:** `Hack_OS/squad.json`, na raiz do projeto — não
dentro de uma pasta de agente específico, porque o squad é um só para a
plataforma inteira, preenchido uma vez (Inception, decisão 1), não por
recorte/categoria. Formato: `$defs/squad` de
`../modelo-dados/hackos.schema.json`.

## Bolt 1 — Estender o schema com `membro.areas_afinidade`

- **Objetivo:** adicionar ao `$defs/membro` de
  `../modelo-dados/hackos.schema.json` o campo `areas_afinidade` (lista de
  `{area, nivel, como_agrega}`), conforme a Inception decisão 2 — sem
  mexer em `frentes` nem em mais nada do schema.
- **Entregável:** schema atualizado; um exemplo válido de `squad` com 2-3
  membros, pelo menos um com `areas_afinidade` preenchido, em
  `../modelo-dados/exemplos/`; teste em
  `../modelo-dados/testes/validar_exemplos.py` cobrindo o caso válido e
  pelo menos um inválido (ex.: `nivel` fora do enum).
- **Checkpoint:** `python modelo-dados/testes/validar_exemplos.py` passa,
  Lucas revisa o formato do exemplo antes do Bolt 2 usar esse contrato na
  tela.
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-05):** `membro.areas_afinidade` adicionado ao
  schema (lista de `{area, nivel, como_agrega}`; `area` e `como_agrega`
  texto livre, `nivel` enum `experiencia`/`interesse`/`nenhum`).
  `modelo-dados/exemplos/lastmile/squad.json` ganhou o campo em
  `mem_ana` (2 áreas, uma com experiência e motivo, outra "nenhum").
  Novo caso inválido `membro_area_afinidade_com_nivel_invalido` em
  `modelo-dados/exemplos/invalidos/casos.json`. Suíte completa sem
  regressão: `validar_exemplos.py` (13 casos inválidos, todos os válidos
  e integridade), 44/44 Python, 99/99 JavaScript.

## Bolt 2 — Tela do Cadastro do Time

- **Objetivo:** formulário local (HTML/CSS/JS, sem build — mesmo padrão
  do quadro do Sistêmico) onde o squad preenche nome do hackathon e, por
  integrante: nome, frentes (checkboxes das 5 opções fixas) e lista
  dinâmica de áreas de afinidade (nome da área + nível + como agrega).
  Área **não é lista fixa** — o squad digita o nome (pode copiar das
  categorias do edital em questão, ou de qualquer tema).
- **Entregável:** `agente-orquestrador/cadastro/index.html` (+ JS/CSS) e
  `agente-orquestrador/servidor.py` (biblioteca padrão, mesmo estilo do
  servidor do Sistêmico) servindo a tela e persistindo em
  `Hack_OS/squad.json`.
- **Checkpoint:** Lucas cadastra o squad real do Campus Mobile pela tela
  (nome dele + integrantes que existirem), o arquivo resultante passa no
  schema (`validar_exemplos.py` ou checagem equivalente), e dá pra
  reabrir a tela depois e ver os dados carregados de volta.
- **Status:** checkpoint — aguardando Lucas cadastrar o squad de verdade
- **Resultado (2026-10-05):**
  - `agente-orquestrador/cadastro/` — `index.html` (campo do hackathon,
    lista dinâmica de integrantes com `<template>` para membro e para
    área de afinidade), `estado.js` (lógica pura: adicionar/remover
    membro, alternar frente, adicionar/remover/atualizar área de
    afinidade, `paraContrato` tira nomes/áreas vazios e campos opcionais
    sem conteúdo antes de mandar pro schema, `pendencias` bloqueia salvar
    sem hackathon ou sem nenhum integrante nomeado), `app.js` (DOM +
    `fetch`, carrega o squad existente ao abrir a página), `estilo.css`
    (mesmos tokens de cor do quadro do Sistêmico, formulário próprio).
  - `agente-orquestrador/servidor.py` — biblioteca padrão, mesmo estilo
    do servidor do Sistêmico; `GET/POST /api/squad` valida contra
    `$defs/squad` com `jsonschema` antes de gravar, path padrão `squad`
    não existe ainda → devolve squad vazio em vez de 404 (facilita a
    tela carregar na primeira vez). Dado fica em `Hack_OS/squad.json`
    (raiz do projeto, fora de qualquer pasta de agente — decisão do
    Inception, dado da plataforma inteira).
  - Testes: 13 em JavaScript (`npm test` em `agente-orquestrador/cadastro/`)
    e 8 em Python (`python -m unittest discover -s agente-orquestrador/testes`
    — validação de schema isolada + ciclo HTTP completo com
    `servidor.SQUAD_ARQ` trocado por um arquivo temporário, mesmo padrão
    de `agente-sistemico/testes/test_motor.py`).
  - **Smoke test real via curl** (servidor de verdade, porta 8766):
    página responde 200; `GET /api/squad` sem arquivo devolve squad
    vazio; `POST` com squad válido salva e `GET` lê de volta idêntico;
    `POST` com `nivel` fora do enum é recusado (400, com o erro exato do
    jsonschema) e **não grava nada**. Servidor parado ao final.
  - **Decisão sobre o `squad.json` do smoke test:** apagado depois do
    teste — era um squad fabricado ("Lucas" com uma área inventada), não
    o cadastro real; o checkpoint deste bolt é justamente o Lucas
    preencher isso de verdade pela tela, então o arquivo ficou vazio de
    propósito (não existe em `Hack_OS/`) à espera disso.
  - Suíte completa sem regressão: 99 JS do Sistêmico + 13 JS novos, 44
    Python do Sistêmico + 8 Python novos, `validar_exemplos.py` sem
    mudança de resultado.
  - **Decisão de design revisada pelo Lucas (2026-10-05):** área de
    afinidade sem nome não deve mais ser descartada em silêncio — precisa
    **avisar** o squad antes/ao salvar. Ver Bolt 2.1.

## Bolt 2.1 — Aviso de área incompleta + Visão da equipe

- **Objetivo:** (a) trocar o descarte silencioso de área de afinidade sem
  nome por um **aviso visível** ao squad (não bloqueia salvar, mas avisa);
  (b) nova tela/aba, dentro do mesmo Cadastro, com uma **visão somente
  leitura da equipe** — lista de integrantes, frentes e afinidades, com
  indicação clara de quem está com cadastro incompleto — para o squad
  conferir que todo mundo já se inscreveu antes de seguir pro Panorama.
- **Entregável:** ajuste em `agente-orquestrador/cadastro/estado.js`
  (função de aviso, não mais descarte silencioso) e `app.js`
  (renderização do aviso); nova aba "Visão da equipe" em
  `agente-orquestrador/cadastro/index.html` reaproveitando o padrão de
  abas Editar/Análise do quadro do Sistêmico.
- **Checkpoint:** Lucas confere a visão da equipe com o squad real
  cadastrado no Bolt 2, vê o aviso aparecer ao deixar uma área sem nome, e
  confirma que os critérios de "cadastro incompleto" fazem sentido
  (documentar quais critérios foram escolhidos e por quê).
- **Status:** checkpoint — aguardando revisão do Lucas
- **Resultado (2026-10-05):**
  - **Aviso não-bloqueante** (`estado.js`, função `avisos`): toda área de
    afinidade sem nome gera um aviso nomeando o integrante ("Área de
    afinidade sem nome em 'Ana' — não vai ser salva."); `app.js` renderiza
    isso numa caixa própria (`#avisos`, cor de alerta, distinta da caixa
    vermelha de pendências que já existia) acima do rodapé de salvar,
    atualizada a cada edição — não só ao clicar salvar.
  - **Critério de "cadastro incompleto"** (`completudeMembro`,
    decisão própria a revisar): falta nome, falta ao menos 1 frente
    marcada, ou falta ao menos 1 área de afinidade com `nivel`
    `experiencia`/`interesse` (uma área marcada só como `nenhum` não
    conta — ela declara ausência de afinidade, não presença). Frentes e
    afinidade continuam opcionais no schema; isso é um padrão de produto
    pra sinalizar "vale a pena completar", não uma regra do contrato.
  - **Aba "Visão da equipe"** (`visao.js`, novo — função pura
    `htmlVisaoEquipe`, sem DOM, mesmo padrão de
    `agente-sistemico/quadro/painel.js`): banner verde "squad pronto" ou
    laranja "ainda não está pronto" no topo; cada integrante como cartão
    com selo Completo/Incompleto, frentes e áreas como "chips", e a lista
    de motivos quando incompleto. Abas reaproveitam o padrão
    `role="tablist"`/`role="tab"` do quadro do Sistêmico. A visão lê o
    **estado em memória da própria página** (reflete edições não salvas
    ainda, não só o último save) — decisão deliberada: é mais útil
    conferir em tempo real do que só depois de salvar.
  - **Testes:** 24/24 em JavaScript agora (13 existentes + 11 novos: 7 em
    `estado.test.js` para `avisos`/`completudeMembro`/`resumoEquipe`, 4
    em `visao.test.js` novo, incluindo teste de escape de HTML). 8/8
    Python sem mudança (este bolt não tocou backend). Schema sem
    regressão.
  - **Smoke test real:** servidor subido numa porta separada (8767),
    `visao.js` confirmado servido (200, não quebraria por 404 no
    navegador), `/api/squad` respondendo. Servidor parado ao final.
  - **Decisão que merece seu olhar:** o critério de completude acima é
    palpite razoável, não pedido explícito seu — se achar muito rígido
    (ex.: exigir área de afinidade pode ser cedo demais pra alguém que só
    quer garantir a vaga no squad primeiro), é só ajustar
    `completudeMembro` em `estado.js`, o resto (testes, aba, banner) seguem
    funcionando sem mudança em cascata.

- **Correção pós-teste real (2026-10-05):** você testou pelo celular e
  relatou "tentei cadastrar dois integrantes e não consegui salvar o
  segundo" + "ficou confuso ficar aparecendo duplicado um abaixo do
  outro", pedindo adicionar/editar/apagar integrante de forma clara.
  - **Causa raiz confirmada** (reproduzida com teste antes de corrigir,
    não só hipótese — ver `cadastro/testes/estado.test.js`, teste
    "reprodução: duplo toque em '+ Integrante'..."): **não é colisão de
    id** (`proximoIdMembro` já garante sequência única, testado desde o
    Bolt 2). É puramente de interface: o botão "+ Integrante" não tinha
    nenhuma guarda contra toque duplo/fantasma (comum em touchscreen).
    Um único toque às vezes dispara 2 cliques, criando 2 cartões em
    branco visualmente idênticos ("apareceu duplicado"); se só um deles
    ganha nome antes de salvar, `paraContrato` descartava o outro **em
    silêncio** — por isso parecia que "o segundo não salvou", quando na
    verdade ele nunca teve nome pra começo de conversa.
  - **Correções:**
    1. `app.js`: botão "+ Integrante" fica desabilitado por 400ms após o
       clique (guarda contra duplo toque).
    2. `app.js`: ao adicionar um integrante, a tela rola até o cartão
       novo e foca o campo de nome — feedback imediato de que o toque
       funcionou, pra ninguém tocar de novo "pra garantir".
    3. `estado.js`: `avisos()` agora também aponta integrante sem nome
       (antes só apontava área de afinidade sem nome) — se um cartão em
       branco escapar mesmo assim, o squad vê o aviso antes de salvar em
       vez de o integrante só sumir.
    4. `index.html` + `estilo.css`: cada cartão ganhou um cabeçalho
       visual próprio ("Integrante N — nome", atualizado ao digitar) e o
       botão "Remover integrante" ficou mais visível (texto "🗑 Remover
       integrante", borda vermelha, posição de destaque) — antes era só
       um botãozinho de texto ao lado do campo de nome, fácil de não
       notar. Também entrou um contador ("N integrante(s) cadastrado(s)")
       acima da lista.
  - **Testes:** 26/26 JavaScript (24 antes + 2 novos: aviso de
    integrante sem nome, e a reprodução do bug relatado). Suíte Python
    inalterada (bug era só de front-end, backend não mudou).
  - **Smoke test:** servidores já rodando nas portas 8766 e 8767
    confirmados servindo os arquivos atualizados (sem precisar
    reiniciar — arquivo estático é lido por requisição).
  - **Não testado por mim:** o comportamento real de toque/teclado num
    celular de verdade — só reproduzi a cadeia de causa e efeito via
    teste automatizado e revisão de código. O teste final é você tentar
    de novo pelo celular.

## Bolt 3 — Operations

- **Objetivo:** documentar como rodar o Cadastro do Time, onde o
  `squad.json` fica, e deixar claro (para quem for abrir o Inception do
  Agente de Panorama depois) que esse é o contrato que o passo de
  "aderência ao time" do ranqueamento vai ler.
- **Entregável:** `03-operations/OPERATIONS.md` preenchido.
- **Checkpoint:** Lucas confirma que a documentação é suficiente para
  retomar isso em outra sessão sem perder contexto.
- **Status:** checkpoint — aguardando confirmação do Lucas
- **Resultado (2026-10-06):** `03-operations/OPERATIONS.md` preenchido —
  como rodar (porta padrão 8766, bind em `0.0.0.0`, URLs local e de rede
  impressas ao subir), onde o dado fica (`Hack_OS/squad.json`, contrato
  para o Agente de Panorama via `membro.areas_afinidade`), como rodar os
  testes, checklist de saúde (5 itens, incluindo a guarda contra toque
  duplo), e changelog dos Bolts 1, 2, 2.1 e da correção pós-teste real.
