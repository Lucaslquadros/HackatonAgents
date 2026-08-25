# Template AI-DLC (versão enxuta, solo)

Template reaproveitável para estruturar qualquer trabalho da disciplina de
Machine Learning (ou outra) usando uma versão adaptada do **AI-DLC**
(AI-Driven Development Life Cycle) da AWS — a versão original é para times;
esta foi enxugada para um desenvolvedor solo trabalhando com um agente de IA.

Baseado em: github.com/awslabs/aidlc-workflows (MIT-0).

## Como usar em um novo trabalho

1. Copie esta pasta inteira para dentro do trabalho novo (ex: `ML/Estudo_2/`),
   pode manter o nome `ai-dlc-template/` ou renomear para `ai-dlc/`.
2. Abra `CLAUDE.md` — esse arquivo é lido automaticamente por agentes como
   Claude Code (e funciona também como referência para você). Ele explica o
   fluxo de 3 fases e as regras de "bolt" e "checkpoint".
3. Preencha `01-inception/INCEPTION.md` primeiro — objetivo, requisitos,
   riscos. Se estiver usando um agente de IA, peça: *"Usando AI-DLC, me
   ajude a preencher o Inception para [descrição do trabalho]"*.
4. Quando o Inception estiver validado, vá para
   `02-construction/BOLTS.md` e quebre o trabalho em bolts pequenos.
   Peça ao agente para implementar um bolt por vez, parando no checkpoint
   de cada um.
5. Ao final, preencha `03-operations/OPERATIONS.md` com instruções de uso
   e o changelog.

## Estrutura

```
ai-dlc-template/
├── CLAUDE.md                    # regras do fluxo (o agente de IA lê isso)
├── README.md                    # este arquivo
├── 01-inception/
│   └── INCEPTION.md             # o quê construir, por quê, riscos
├── 02-construction/
│   └── BOLTS.md                 # backlog de bolts + checkpoints
└── 03-operations/
    └── OPERATIONS.md            # como rodar, monitorar, changelog
```

## Por que "bolt" e não "sprint"

Sprints de 2 semanas assumem que o trabalho vai demorar dias. Com um
agente de IA gerando a primeira versão do código em minutos, o gargalo
passa a ser a sua validação — não a implementação. Um bolt é pequeno o
bastante para ser jogado fora sem dó se a IA errou o rumo, e o checkpoint
no fim de cada um garante que você (não a IA) decide se o projeto está no
caminho certo antes de seguir.
