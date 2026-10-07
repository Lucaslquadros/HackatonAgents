# Início rápido — Hack_OS em sala

Guia pra usar a plataforma sem depender de mim estar junto. Pressupõe
Python 3 e Node.js instalados (só pra rodar os testes — os servidores
usam só biblioteca padrão de Python).

## 1. Cadastro do Time (uma vez só, todo o squad)

```bash
python agente-orquestrador/servidor.py 8766
```

Abra **http://127.0.0.1:8766/agente-orquestrador/cadastro/** (ou, se
quiser que o resto do squad cadastre pelo celular na mesma Wi-Fi, o
terminal já imprime o endereço de rede ao subir o servidor).

Cadastre o hackathon e cada integrante: nome, frentes (Aula 3) e áreas de
afinidade (ex.: "Green Tech & Agtech", nível experiência/interesse). Isso
alimenta o ranqueamento do Panorama mais tarde — dado fica em
`squad.json`, na raiz do projeto.

## 2. Panorama — do tema amplo até escolher um problema

```bash
python agente-sistemico/servidor.py 8765
```

Abra **http://127.0.0.1:8765/agente-sistemico/quadro/** e clique no botão
**"Panorama"** no topo. Fluxo, nessa ordem:

1. Crie um **cenário** por categoria/tema que quiser comparar (ex.: as 6
   categorias do Campus Mobile, uma de cada vez).
2. Dentro do cenário: registre **fatos** (com fonte+data, ou marcados
   como estimativa com a conta aberta) e classifique cada um como
   certeza/suposição/dúvida — a tela explica a diferença.
3. Monte **clusters** agrupando fatos/atores por relação — o quadro aponta
   sozinho quando um elemento está em mais de um cluster ("nó").
4. Registre **problemas candidatos** (pergunta-problema + magnitude +
   pelo menos 1 fato como fonte).
5. Na seção **Ranqueamento** (aparece quando há problemas candidatos):
   crie critérios com peso (sugestão: magnitude, centralidade sistêmica,
   alavancagem, tratabilidade, aderência ao edital, aderência ao time —
   este último já cruza com o Cadastro do Time do passo 1), dê nota
   0-10 pra cada problema em cada critério, veja o total ponderado.
6. Clique **"Escolher"** no problema vencedor. Isso já cria a sessão
   correspondente pro Sistêmico e mostra o comando a rodar.

Tudo salva sozinho (`agente-sistemico/panorama.json`) — pode fechar e
reabrir o navegador sem perder nada.

## 3. Agente de Visão Sistêmica — mapear o problema escolhido

Depois de escolher o finalista no Panorama, a tela mostra algo como:

```
/visao-sistemica rec_green_tech_agtech
```

Pra rodar o agente de verdade (opcional — dá pra desenhar o mapa à mão
sem isso): abra **uma sessão do Claude Code com a pasta de trabalho
dentro de `agente-sistemico/`** (é onde o comando e o subagente estão
registrados) e cole esse comando. Depois de alguns segundos, volte pro
quadro — ele já mostra as visões do agente na aba Visões.

No quadro, sem precisar do agente: edite variáveis e setas livremente, a
aba Análise mostra loops (R/B), Cynefin, arquétipo e alavancas ao vivo.
Também dá pra rodar o **Ritual do fundo do U** (botão no topo) antes de
fechar o problema, e usar a **Matriz CSD** integrada ao mapa.

## Onde tudo fica salvo

| O quê | Onde |
|---|---|
| Cadastro do Time | `squad.json` (raiz do projeto) |
| Panorama | `agente-sistemico/panorama.json` |
| Cada problema mapeado | `agente-sistemico/sessoes/<recorte>/` |
| Análise do edital (se já rodou `/enquadrar`) | `agente-enquadrador/saidas/` |

## Limitações conhecidas (por enquanto)

- O Panorama ainda não tem um **motor com IA** pesquisando fatos sozinho
  — o squad registra os fatos manualmente (isso é intencional pela
  metodologia, não só uma limitação técnica). Se quiser que a IA ajude a
  levantar fatos, me avise depois que eu construo isso.
- Nenhum dos bolts construídos hoje foi formalmente "fechado" (todos
  ficaram em `checkpoint` no processo AI-DLC) — funcionam de verdade e
  foram testados, mas ainda esperam uma revisão sua com calma. Detalhe
  completo em `agente-panorama/02-construction/BOLTS.md` e
  `agente-orquestrador/02-construction/BOLTS.md`.

## Se algo der erro

Os dois servidores são independentes — se um travar, `Ctrl+C` nele e suba
de novo com o mesmo comando, sem afetar o outro. Nada é perdido: os
arquivos `.json` acima são o estado real, os servidores só os leem/gravam.
