# AI-DLC (versão enxuta, solo) — regras do fluxo

Este projeto segue uma versão **adaptada e simplificada** do AI-DLC
(AI-Driven Development Life Cycle, metodologia da AWS/awslabs). A versão
original foi pensada para times, com "Mob Elaboration" em grupo e camadas
de governança corporativa. Aqui, adaptamos para **um desenvolvedor solo**
(o aluno) trabalhando com um agente de IA — sem perder a ideia central:
**a IA propõe, o humano valida em pontos de checagem explícitos.**

Sempre que o Lucas disser algo como **"Usando AI-DLC, ..."**, siga o fluxo
abaixo. Fora disso, siga o pedido normalmente — este fluxo não é obrigatório
para toda interação, só para quando o trabalho merece ser estruturado
(um novo trabalho da disciplina, uma reformulação grande, etc.).

## As 3 fases

1. **Inception** (`01-inception/INCEPTION.md`) — define O QUÊ construir e
   POR QUÊ. Antes de escrever qualquer código, preencha ou atualize este
   documento: objetivo, requisitos, riscos, critérios de aceite. Termine
   gerando **perguntas de validação** para o Lucas responder — não avance
   para Construction sem confirmação dele nos pontos em aberto.

2. **Construction** (`02-construction/BOLTS.md`) — define COMO construir.
   Antes de detalhar um bolt, consulte `FERRAMENTAS-CLAUDE-CODE.md` para
   escolher a peça certa (subagente, comando de barra, hook, arquivo de
   estado etc.) em vez de decidir ad-hoc. Quebre o trabalho em **bolts**:
   unidades pequenas (idealmente entregáveis em minutos/horas, não dias),
   cada uma com um objetivo único e testável.
   Nada de sprints de duas semanas — um bolt malfeito deve ser descartável
   sem dor. Implemente **um bolt por vez**. Ao final de cada bolt, pare em
   um **checkpoint**: mostre o que mudou, rode/valide, e só siga para o
   próximo bolt depois que o Lucas confirmar (ou você tiver validação
   objetiva suficiente — testes passando, app rodando sem erro, etc.).

3. **Operations** (`03-operations/OPERATIONS.md`) — como rodar, como
   verificar que está saudável, e o changelog do que foi feito. Atualize
   este documento sempre que uma fase de Construction terminar.

## Regras práticas

- **Nunca pule Inception** para trabalhos novos — mesmo que pareça óbvio,
  escrever 5 linhas de objetivo evita retrabalho.
- **Bolts pequenos e verificáveis.** Se um bolt não dá pra descrever em
  1-2 frases, é grande demais — quebre.
- **Checkpoint = pausa real.** Depois de cada bolt, resuma o que foi feito,
  rode alguma verificação (teste, screenshot, execução manual) e só avance
  com confirmação explícita ou evidência objetiva de que funcionou.
- **Todo bolt de "robustez"** (tratamento de erro, validação de entrada,
  testes) conta como bolt de verdade — não é trabalho de segunda classe.
- **Documente decisões**, não só código. Se uma escolha foi feita (ex: por
  que um dataset sintético, por que um limite de linhas), registre em
  INCEPTION.md ou BOLTS.md.
- Este arquivo e as pastas `01-inception/`, `02-construction/`,
  `03-operations/` viajam junto com o projeto. Para começar um projeto novo,
  copie a pasta `ai-dlc-template/` inteira e apague o conteúdo específico
  dos `.md` (mantenha a estrutura).

## Por que isso existe

Baseado no AI-DLC da AWS (github.com/awslabs/aidlc-workflows), que troca
sprints por "bolts", épicos por "units of work", e substitui aprovação
passiva por validação humana em checkpoints obrigatórios. A versão completa
foi feita para squads corporativos (múltiplos devs, compliance, CI/CD
maduro); esta versão mantém só o que faz sentido para um projeto de
estudos individual: fases claras, trabalho em pedaços pequenos, e
checkpoints de validação de verdade.
