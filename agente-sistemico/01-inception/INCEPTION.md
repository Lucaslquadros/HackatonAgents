# Inception — Agente de Visão Sistêmica

## Objetivo

Um subagente que ajuda o squad a **entender o sistema que produz o problema
do desafio** antes de escolher a solução. Recebe um tema e uma descrição de
problema (digitados livremente ou vindos da saída do Agente Enquadrador),
entrevista o squad, monta um **primeiro rascunho de Diagrama de Loop Causal
(CLD)**, critica as versões que o squad ajustar e, no fim, aponta **onde**
estão os pontos de alavancagem do sistema (nível de Meadows), sem dizer
**o que** construir.

O agente ataca um erro que aparece em todos os casos da disciplina de
Inovação e Design Thinking: a intervenção escolhida quase sempre fica no
nível 1 de Meadows, o de parâmetros ("contratar mais", "baixar o limiar").
Em hackathon é igual: o squad lê o sintoma no edital, constrói um app que
ataca o sintoma, e a banca pergunta "mas por que isso acontece?".

"Pronto" é: o squad roda o agente sobre 2 ou 3 recortes de sistema do mesmo
edital, tem um mapa por recorte (com loops classificados corretamente,
atrasos marcados e hipóteses testáveis) e consegue comparar os recortes para
**decidir ele mesmo** onde está a melhor alavanca.

## Contexto

- **Disciplinas:** Inovação e Design Thinking (IBMEC IBM1740, 2026.2) como
  base teórica; Hackathons, Innovation Challenges e IA (Prof. Ari Amaral)
  como aplicação.
