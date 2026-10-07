# Operations — Agente de Visão Sistêmica

## Como rodar o quadro

Na pasta `agente-sistemico`, suba o servidor do quadro:

```bash
python servidor.py
```

e abra `http://127.0.0.1:8765/agente-sistemico/quadro/`.

O servidor é necessário para o botão "Exemplo last-mile" e para a aba
Visões. Abrindo `index.html` direto como arquivo, a edição e a análise
funcionam; a aba Visões avisa que falta o servidor.

## Como pedir uma visão ao agente

1. No quadro, aba **Visões**, clique em "Pedir visão ao agente".
2. Abra o Claude Code **na pasta `agente-sistemico`** (é ali que o
   subagente e o comando estão registrados) e rode o comando que o quadro
   mostra, por exemplo `/visao-sistemica rec_lastmile`.
3. As visões aparecem no quadro sozinhas, em poucos segundos.

Na primeira vez, o Claude Code pede permissão para gravar a resposta e
rodar `python ../modelo-dados/validar_resposta.py`.

No Claude Code (desktop), a configuração `quadro-sistemico` em
`.claude/launch.json` sobe o mesmo servidor no painel do navegador.

O rascunho fica guardado no navegador (localStorage). Para guardar de
verdade ou levar para outro computador, use "Salvar mapa.json". No Chrome
e no Edge, o quadro passa a gravar sempre no mesmo arquivo depois do
primeiro salvamento.

## Como rodar os testes

```bash
cd agente-sistemico/quadro && npm test
```

```bash
PYTHONIOENCODING=utf-8 python modelo-dados/testes/validar_exemplos.py
```

```bash
PYTHONIOENCODING=utf-8 python -m unittest discover -s agente-sistemico/testes
```

O primeiro testa o validador de CLD (gabaritos da aula), as regras de
edição, o painel e a aba Visões; o segundo, o modelo de dados
compartilhado; o terceiro, o servidor e o validador da resposta do agente
(os dois últimos rodam na raiz do `Hack_OS`).

## Como verificar que está saudável

- [ ] `npm test` e `validar_exemplos.py` passam.
- [ ] O exemplo last-mile carrega com 10 variáveis, 12 setas e 5 atores.
- [ ] Um mapa salvo pelo quadro sem pendências passa no schema `mapa`.

## Changelog

- **2026-10-05** — Bolt 0: modelo de dados compartilhado
  (`Hack_OS/modelo-dados/`).
- **2026-10-05** — Bolt 1: validador de CLD com os gabaritos da aula.
- **2026-10-05** — Bolt 2: quadro mínimo (criar, ligar, editar, mover,
  apagar, desfazer, abrir e salvar `mapa.json`).
- **2026-10-05** — Bolt 3: aba Análise com o validador ao vivo e os 4
  blocos do template da aula (variáveis, loops, análise, intervenção).
- **2026-10-05** — Bolt 4: motor v1. Servidor do quadro, aba Visões,
  subagente `agente-sistemico`, comando `/visao-sistemica` e validador da
  resposta.
- **2026-10-05** — Bolt 5: setas sugeridas tracejadas (aceitar, com prévia
  dos loops, ou recusar com motivo), variável proposta e estacionamento de
  ideias.
- **2026-10-05** — Bolt 6: prompt v2 do agente pelos 4 blocos do template,
  catálogo de fontes das aulas e guardas de legibilidade no validador.
  Primeiras execuções reais guardadas em `02-construction/execucoes-agente/`.
- **2026-10-05** — Bolt 7: entrevista em rodadas na aba Visões, do tema
  até a proposta de pergunta-problema, fronteira e horizonte.
- **2026-10-05** — Bolt 7b: rascunho de CLD proposto pelo agente (variáveis
  e setas provisórias, suposição, aceite item a item).
- **2026-10-05** — Bolt 8: integração com a Matriz CSD — setas-suposição e
  hipóteses do agente podem ser propostas como item da CSD; painel mostra
  de quantas suposições cada alavanca depende.
- **2026-10-05** — Bolt 9: ritual do fundo do U — painel oculto, cronômetro,
  reflexão individual sequencial, revelação com cobertura por membro,
  divergências e envio de perguntas para a CSD.
- **2026-10-05** — Bolt 10: testes de aceite do Inception rodados contra os
  6 critérios (gabaritos da aula, Energisa com dois recortes reais, descrição
  pobre, erros plantados, nenhuma frase de solução, front-matter sem
  Write/Edit). Todos passaram; achado de taxa de falha do prompt em domínio
  novo (Energisa) registrado no `BOLTS.md` para decisão do Lucas.
- Bolts 7, 7b, 8, 9 e 10 estão em **checkpoint** (implementados e testados,
  aguardando revisão/validação manual do Lucas) — não confundir com
  `feito`. Ver `02-construction/BOLTS.md` para o detalhe de cada um.
