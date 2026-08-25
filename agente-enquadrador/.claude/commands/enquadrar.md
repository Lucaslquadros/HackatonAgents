---
description: Lê um edital de hackathon e devolve a matriz de critérios, riscos e perguntas de enquadramento, via o Agente Enquadrador.
argument-hint: <caminho-do-edital-pdf-ou-md>
---

Invoque o subagente `agente-enquadrador` (via a ferramenta de subagente),
passando como entrada o arquivo de edital indicado em `$ARGUMENTS`.

Depois que o subagente devolver o Markdown completo (front-matter YAML +
corpo em prosa):

1. Mostre o resultado inteiro para o usuário, sem resumir.
2. Salve o resultado, exatamente como veio, em
   `saidas/<nome-do-edital-sem-extensao>.md` dentro deste projeto (crie a
   pasta `saidas/` se ainda não existir).
3. Diga ao usuário em qual caminho o arquivo foi salvo.

Não edite, resuma ou reescreva o conteúdo devolvido pelo subagente — a
persistência é sua única responsabilidade aqui, a análise é toda dele.