- **Material-base (fontes em `C:\Faculdade\2026_2\Inovacao_Design_Thinking\`):**
  - `Revisao_AP1/fontes_md/04_Pensamento_Sistemico_CLD_Little_e_Metricas.md`:
    análise × síntese (Ackoff), iceberg em 4 camadas, CLD (variáveis,
    polaridade, R/B, atrasos, método em 7 passos, checklist de qualidade),
    arquétipos, pontos de alavancagem de Meadows, trio de métricas.
  - `Revisao_AP1/fontes_md/02_RUPT_SenseMaking_e_Cynefin.md`: sensemaking
    (explorar → mapear → agir), clusters por relação, nó do sistema,
    sintoma × causa × hipótese, Cynefin e experimento safe-to-fail
    (guardrail, critério de amplificação, critério de interrupção).
  - `Revisao_AP1/fontes_md/03_Teoria_U.md`: níveis de escuta (downloading ×
    factual × empática × generativa), base da postura da entrevista.
  - Decks `aula_pensamento_sistemico_cld.pptx`,
    `pensamento-sistemico-cld-ibmec.pptx` e o caso `nexa-pay-pensamento-sistemico__3_.html`.
- **Onde se encaixa na plataforma:** fica entre **Enquadrar** e
  **Divergir** na jornada da Aula 2 de Hackathons, mas pode rodar de novo
  ao longo de toda a jornada (ver Requisitos). Consome, opcionalmente, a
  saída do Agente Enquadrador. A saída dele (hipóteses por seta) pode virar
  referência para o Agente de Alinhamento e matéria-prima para o painel de
  hipóteses previsto em `VISAO-EXPERIENCIA.md`.
- **Alinhamento com as entregas:** sustenta a AC2 (problem framing e
  discovery) e a AC3 (Product Vision e hipóteses) de Hackathons, e a
  "Blindagem de Q&A": "nossa solução age numa regra do sistema, não num
  parâmetro" é resposta pronta para a pergunta "por que isso resolve?".
- **Metodologia:** AI-DLC solo, igual aos outros agentes. Padrão técnico
  herdado de `Hack_OS/ROADMAP.md` (não reabrir aqui).

## Decisões já tomadas (conversa com o Lucas, 2026-10-04)

1. **Objeto de análise:** o sistema do *problema compartilhado no edital*,
   não o squad em si. (A análise do squad como sistema, com WIP, Lei de
   Little e Brooks, fica fora deste ciclo.)
2. **Entrada desacoplada:** o agente funciona com **qualquer tema +
   descrição livre**, sem depender do Agente Enquadrador. Motivo: construir
   as peças em fragmentos e testar cada uma isolada antes de juntar. A saída
   do Enquadrador é uma entrada **opcional** que, quando existe, preenche o
   tema automaticamente.
3. **Papel híbrido:** o agente **entrevista**, **monta o primeiro rascunho**
   do CLD e **critica** os ajustes que o squad fizer depois. É uma exceção
   consciente ao "só pergunta" dos outros agentes; ver a fronteira abaixo.
4. **Várias execuções:** roda em vários momentos e sobre **vários recortes**
   do mesmo edital (ex.: 2 ou 3 sistemas candidatos) para o squad comparar
   alavancas.
5. **Cynefin vira um componente separado** (triagem). Ele classifica o
   desafio e, se for complexo, encaminha para este agente. Este agente
   **não depende** da triagem para funcionar: aceita a classificação como
   entrada opcional. A triagem ganha seu próprio ciclo (registrada no
   `ROADMAP.md`).
6. **Quadro próprio, no estilo Miro** (não o Miro real). Canvas onde o
   squad arrasta variáveis e liga setas; polaridade (+/−) e atraso (‖) são
   **campos** da seta, não texto. Motivo: a classificação R/B depende de
   polaridade confiável, e um board do Miro guarda seta como linha com
   rótulo livre. Exportar para o Miro fica como possibilidade futura (há
   conector oficial).
7. **Painel lateral "Visões do agente"**, ao lado do quadro, que reage
   enquanto o mapa é construído: valida relações, **sugere conexões**
   possíveis e aponta **visões que não estão sendo abordadas**.

8. **Escopo: só o sistema micro.** O panorama macro (pesquisa do tema,
   clusters, atores, ranqueamento de problemas) fica com um agente
   separado, o **Agente de Panorama e Priorização** (`ROADMAP.md`, item 6).
   Este agente recebe um problema já recortado, seja digitado livremente,
   seja um dos finalistas do Panorama, e faz o CLD dele. O quadro é o
   mesmo, com dois modos: clusters (Panorama) e CLD (este agente).
9. **Motor do painel: opção (c)** — começar com uma sessão do Claude Code
   como motor e migrar para a API do Claude depois, mantendo o contrato
   JSON fixo entre quadro e motor.

10. **Integração com o ritual do fundo do U e com a Matriz CSD**
    (`FLUXO-PEDAGOGICO.md`, 5.1 e 5.2). Durante o ritual, o painel deste
    agente fica oculto. Depois, o agente recebe as percepções individuais
    de cada membro, liga cada uma a ator, variável ou loop do mapa, mostra
    a cobertura por membro e transforma o que não está no mapa em visões
    ausentes. As marcações `fato`/`inferencia` das setas passam a ser
    `certeza`/`suposicao` da Matriz CSD; toda suposição gerada aqui vai
    para a aba CSD como proposta.

11. **Seguir o template da aula** (quadro Miro de DT, ver
    `FLUXO-PEDAGOGICO.md` 7.1). O quadro e o painel reproduzem os 4 blocos
    da dinâmica "Pensamento Sistêmico + Cynefin":
    - Bloco 1, variáveis (substantivos curtos, até ~10);
    - Bloco 2, CLD com **cor por tipo de variável**: neutra, problema,
      resultado positivo;
    - Bloco 3, análise: loop principal e secundários (do validador),
      Cynefin com justificativa, **delay identificado**, **variável
      ignorada (mas relevante)**;
    - Bloco 4, intervenção: até 2 alavancas, cada uma com **impacto
      esperado** e o **teste de sanidade** "se aumentarmos X, o sistema
      melhora ou piora?".

    As **intervenções programadas do professor** viram gatilhos do painel:
    "isto é um sistema ou uma lista de causas?" (quando há setas mas nenhum
    loop fechado), "onde fecha o loop?" (variáveis soltas), "vocês estão
    resolvendo o problema ou reagindo a ele?" (quando uma alavanca é de
    nível parâmetro). O painel também pede o **comportamento ao longo do
    tempo** de uma variável do loop principal, como no case de avaliação.

12. **Conversa com o squad: guiada, em rodadas — não chat livre**
    (2026-10-05, depois do teste "só o tema" com o cenário de bicicleta em
    São Paulo). Uma única pergunta composta não leva o squad do tema ao
    recorte; é preciso conversar. A conversa acontece em **rodadas**: o
    agente devolve de 3 a 5 perguntas de uma vez, cada uma com opções e
    campo livre; o squad responde num formulário no painel; cada resposta
    preenche um campo concreto (fronteira, horizonte, ator, item da CSD);
    a rodada seguinte parte do que foi respondido. Motivos: chat aberto
    puxa a IA para responder em vez de perguntar; o motor atual (sessão do
    Claude Code) é lento para ida e volta; respostas estruturadas ficam no
    mapa, conversa solta se perde. Um **chat ancorado numa visão** (o
    squad discute uma sugestão específica) fica para depois da migração do
    motor para a API. No fluxo completo, um tema solto entra pelo Agente de
    Panorama; a entrevista deste agente cobre o recorte que chega
    incompleto e o uso avulso do agente.

### Quadro + painel: como as camadas se dividem

| Camada | Quando roda | O que faz | Motor |
|---|---|---|---|
| **Validador instantâneo** | A cada edição | Encontra ciclos, conta negativas (par → R, ímpar → B), pinta o loop; acusa B sem meta, variável fora de loop, mais de 12 variáveis, nome com verbo/direção ("aumento de", "queda na") | Código determinístico no próprio quadro, sem LLM |
| **Visões do agente** | Quando o squad pausa a edição (debounce) ou clica "pedir visão" | (a) **Conexões sugeridas**: setas fantasma tracejadas no quadro, cada uma com o mecanismo em uma frase; (b) **Visões ausentes**: camada do iceberg vazia, ator/stakeholder fora do mapa, atraso provável não marcado, sinal de arquétipo; (c) **Validação de relação**: para uma seta, pergunta mecanismo e evidência ("que dado mostraria isso?") | LLM (ver pergunta de validação 1) |
| **Decisão do squad** | Sempre | Seta fantasma só vira seta real se o squad **aceitar**; recusar registra o motivo. O agente nunca altera o mapa sozinho | Interface |

As setas fantasma resolvem parte do risco de ancoragem: o agente sugere
dentro do quadro, mas toda sugestão passa por um aceite explícito.

### A fronteira entre "rascunhar o sistema" e "propor solução"

O agente pode afirmar **como o sistema funciona** (variáveis, setas, loops,
arquétipos) e **onde intervir** (qual variável ou loop, em que nível de
Meadows). Ele **não** diz **o que construir** (app, chatbot, sensor,
campanha). Exemplo:

- Permitido: "o loop R1 é sustentado pela regra 'mede-se chamados fechados
  por hora'; isso é uma alavanca de nível 4 (regra)."
- Proibido: "vocês poderiam fazer um dashboard que mede resolução na
  primeira vez."

O rascunho é sempre apresentado como **hipótese a ser derrubada**, com cada
seta marcada como `fato` (citada da descrição/edital) ou `inferencia`.

## Arquitetura proposta (a confirmar em Construction)

| Peça | Papel | Por quê |
|---|---|---|
| **Quadro** (página web local) | Canvas de variáveis e setas, com o validador instantâneo embutido; salva o mapa em JSON | Decisão 6 |
| **Painel "Visões do agente"** | Lado direito do quadro; mostra validações, setas fantasma, visões ausentes, alavancas e hipóteses | Decisão 7 |
| **Motor do agente** | Recebe o estado do mapa (JSON) + tema e devolve visões (JSON com tipos fixos: `conexao_sugerida`, `visao_ausente`, `validacao`, `alavanca`, `hipotese`) | Contrato fixo de entrada/saída deixa o motor trocável (ver pergunta 1) |
| **Entrevista inicial** | Antes do primeiro rascunho: fronteira, horizonte, iceberg | Pode viver no próprio painel (perguntas com opções) em vez de um comando de barra |
| Arquivos `saidas/<recorte>/mapa.json` (+ histórico) | **Estado.** Um mapa por recorte, com versões | Mesmo padrão de arquivo em disco da plataforma |
| Comparar recortes (ciclo posterior) | 2 ou 3 mapas lado a lado com as alavancas | Atende o caso "várias opções no mesmo edital" |

**Nota:** a primeira versão deste Inception previa um comando
`/mapear-sistema` como entrevistador e um script `validar_cld.py`. Com o
quadro, a validação passa para dentro do quadro (mesma lógica, em
JavaScript) e a entrevista pode ir para o painel. O tipo "não propor
solução de produto" continua garantido pelo **formato fixo** das visões:
não existe tipo `solucao`.

## Fluxo de uma sessão (modo rascunho)

0. **Entrada.** Tema + descrição livre, ou caminho de uma saída do
   Enquadrador. Opcional: classificação Cynefin. Se o domínio for claro ou
   complicado, o agente avisa que o mapa sistêmico deve pesar pouco e
   pergunta se o squad quer seguir mesmo assim.
1. **Fronteira e pergunta-problema** (passos 1-2 do método de 7 passos).
   Qual o recorte? Qual o horizonte de tempo? A pergunta é do tipo "por que X
   piorou apesar de Y?" e não do tipo "por que não somos ágeis?".
2. **Iceberg.** Eventos → padrões → estrutura → modelos mentais, com perguntas
   curtas por camada. Postura de escuta factual: o agente procura o que
   **contradiz** a visão inicial do squad, não o que a confirma.
3. **Rascunho v1.** De 6 a 12 variáveis (substantivos neutros e mensuráveis),
   setas com polaridade e marcação fato/inferência, atrasos marcados, loops
   fechados e nomeados com uma história de uma frase. Se houver, o arquétipo.
4. **Validação mecânica** pelo validador do quadro, antes de mostrar ao
   squad.
5. **Alavancas.** Para cada loop dominante, o ponto de intervenção e o nível
   de Meadows (parâmetro → atraso/feedback → informação → regra → meta →
   modelo mental). Sem solução de produto.
6. **Hipóteses.** As 2 ou 3 setas mais críticas viram hipóteses no formato
   *"acreditamos que X influencia Y por este mecanismo; veremos evidência em
   Z dentro de N"*, cada uma com trio de métricas (resultado, antecedente,
   saúde) e um experimento safe-to-fail (guardrail, amplificação,
   interrupção).

**Modo crítica:** o squad edita o mapa no quadro. O validador recalcula na
hora e, na pausa, o agente aplica o checklist de erros da aula (verbo
como variável, direção no nome, polaridade confundida com desejabilidade,
diagrama sem loop, B sem meta, atraso ignorado, excesso de variáveis,
classificação no olho, seta sem evidência) e devolve **perguntas**
apontando para a seta ou variável exata.

## Requisitos funcionais

- [ ] Aceitar como entrada: (a) tema + descrição livre; (b) caminho para uma
      saída do Agente Enquadrador; (c) opcionalmente, classificação Cynefin.
- [ ] Conduzir a entrevista (fronteira, horizonte, iceberg) por perguntas
      estruturadas, com no máximo ~6 perguntas antes do rascunho.
- [ ] Gerar o CLD v1 em formato duplo: YAML estruturado (lido pelo script e
      por outros agentes) + diagrama Mermaid (lido pelo squad).
- [ ] Marcar cada seta como `fato` ou `inferencia`, com a fonte quando for fato.
- [ ] Classificar loops **só** pela saída do script, nunca pela leitura do LLM.
- [ ] Identificar o arquétipo quando houver sinal (soluções que falham,
      transferência de responsabilidade, limites ao crescimento, escalada,
      tragédia dos comuns, sucesso para os bem-sucedidos), sempre como
      hipótese.
- [ ] Indicar pontos de alavancagem com o nível de Meadows, sem propor
      produto/solução.
- [ ] Transformar as setas críticas em hipóteses com trio de métricas e
      experimento safe-to-fail.
- [ ] Modo crítica: receber um mapa vN editado e devolver checklist +
      perguntas rastreáveis até a variável ou seta exata.
- [ ] Suportar vários recortes por edital (`saidas/<recorte>/`), versionados.
- [ ] **Quadro:** criar, mover, renomear e apagar variáveis; criar setas
      com polaridade (+/−) e atraso (‖); marcar a meta de um loop B.
- [ ] **Validador instantâneo:** a cada edição, destacar loops fechados
      com rótulo R/B calculado e listar os problemas do checklist no painel.
- [ ] **Setas fantasma:** sugestões do agente aparecem tracejadas no quadro
      com o mecanismo em uma frase; o squad aceita ou recusa (com motivo).
- [ ] **Visões ausentes:** o painel lista o que o mapa ainda não cobre
      (camadas do iceberg, atores, atrasos, arquétipos), sem preencher por
      conta própria.
- [ ] **Validação de relação:** ao selecionar uma seta, o painel mostra
      mecanismo, marcação fato/inferência e a pergunta de evidência.

## Requisitos não-funcionais

- [ ] **Não propor solução de produto** (fronteira acima). Garantia mecânica:
      sem `Write`/`Edit`; garantia de formato: a seção de alavancas tem
      campos fixos (variável/loop, nível de Meadows, pergunta), sem campo
      "solução".
- [ ] **Rastreabilidade fato × inferência**, herdada do Enquadrador.
- [ ] **Não inventar quando a descrição é pobre.** Se a descrição não
      sustenta pelo menos um loop fechado, o agente diz o que falta e
      pergunta, em vez de montar um diagrama de fantasia ("fofoca com setas").
- [ ] **Sessão curta:** a meta é rascunho v1 em 30-45 min de squad, porque
      tempo é o recurso que não se negocia no hackathon.
- [ ] **Determinismo onde dá:** a contagem de loops é testável com casos de
      gabarito da aula (ver Critérios de aceite).

## Riscos / pontos de incerteza

- **Ancoragem no rascunho.** É o maior risco da decisão 3: o squad pode
  aceitar o CLD v1 sem pensar e pular o sensemaking. Mitigações candidatas:
  apresentar o v1 com as setas mais frágeis destacadas; exigir que o squad
  confirme ou derrube cada seta marcada `inferencia` antes de seguir para as
  alavancas.
- **Fronteira solução × alavanca escorregadia.** "Mudar o que se mede" já
  está perto de uma solução. Precisa de testes com casos reais para calibrar
  o prompt.
- **Descoberta de ciclos no YAML.** Diagramas com vários loops sobrepostos
  (Nexa Pay tem 5) exigem enumerar ciclos simples no grafo; é trivial em
  Python (ex.: `networkx.simple_cycles`), mas precisa de Python disponível
  no ambiente do squad.
- **Recortes demais.** Três mapas de 45 min custam mais de 2h de um
  hackathon de 48h. A Triagem Cynefin e a escolha de recortes precisam
  ajudar a cortar, não multiplicar.
- **Painel barulhento ("menino que grita lobo").** Se o agente sugere a
  cada movimento, o squad passa a ignorar o painel. Por isso o LLM só roda
  na pausa ou a pedido, e o validador instantâneo (barato e exato) cobre o
  resto. Limite proposto: no máximo 3 sugestões abertas por vez.
- **Arquitetura da plataforma.** O ROADMAP decidiu usar só ferramentas
  nativas do Claude Code (subagente + comando + arquivo). Um painel que
  reage ao vivo dentro de uma página web não cabe bem nesse padrão: ou a
  página chama um modelo por API, ou depende de uma sessão do Claude Code
  vigiando o arquivo. É motivo novo para reabrir essa decisão, só para este
  agente (pergunta 1).
- **Escopo maior.** Quadro + painel é bem mais trabalho que um subagente.
  Os bolts precisam entregar valor cedo: quadro + validador sozinhos já
  servem para a aula, antes de qualquer LLM.
- **Atraso é difícil de inferir só por texto.** O agente vai precisar
  perguntar ("quanto tempo entre X e Y?") em vez de chutar.

## Critérios de aceite

- **Casos de gabarito da disciplina**, rodados só com a descrição em texto:
  - *Suporte* (exercício 3): encontra B1 (redução da fila) e R1
    (retrabalho, com atraso) e o arquétipo soluções que falham.
  - *Fila do time de dados da Loja Alfa* (exercício 7): encontra B1, R1, B2,
    R2 com o atraso de ~3 meses.
  - *Nexa Pay* (exercício 8): encontra pelo menos R1 (bola de neve da
    dívida), B1 (mais gente) e R2 (Brooks).
  - O script classifica corretamente todos os loops do exercício 2 (a-g).
  - *Startup last-mile* (case de avaliação do quadro Miro da aula, 14
    sinais): o mapa tem pelo menos 8 variáveis, um R e um B, e o painel
    leva o squad a concluir que "os entregadores precisam ser mais
    rápidos" é hipótese, não causa.
- **Edital real:** rodado sobre o Ideathon Energisa 2026
  (`editais-referencia/editais_hackathons/`) com **dois recortes**
  diferentes (ex.: zona urbana × zona rural), gerando dois mapas
  comparáveis.
- **Descrição pobre:** com uma descrição de uma linha, o agente pede
  informação em vez de desenhar.
- **Modo crítica:** dado um mapa com erros plantados (verbo como variável,
  B sem meta, loop classificado errado), o agente aponta cada um.
- Em nenhuma saída aparece uma frase do tipo "vocês poderiam
  construir/fazer X".
- O front-matter de `.claude/agents/agente-sistemico.md` não lista `Write`
  nem `Edit`.

## Perguntas de validação

1. ~~Motor do painel~~ → respondida: opção (c), decisão 9.
2. ~~Formato do mapa que o squad edita~~ → respondida: o squad edita no
   quadro (decisão 6).
3. **Ancoragem:** você aceita a regra "o squad precisa confirmar ou derrubar
   cada seta `inferencia` antes de ver as alavancas"? É um atrito
   proposital.
4. **Escolha dos recortes:** quem define os 2 ou 3 sistemas candidatos de
   um edital? O squad digita, ou o agente sugere recortes a partir do tema e
   o squad escolhe?
5. **Primeiro rascunho no quadro:** depois da entrevista, o agente desenha
   o CLD v1 inteiro como setas fantasma (o squad aceita uma a uma), ou o
   squad começa com o quadro vazio e o agente só sugere conforme ele
   desenha?
6. **Nome:** "Agente de Visão Sistêmica" ou outro?

(Respondidas pelo quadro próprio: Python para o validador e Mermaid como
visual deixaram de ser perguntas; o validador roda dentro do quadro.)

## Status

**Rascunho revisado (quadro próprio + painel), 2026-10-04.** Não avançar para
`02-construction/BOLTS.md` antes das perguntas acima serem respondidas.
