# Execuções reais do agente (2026-10-05)

Pedidos gravados pelo quadro e respostas devolvidas pelo modelo, guardados
como evidência do Bolt 6 e como base para os testes de aceite (Bolt 10).
Em todas, o prompt do `.claude/agents/agente-sistemico.md` foi seguido sem
alterações por um subagente só de leitura.

| Caso | Pedido | Prompt v1 | Prompt v2 |
|---|---|---|---|
| Last-mile (exemplo da aula) | `lastmile_pedido.json` | `lastmile_resposta-prompt-v1.json` | `lastmile_resposta-prompt-v2.json` |
| Bicicleta em SP, rascunho do CLD | `bicicleta_pedido.json` | `bicicleta_resposta-prompt-v1.json` | `bicicleta_resposta-prompt-v2.json` |
| Bicicleta em SP, só o tema | `bicicleta-so-tema_pedido.json` | `bicicleta-so-tema_resposta-prompt-v1.json` | — |

Para conferir qualquer resposta com o validador atual (na pasta
`agente-sistemico`):

```bash
python ../modelo-dados/validar_resposta.py 02-construction/execucoes-agente/bicicleta_resposta-prompt-v1.json 02-construction/execucoes-agente/bicicleta_pedido.json
```

As respostas do prompt v1 passavam no validador da época e são recusadas
pelo validador do Bolt 6 (ids no texto, textos longos, refs demais, fontes
fora do catálogo). As do prompt v2 passam.

## Entrevista em rodadas (Bolt 7, prompt v3)

Partindo só do tema ("mobilidade urbana em São Paulo, algo relacionado a
bicicleta"), pelo quadro:

| Arquivo | O que é |
|---|---|
| `bicicleta-entrevista_historico.json` | Rodada 1 do agente (4 perguntas com opções) e as respostas de teste dadas no formulário do quadro |
| `bicicleta-entrevista_pedido-pos-rodada1.json` | Pedido que o quadro enviou sozinho depois das respostas (gatilho `entrevista`) |
| `bicicleta-entrevista_resposta-proposta.json` | Proposta de pergunta-problema, fronteira e horizonte, aceita no quadro |

Achado: a proposta veio depois de uma só rodada, com a fronteira deduzida
das opções não marcadas e sem perguntar quem decide. O prompt foi
ajustado para exigir que fronteira e decisores sejam perguntados.
