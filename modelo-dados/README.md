# Modelo de dados do Hack_OS

Os objetos que quadro, painel, motor do agente, aba CSD, ritual do fundo
do U, estacionamento e glossário trocam entre si. É compartilhado pela
plataforma inteira: o Agente de Visão Sistêmica é o primeiro a usar, e o
Panorama, o Framing e o Alinhamento vão ler e escrever os mesmos objetos.

- Schema: [`hackos.schema.json`](hackos.schema.json) (JSON Schema 2020-12).
- Exemplo completo e válido: [`exemplos/lastmile/`](exemplos/lastmile/),
  feito com o case last-mile da prova de pensamento sistêmico (quadro Miro
  de DT).
- Casos inválidos de propósito: [`exemplos/invalidos/casos.json`](exemplos/invalidos/casos.json).
- Testes: `python modelo-dados/testes/validar_exemplos.py` (precisa de
  `jsonschema`; no Windows, rode com `PYTHONIOENCODING=utf-8`).

## Arquivos de estado de um hackathon

| Arquivo | Objeto (`$defs`) | O que guarda | Base na aula |
|---|---|---|---|
| `squad.json` | `squad` | Membros e as frentes de cada um; o `autor` de tudo aponta para cá | 5 frentes do squad (Aula 3) |
| `mapa.json` (um por recorte) | `mapa` | Atores, variáveis, setas, loops anotados, análise e alavancas | Template "Pensamento Sistêmico + Cynefin" (4 blocos) |
| `csd.json` | `csd` | Matriz CSD: certezas, suposições, dúvidas, evidências e hipóteses | Aula 6; Fórmula da Eficácia |
| `ritual.json` | `ritual` | Reflexões individuais e a integração delas ao mapa | Teoria U; "você faz, eu faço, depois comparamos" |
| `estacionamento.json` | `estacionamento` | Ideias de solução estacionadas para a etapa certa | *Parking lot* do Lean Inception |
| `glossario.json` | `glossario` | Termos do domínio | Glossário do Lean Inception |
| `pedido-visao.json` | `pedido_visao` | O que o quadro manda para o motor do agente | Contrato da opção (c) |
| `resposta-visao.json` | `resposta_visao` | As visões que o motor devolve ao painel | Contrato da opção (c) |

## Garantias que o schema aplica

Estas regras viraram estrutura, não instrução de prompt. Cada uma tem um
caso em `casos.json` que prova que a violação é recusada.

| Garantia | Como o schema garante |
|---|---|
| Alavanca diz **onde** intervir, nunca **o que** construir | `alavanca` não tem campo de solução e recusa campos extras |
| O agente não propõe solução | `visao.tipo` não tem `solucao`; ideias de solução viram `estacionar` |
| Toda visão termina em pergunta ao squad | `visao.pergunta` precisa terminar em `?` |
| Painel não vira barulho | `resposta_visao.visoes` tem no máximo 5 itens |
| Certeza só com evidência | `item_csd` do tipo `certeza` exige pelo menos uma evidência |
| Suposição vira pergunta de pesquisa; dúvida vira tarefa de discovery | campos obrigatórios por tipo |
| Seta sem mecanismo é "fofoca com setas" | `seta.mecanismo` obrigatório; `certeza` exige `fonte` |
| Nada de dado pessoal nas evidências (LGPD) | `evidencia.contem_dado_pessoal` só aceita `false` |
| Loop é classificado por contagem, não pelo LLM | `loop_calculado` existe só no `pedido_visao.validacao`, que vem do validador |
| O squad decide o que entra no mapa | variáveis e setas têm `status`: `fantasma` → `aceita` / `recusada` |

## O que o schema não checa (e quem checa)

- **Referências entre objetos e arquivos** (seta apontando para variável
  que existe, autor que está no squad, item da CSD citado por uma seta):
  `integridade()` em `testes/validar_exemplos.py`. O validador do quadro
  (Bolt 1) vai repetir essas checagens em JavaScript.
- **Qualidade do CLD** (loops, R/B, B sem meta, variável fora de loop,
  nome com verbo): validador do Bolt 1.

## Decisões de modelagem

- **Loops não são guardados como objeto próprio.** São calculados a cada
  edição a partir das setas. O squad só anota nome, história, meta e
  lacuna em `loops_anotados`, identificando o loop pelo conjunto de setas.
- **Certeza × suposição na seta** usa o vocabulário da Matriz CSD, não
  fato × inferência (decisão 5.2 de `FLUXO-PEDAGOGICO.md`). A seta pode
  apontar para um item da CSD com `csd_item`.
- **Reservas para o futuro, sem lógica ainda:** `item_csd.importancia`
  (mapa de suposições, Bland), `item_csd.ligacoes` (Opportunity Solution
  Tree, Torres) e `fonte_teorica.suplementar` (conteúdo de fora das
  aulas, seção 9 de `FLUXO-PEDAGOGICO.md`).
- **Um dispositivo no MVP**, mas toda contribuição já tem `autor`, para
  vários dispositivos serem só uma mudança de transporte.

## Achado do próprio exemplo

Montar o mapa last-mile mostrou que a frase dos gestores ("os entregadores
precisam ser mais rápidos") vira uma seta `suposicao` dentro de um loop B
(`B1 · Correr mais`), enquanto o loop que domina é R (`R1 · Espiral da
urgência`). É exatamente a pergunta da prova: a frase é hipótese, não causa.
O modelo consegue representar essa resposta sem texto livre.
