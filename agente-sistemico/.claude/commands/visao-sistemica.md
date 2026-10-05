---
description: Lê o pedido de visão gravado pelo Quadro Sistêmico, chama o Agente de Visão Sistêmica e grava a resposta que o quadro mostra no painel Visões.
argument-hint: <id-do-recorte, ex.: rec_lastmile>
---

Este comando é o motor do agente na versão 1 (Bolt 4). Rode-o numa sessão
do Claude Code aberta na pasta `agente-sistemico/`, com o servidor do
quadro ligado (`python servidor.py`).

1. **Ache o pedido.** O recorte é `$ARGUMENTS`. Se vier vazio, liste as
   pastas em `sessoes/`: se houver só uma, use-a; se houver várias,
   pergunte qual. O pedido está em `sessoes/<recorte>/pedido-visao.json`.
   Se o arquivo não existir, diga ao usuário para clicar em "Pedir visão"
   no quadro e pare.

2. **Chame o subagente.** Invoque o subagente `agente-sistemico` (via a
   ferramenta de subagente), passando o caminho absoluto do pedido. Ele
   devolve só JSON.

3. **Grave e valide.** Grave o JSON devolvido, exatamente como veio, em
   `sessoes/<recorte>/resposta-visao.tmp.json` e rode:

   ```bash
   python ../modelo-dados/validar_resposta.py sessoes/<recorte>/resposta-visao.tmp.json sessoes/<recorte>/pedido-visao.json
   ```

   - Se passar, renomeie para `sessoes/<recorte>/resposta-visao.json`. O
     quadro, que está esperando, mostra as visões em poucos segundos.
   - Se for recusada, devolva a lista de problemas ao subagente uma única
     vez, pedindo que corrija só o que foi apontado, e valide de novo. Se
     falhar outra vez, apague o `.tmp.json`, não grave a resposta e mostre
     os problemas ao usuário.

4. **Informe** ao usuário quantas visões foram geradas e de que tipos, em
   uma linha. Não reescreva nem resuma as visões: o lugar delas é o painel
   do quadro.

Você não edita o conteúdo das visões nem o mapa. A análise é do subagente;
a validação é do script; a decisão é do squad.
