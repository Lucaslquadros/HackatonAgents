# Inception — Agente de Panorama e Priorização

## Objetivo

Um subagente que leva o squad de um **tema amplo ou de uma lista de
categorias dadas pelo edital** até **2 ou 3 problemas candidatos
ranqueados**, cada um já pronto para virar o ponto de partida de uma
sessão do Agente de Visão Sistêmica (`../agente-sistemico/`). Cobre o
funil: panorama (fatos com fonte) → clusters e atores → problemas
candidatos (pergunta-problema + magnitude) → ranqueamento (pesos
definidos pelo squad, o agente não escolhe por ele).

Resolve um problema concreto, já observado em teste real (ver
`../agente-sistemico/02-construction/BOLTS.md`, achado de 2026-10-05): se
o squad entra no quadro do Sistêmico só com um tema solto ("mobilidade em
São Paulo", ou as 6 categorias de um edital como o Campus Mobile), o
agente corretamente recusa desenhar um sistema e pede um recorte — mas
hoje **nada no app ajuda o squad a chegar nesse recorte**. O squad fica
sozinho comparando alternativas amplas antes mesmo de abrir o quadro.

"Pronto" é: dado um tema aberto **ou** uma lista fechada de categorias
(caso de edital), o squad tem uma matriz de 2-3 problemas candidatos
ranqueados com os pesos que ele mesmo definiu, escolhe um, e esse
problema vira o `mapa.contexto` de uma sessão nova do Sistêmico sem
precisar redigitar nada.

## Contexto

- **Disciplinas:** Inovação e Design Thinking (sensemaking, RUPT, Vuja Dé,
  Cynefin, Inovação = Novidade × Valor × Adoção) e Hackathons (Mapa
  Sistêmico do Desafio da Aula 4: atores, dor, causa, incerteza, Cynefin,
  3 hipóteses — 6 passos da dinâmica).
- **Ideia original do Lucas** (`../ROADMAP.md`, item 6, 2026-10-04),
  exemplo "saúde pública no Brasil": antes de mapear um sistema, o squad
  precisa entender o cenário macro (doenças que mais afetam, gastos,
  atores) e só então escolher um problema nichado.
- **Caso real usado para validar este Inception** (2026-10-05): o squad do
  Lucas vai participar do **Campus Mobile 2026** (Instituto Claro, 15ª
  edição) — já enquadrado pelo Agente Enquadrador, ver
  `../agente-enquadrador/saidas/07-campus-mobile-15-edicao-2026.md` e o
  edital fonte em `../editais-referencia/07-campus-mobile-15-edicao-2026.md`.
  O edital define **6 categorias fechadas** (Diversidade, Educação,
  Entretenimento e Cultura, Green Tech & Agtech, Saúde e Tecnologias
  Assistivas, Tecnologias Urbanas) — o squad só pode competir em **uma**.
  Isso é uma variação do caso original ("saúde pública" era tema aberto,
  sem lista pré-dada) — ver Pergunta de validação 1.
- **Onde se encaixa na jornada:** entre **Enquadrar** e o **Divergir**
  sistêmico, cobrindo as linhas 2 ("Panorama do tema"), 3 ("Mapa de
  atores") e 5 ("Ranqueamento de problemas") de `../FLUXO-PEDAGOGICO.md`.
  Consome, opcionalmente, a saída do Agente Enquadrador. Entrega ao Agente
  de Visão Sistêmica.
- **Metodologia:** AI-DLC solo, igual aos outros agentes. Padrão técnico
  herdado de `../ROADMAP.md` (não reabrir aqui).

## Decisões já tomadas (herdadas do ROADMAP, não reabrir sem motivo)

1. **Quatro passos do funil** (`../ROADMAP.md`, item 6):
   1. **Panorama:** pesquisa vira cartões de fato no quadro, **sempre com
      fonte e data**, ou marcados como estimativa com a conta aberta
      (Estimativa de Fermi quando não há dado oficial).
   2. **Clusters relacionais e atores:** o squad agrupa por **relação**
      (não por área/departamento — erro comum de sensemaking), mapeia
      quem sofre/decide/paga/opera/regula; o agente aponta nós (elementos
      em mais de um cluster) e lacunas.
   3. **Problemas candidatos:** cada um como pergunta-problema, com
      magnitude e fonte.
   4. **Ranqueamento:** matriz com magnitude, centralidade sistêmica,
      alavancagem alcançável, tratabilidade (Cynefin, dados, Δt),
      aderência ao edital **e aderência ao time** (ver decisão 7); **pesos
      definidos pelo squad**, o agente não escolhe.
2. **O mapa macro não é um CLD.** Um CLD de "saúde pública" ou de uma
   categoria inteira de edital teria dezenas de variáveis, e a aula diz
   que "vinte é descrição, não modelo". Usa clusters, não setas causais.
3. **Reaproveita o quadro do Agente Sistêmico, em modo clusters** — não
   constrói uma interface nova do zero. Mesmo motivo do Sistêmico ter
   quadro próprio (Inception dele, decisão 6): confiabilidade de campo
   estruturado em vez de texto livre num board genérico.
4. **Conversa em rodadas, não chat livre** (princípio de 2026-10-05,
   `../ROADMAP.md`): perguntas com opções e campo livre, respostas que
   viram campos do estado em disco. Mesmo padrão da entrevista do
   Sistêmico (Bolt 7).
5. **Vuja Dé como primeira pergunta do Panorama:** "qual é a explicação
   oficial deste problema?" vira hipótese a questionar, não causa aceita
   (`../FLUXO-PEDAGOGICO.md`, tabela de prioridade média).
6. **Reaproveita vocabulário já existente no schema** em vez de inventar
   um novo: fatos do Panorama usam a mesma classificação **certeza /
   suposição / dúvida** da Matriz CSD (`$defs/classificacao_csd` em
   `../modelo-dados/hackos.schema.json`); tratabilidade do ranqueamento
   pode citar `$defs/dominio_cynefin`. Not reinventar o que o Sistêmico e
   o modelo de dados já definiram.
7. **A jornada toda acontece na tela, de ponta a ponta** (confirmado pelo
   Lucas em 2026-10-05): nenhuma parte deste agente é relatório estático
   ou conversa fora do app — o squad é conduzido por entrevista em
   rodadas (decisão 4) do primeiro fato levantado até o finalista
   escolhido, tudo no mesmo quadro/sessão. Resolve a Pergunta de
   validação 3 (onde o ranqueamento acontece): não é exportado, fica na
   mesma sessão.
8. **"Aderência ao time" é critério do ranqueamento, não só do edital**
   (confirmado pelo Lucas em 2026-10-05). Motivação do próprio caso real:
   no Campus Mobile, **metade do peso da Etapa 2 avalia o perfil da
   equipe**, não o projeto (ver
   `../agente-enquadrador/saidas/07-campus-mobile-15-edicao-2026.md`) — um
   problema tecnicamente "maior" mas fora do que o time sabe/quer fazer
   não é a escolha certa. Isso é uma declaração do squad sobre si mesmo,
   não um fato do mundo — ver decisão 9 para como ela é capturada.
9. **Cadastro do Time mora no Passo 0, não no Panorama** (ajustado pelo
   Lucas em 2026-10-05) — **decisão movida para
   `../agente-orquestrador/01-inception/INCEPTION.md`** (decisões 1-2
   daquele arquivo), que agora é o dono de decisões cross-agent. O
   Panorama só **consome** `membro.areas_afinidade` no ranqueamento (passo
   4); não constrói a tela, não decide o schema. Ver Requisitos
   funcionais para a dependência que isso cria.
10. **Pesquisa inicial é um campo do próprio squad, por cenário**
    (confirmado pelo Lucas em 2026-10-05): além do agente poder buscar
    fatos (WebSearch, como o Enquadrador já fez), o squad tem onde
    registrar suas próprias descobertas sobre cada categoria/cenário que
    está avaliando — o Panorama não é só "o agente pesquisa e entrega",
    é um espaço de pesquisa conjunta.
11. **Classificação CSD é etapa explícita e pedagógica aqui, não rótulo
    escondido** (confirmado pelo Lucas em 2026-10-05): ajusta a decisão 6
    — não basta reaproveitar o campo `classificacao_csd` por baixo dos
    panos; o agente **ajuda o squad a entender e aplicar** certeza ×
    suposição × dúvida em cada fato levantado (próprio ou do squad),
    **antes** de seguir para clusters ou para o Sistêmico. O objetivo
    explícito do Lucas: o CLD subsequente nasce sobre hipóteses validadas
    ou embasadas em fato, não sobre achismo.
12. **Clusters: o squad constrói o board primeiro, o agente critica
    depois** (confirmado pelo Lucas em 2026-10-05, resolve a antiga
    Pergunta de validação 5): diferente do rascunho de CLD do Sistêmico
    (Bolt 7b, onde o agente propõe primeiro), aqui a ordem é squad-first —
    o time monta os clusters por relação, e só então o agente aponta nós
    (elementos em mais de um cluster) e lacunas.
13. **Gate sequencial, sem atalho para o CLD** (confirmado pelo Lucas em
    2026-10-05): Cadastro do Time → Pesquisa + classificação CSD por
    cenário → Clusters (board do squad, depois crítica do agente) →
    Problemas candidatos → Ranqueamento (incluindo aderência ao time) →
    Finalista escolhido → **só então** abre uma sessão do Sistêmico. Isso
    existe para evitar o squad "fazer a coisa errada" (palavras do Lucas)
    — investir num CLD antes de validar que está olhando pro cenário
    certo.

## Contrato de saída — o elo com o Agente de Visão Sistêmico

**Decisão central deste Inception**, resolvendo uma lacuna encontrada em
teste manual de 2026-10-05 (squad tentando usar o Sistêmico sem ter
passado por nenhum panorama antes): o finalista escolhido pelo squad no
ranqueamento **não é um relatório solto** — ele precisa sair pronto para
popular o `mapa.contexto` de uma sessão nova do Sistêmico
(`../modelo-dados/hackos.schema.json`, `$defs/mapa.contexto`), permitindo
pular a 1ª rodada da entrevista do Bolt 7 (que hoje só descobre tema e
situação concreta — informação que o Panorama já levantou):

| Campo do Panorama (por finalista) | Vira, no `mapa.contexto` do Sistêmico |
|---|---|
| Tema / categoria escolhida | `tema` |
| Pergunta-problema candidata (não só o nome do problema) | `pergunta_problema` |
| Recorte decidido no ranqueamento (fronteira do problema) | `fronteira` |
| Atores do cluster (sofre/decide/paga/opera/regula) | `atores[]` (`$defs/ator`) |
| Caminho para a saída do Enquadrador, se usada | `fonte_enquadrador` *(campo já existe no schema, hoje sem nada que o preencha — este agente é quem fecha esse elo)* |

Isso também resolve, de quebra, uma segunda lacuna encontrada hoje: não
havia nenhum caminho automático de `agente-enquadrador/saidas/*.md` até o
Sistêmico. O Panorama, ficando entre os dois na jornada, é o lugar certo
pra carregar essa referência adiante — não o Sistêmico reabrindo esse
elo sozinho.

## Requisitos funcionais

- [ ] **Lê o Cadastro do Time do Passo 0** (`$defs/squad` +
      `$defs/membro.areas_afinidade`, definido em
      `../agente-orquestrador/01-inception/INCEPTION.md`) para calcular
      "aderência ao time" no ranqueamento — **este agente não constrói a
      tela de cadastro**, só consome o resultado. **Dependência externa**
      com aquele Inception — ver Riscos.
- [ ] Aceita **tema aberto** (ex.: "mobilidade em São Paulo") e **lista
      fechada de categorias de um edital** (ex.: as 6 do Campus Mobile) —
      mesmo funil aplicado por cenário (ver decisões 1 e 10).
- [ ] Opcionalmente lê a saída do Agente Enquadrador (`fonte_enquadrador`)
      para herdar critérios/restrições já levantados (ex.: "Impacto" pesa
      mais no Campus Mobile) e usá-los no ranqueamento ("aderência ao
      edital").
- [ ] **Passo 1 (Panorama), por cenário:** campo para o squad registrar
      suas próprias descobertas + cartões de fato que o agente levanta
      (WebSearch quando fizer sentido — o Enquadrador já achou vencedores
      de edições anteriores do Campus Mobile assim); todo fato com fonte e
      data, ou marcado como estimativa.
- [ ] **Passo 1.5 (Classificação CSD), por cenário:** cada fato levantado
      (squad ou agente) é classificado como certeza, suposição ou dúvida,
      com o agente ajudando o squad a entender a diferença — etapa visível
      e explicada, não um rótulo automático.
- [ ] **Passo 2 (Clusters e atores), por cenário:** o squad monta o board
      de clusters por relação (não por área/departamento) primeiro; o
      agente analisa depois e aponta nós (elementos em mais de um
      cluster) e lacunas. Mapeia também quem sofre/decide/paga/opera/
      regula.
- [ ] **Passo 3 (Problemas candidatos):** cada um como pergunta-problema +
      magnitude + fonte, construído sobre os fatos já classificados (não
      antes da classificação CSD).
- [ ] **Passo 4 (Ranqueamento):** matriz com os critérios do ROADMAP
      (magnitude, centralidade sistêmica, alavancagem alcançável,
      tratabilidade, aderência ao edital, **aderência ao time** — do
      Cadastro do passo 0); pesos definidos pelo squad.
- [ ] Saída do finalista escolhido é compatível com `mapa.contexto` +
      `atores[]` do Sistêmico (ver Contrato de saída acima) — testável
      mecanicamente contra o schema. **Nenhum atalho para o CLD antes de
      passar pelos passos 0-4** (decisão 13).
- [ ] Não propõe solução de produto em nenhum passo (mesma regra absoluta
      dos outros agentes da plataforma).

## Requisitos não-funcionais

- [ ] Todo fato do Panorama é rastreável: fonte+data, ou estimativa com a
      conta aberta — nunca um número sem origem.
- [ ] Reaproveita o quadro/painel do Sistêmico como base técnica (não
      duplica JS/CSS do zero) — ver decisão 3.
- [ ] Testável sem depender de execução real do subagente para a lógica
      mecânica (clusters, matriz de ranqueamento) — mesmo padrão dos
      Bolts 0-3 do Sistêmico (validador em JS puro, testado antes do
      motor).

## Riscos / pontos de incerteza

- Lista fechada de categorias (caso Campus Mobile) pode não precisar do
  passo 1 (pesquisa de panorama) da mesma forma que um tema aberto —
  risco de o funil ficar pesado demais para esse caso, ou de simplificar
  demais e perder o valor do passo 1 quando ele de fato importa (ex.:
  dentro de "Green Tech & Agtech", ainda há um universo amplo de
  sub-temas a comparar).
- Clusterização por relação (passo 2) assume um volume razoável de fatos
  levantados no passo 1; com poucos fatos, pode não haver cluster
  significativo a formar.
- **Dependência externa com `../agente-orquestrador/`** (decisão 9): o
  Cadastro do Time não existe hoje em lugar nenhum da plataforma. Este
  agente consome esse dado no ranqueamento ("aderência ao time") — se o
  Passo 0 não estiver pronto antes, o bolt do ranqueamento fica bloqueado
  ou precisa de uma tela mínima provisória (decisão de como resolver isso
  fica para o Inception do Orquestrador, pergunta de validação 2 dele).
- Ranqueamento com pesos do squad é subjetivo por design (igual ao
  Comitê de Seleção do Campus Mobile, que se declara "soberano,
  análises de pontos de vista subjetivos") — o agente não deve fingir
  objetividade onde a aula não pede isso.

## Critérios de aceite

- Cadastro do Time preenchido **antes** de qualquer cenário ser aberto;
  tentar pular direto pra um cenário sem cadastro é bloqueado ou
  sinalizado, não silenciosamente ignorado.
- Rodado com o caso real do Campus Mobile (tema = 6 categorias do
  edital): produz ao menos 3 problemas candidatos por categoria
  explorada, cada um rastreável a um fato ou marcado como suposição, sem
  nenhum invent sem fonte.
- Squad consegue classificar um fato como certeza/suposição/dúvida pela
  tela, com o agente explicando a diferença quando perguntado — não é só
  um campo oculto no JSON.
- Board de clusters: o squad consegue montar manualmente, e só depois
  disso o agente aponta ao menos um nó (elemento em >1 cluster) ou uma
  lacuna — nessa ordem, não antes.
- O squad consegue, a partir da matriz de ranqueamento, escolher um
  finalista e abrir uma sessão do Sistêmico **sem** passar pela 1ª rodada
  da entrevista (tema/pergunta-problema/atores já vieram prontos) —
  teste de ponta a ponta real, não só checagem de schema. **E sem ter
  pulado os passos 0-2** (cadastro, pesquisa+CSD, clusters).
- Rodado também com um tema aberto (ex.: reaproveitar "mobilidade em São
  Paulo", já usado no Sistêmico) para confirmar que o agente não depende
  de uma lista fechada de categorias.
- Nenhuma frase de solução de produto em nenhuma saída.
- Front-matter do subagente não lista `Write` nem `Edit`, salvo nos passos
  que precisarem gravar estado do quadro (decidir e documentar, mesmo
  padrão do Sistêmico).

## Perguntas de validação

1. ~~O caso Campus Mobile (6 categorias fechadas) muda o passo 1?~~ —
   **respondida em 2026-10-05**: mesmo funil, aplicado por cenário; o
   squad tem campo de pesquisa própria por categoria (decisão 10).
2. ~~A "aderência ao time" vem de entrevista ou formulário? Uma vez ou
   por categoria?~~ — **respondida em 2026-10-05**: formulário (Cadastro
   do Time, decisão 9), preenchido **uma vez** por squad, antes de entrar
   em qualquer cenário.
3. ~~O ranqueamento fica na mesma sessão do app?~~ — **respondida**: sim,
   tudo na tela (decisão 7).
4. ~~Quem decide os clusters — squad ou agente primeiro?~~ —
   **respondida em 2026-10-05**: squad constrói o board primeiro, agente
   critica depois (decisão 12).
5. ~~Confirma o Contrato de saída pro Sistêmico?~~ — **respondida em
   2026-10-05** ("melhores práticas"): mantido como estava — é a leitura
   fiel do schema já existente (`mapa.contexto` + `atores[]`), sem
   inventar campo novo nem duplicar o que o Sistêmico já define.
6. ~~Como estender `membro` pra capturar afinidade por categoria?~~ —
   **respondida em 2026-10-05**: `membro.areas_afinidade` (estruturado +
   texto livre), decisão 9.1.
7. ~~Cadastro do Time pertence ao Panorama ou ao Passo 0?~~ —
   **respondida em 2026-10-05**: Passo 0 (decisão 9) — gera uma
   dependência externa registrada nos Requisitos e nos Riscos.
8. ~~O Inception está maduro pra virar bolts?~~ — **respondida em
   2026-10-06: sim, seguir com AI-DLC.** Ver `02-construction/BOLTS.md`.
