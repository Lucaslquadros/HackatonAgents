# Operations — Agente Enquadrador de Editais

## Como rodar

```
/enquadrar <caminho-do-edital.pdf-ou-md>
```

Exemplo: `/enquadrar editais-referencia/06-hackathon-climatico-agua-sp-2026.md`

O comando invoca o subagente `agente-enquadrador` e salva o resultado em
`saidas/<nome-do-edital>.md`.

**Pré-requisito real, não só teórico:** o comando `/enquadrar` e o
subagente `agente-enquadrador` só são descobertos pelo Claude Code quando
a sessão abre com o diretório de trabalho **dentro de `agente-enquadrador/`**
(onde mora o `.claude/commands/` e o `.claude/agents/` deste projeto). Uma
sessão aberta na raiz do repositório `Hack_OS` (ou num worktree dele) não
enxerga esses arquivos automaticamente. Todos os testes deste agente até
agora (Bolts 3, 4, 6 e 7) foram feitos com a sessão na raiz do repo — o
comando de barra nunca foi disparado de verdade, o agente principal seguiu
manualmente as instruções do prompt de `.claude/agents/agente-enquadrador.md`
e do comando `.claude/commands/enquadrar.md` para produzir o mesmo
resultado. O output final bate com o que o subagente real produziria (mesmo
prompt, mesmas regras), mas o **gatilho determinístico em si** (`/enquadrar`
como comando de fato registrado) ainda não foi validado na prática. Para
validar isso, abra uma sessão do Claude Code com `cwd` dentro de
`agente-enquadrador/` e rode `/enquadrar` de verdade.

## Como rodar os testes

1. Editais de teste ficam em `editais-referencia/` (nível raiz do repo) —
   inclui a subpasta `editais_hackathons/` com editais trazidos depois da
   primeira leva.
2. Para cada edital novo: `/enquadrar <caminho>`, revisar o Markdown
   devolvido, confirmar que foi salvo em `saidas/<nome>.md`.
3. Conferir todos os testes numa tela só: abrir
   `agente-enquadrador/painel-avaliacao.html` direto no navegador (arquivo
   estático, sem dependência externa), ou servir localmente para acessar de
   outro aparelho na mesma rede:
   ```
   cd agente-enquadrador
   python -m http.server 8000 --bind 0.0.0.0
   ```
   depois acessar `http://<ip-local-da-máquina>:8000/painel-avaliacao.html`.
   O painel lê o conteúdo de `saidas/*.md` já processado (front-matter como
   cards expansíveis) — atualizar o painel manualmente quando um edital
   novo for testado (não há geração automática ainda).

## Como verificar que está saudável

Critérios de aceite validados contra os 7 editais de teste em
`editais-referencia/` (coleção completa — nenhum edital único ficou sem
teste; duplicatas são identificadas e puladas conscientemente, não por
omissão — ver Bolt 6):

- [x] Critério sem peso declarado no edital → sai como `"não declarado"`,
      nunca um número inventado (6 dos 7 casos)
- [x] Critério **com** peso declarado no edital → sai com o peso exato do
      edital, não recalculado (caso 07 — único com peso real até agora)
- [x] Duração diferente de 48h → o agente usa a duração real do edital em
      vez de forçar o default do prompt (5 dos 7 casos: 8 semanas, 37h,
      2 dias, 13h, ~4,5 meses)
- [x] Material sem desafio/critérios técnicos declarados → devolve
      `criterios: []`, `informacao_insuficiente: true`, sem inventar
      conteúdo (casos 04 e 05)
- [x] Fonte secundária (matéria de jornal, não o edital oficial) →
      distingue "critério não existe" de "fonte não é a primária" em vez
      de tratar os dois como o mesmo problema (caso 05)
- [x] Toda afirmação do output é rastreável como fato (cita o edital) ou
      marcada explicitamente como inferência (`[Inferência]` / "não
      declarado no texto") — nos 7 casos
- [x] Nunca propõe solução de produto/tecnologia, mesmo quando o edital dá
      abertura para isso — nos 7 casos
- [ ] **Pendente:** validar `/enquadrar` como comando de barra disparado de
      verdade (não só o prompt seguido manualmente) — precisa de sessão com
      `cwd` em `agente-enquadrador/`, ver nota em "Como rodar"

## Changelog

- **2026-08-?? (sessão anterior)** — Bolt 1: subagente `agente-enquadrador`
  criado com `tools` restritas (sem `Write`/`Edit`, garantia mecânica da
  regra "não propõe solução"). Bolt 2: comando `/enquadrar` escrito.
- **2026-08-?? (sessão anterior)** — Bolt 3: primeiro lote de testes (3
  editais bem estruturados: UFC-TJCE, Low Hack, ClimatonBrasil/TCU) →
  `saidas/01` a `saidas/03`. Achado: nenhum dos 3 declara peso percentual —
  "critério nomeado sem peso" é o caso comum, não exceção.
- **2026-08-?? (sessão anterior)** — Bolt 4: teste do caso de informação
  insuficiente (AWS Breaking Barriers) → `saidas/04`. Confirmado: sem
  alucinação, `criterios: []` e recomendação de processo, não invenção de
  conteúdo.
- **2026-08-25** — Bolt 4.1: painel de avaliação (`painel-avaliacao.html`)
  publicado como Artifact e servido localmente via `http.server` para teste
  em iPad na rede local; corrigido bug de encoding (faltava
  `<meta charset="UTF-8">`, acentos quebravam ao servir o arquivo cru).
- **2026-08-25** — Bolt 6: cobertura da pasta `editais-referencia/editais_hackathons/`
  (movida de `aulas/` pelo Lucas). Identificada duplicata (Low Hack v2 =
  mesmo edital do `saidas/02`, pulada conscientemente) e testado o edital
  inédito (Ideathon Energisa) → `saidas/06`. Achado: primeiro edital da
  coleção com duração real abaixo de 48h (13h).
- **2026-08-25** — Bolt 7: edital trazido pelo Lucas via link do Diário
  Oficial de SP (Hackathon Climático: Água, SECLIMA) → `saidas/07`. Captura
  literal do HTML oficial (não resumo de IA) revelou detalhe que um resumo
  automático tinha perdido: critério de pré-seleção ("justiça climática")
  ausente da tabela de pontos declarada. Primeiro edital da coleção com
  peso de critério de fato declarado.
- **2026-08-25** — Bolts 2, 3, 4, 6 e 7 confirmados pelo Lucas (checkpoints
  fechados).
- **2026-08-25** — Bolt 5: este documento (`OPERATIONS.md`) preenchido.
