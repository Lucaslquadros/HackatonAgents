# Sessões do Quadro Sistêmico

Uma pasta por recorte (`<id-do-recorte>/`), criada pelo servidor do quadro
(`agente-sistemico/servidor.py`) quando o squad clica em "Pedir visão":

| Arquivo | Quem escreve | O que é |
|---|---|---|
| `pedido-visao.json` | o quadro, pelo servidor | mapa + validação + visões abertas (contrato `pedido_visao`) |
| `mapa.json` | o quadro, pelo servidor | cópia do mapa no momento do pedido |
| `resposta-visao.json` | o comando `/visao-sistemica` | visões do agente, já validadas (contrato `resposta_visao`) |
| `estacionamento.json` | o quadro, pelo servidor | ideias de solução estacionadas para a etapa certa (contrato `estacionamento`) |

Os arquivos são o estado em disco da plataforma (ver `ROADMAP.md`) e
podem ir para o git junto com o trabalho do squad.
