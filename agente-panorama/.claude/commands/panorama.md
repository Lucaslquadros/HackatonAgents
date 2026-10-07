---
description: Lê o pedido de fatos gravado pelo Panorama (quadro do Sistêmico), chama o Agente de Panorama e grava a resposta que o quadro mostra como sugestões.
argument-hint: <id-do-cenario, ex.: cen_1>
---

Este comando é o motor do Bolt 6 do Agente de Panorama. Rode-o numa sessão
do Claude Code aberta na pasta `agente-panorama/`, com o servidor do
quadro ligado (`python ../agente-sistemico/servidor.py`).

1. **Ache o pedido.** O cenário é `$ARGUMENTS`. Se vier vazio, liste as
   pastas em `../agente-sistemico/panorama-sessoes/`: se houver só uma,
   use-a; se houver várias, pergunte qual. O pedido está em
   `../agente-sistemico/panorama-sessoes/<cenario>/pedido.json`. Se o
   arquivo não existir, diga ao usuário para clicar em "Pedir fatos ao
   agente" no cenário, no quadro, e pare.

2. **Chame o subagente.** Invoque o subagente `agente-panorama` (via a
   ferramenta de subagente), passando o caminho absoluto do pedido. Ele
   devolve só JSON.

3. **Grave e valide.** Grave o JSON devolvido, exatamente como veio, em
   `../agente-sistemico/panorama-sessoes/<cenario>/resposta.tmp.json` e
   rode:

   ```bash
   python ../modelo-dados/validar_resposta_panorama.py ../agente-sistemico/panorama-sessoes/<cenario>/resposta.tmp.json ../agente-sistemico/panorama-sessoes/<cenario>/pedido.json
   ```

   - Se passar, renomeie para
     `../agente-sistemico/panorama-sessoes/<cenario>/resposta.json`. O
     quadro, que está esperando, mostra os fatos sugeridos em poucos
     segundos.
   - Se for recusada, devolva a lista de problemas ao subagente uma única
     vez, pedindo que corrija só o que foi apontado, e valide de novo. Se
     falhar outra vez, apague o `.tmp.json`, não grave a resposta e mostre
     os problemas ao usuário.

4. **Informe** ao usuário quantos fatos foram sugeridos e, se houver,
   quantas lacunas, em uma linha. Não reescreva nem resuma os fatos: o
   lugar deles é o cenário no quadro, onde o squad aceita ou recusa cada
   um.

Você não edita os fatos nem decide clusters, problemas candidatos ou
ranqueamento. A pesquisa é do subagente; a validação é do script; aceitar
ou recusar cada fato é do squad.
