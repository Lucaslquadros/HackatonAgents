# Editais de referência (2026, área de tecnologia)

Coleção de editais/regulamentos reais de hackathons 2026, usados como massa
de teste para o Agente Enquadrador (e para os próximos agentes). Cada
arquivo tem a fonte e a data de captura no topo — mantém a rastreabilidade
que o próprio Agente Enquadrador precisa aplicar aos editais dele.

| # | Arquivo | Tipo | Por que está aqui |
|---|---|---|---|
| 1 | `01-ufc-tjce-hackathon-2026.pdf` | Universidade + Judiciário (Brasil) | Regulamento formal completo, com desafios e programação — caso "bem estruturado" |
| 2 | `02-lowhack-2026-online.pdf` | Hackathon privado online (Brasil) | Regulamento em formato diferente dos outros — testa robustez de extração |
| 3 | `03-climatonbrasil-tcu-2026.md` | Governo (TCU, Brasil) | Critérios de avaliação existem mas sem peso declarado — testa detecção de ambiguidade |
| 4 | `04-aws-breaking-barriers-2026.md` | Corporativo/internacional (AWS) | Página institucional, não um edital técnico — testa se o agente reconhece "informação insuficiente" em vez de inventar critérios |
| 5 | `05-ifce-hackathon-2026.md` | Instituto federal + banco público (Brasil) | Fonte é matéria de jornal, não o edital oficial — desafio claro mas critérios ausentes; testa se o agente distingue "critério não existe" de "fonte não é a primária" |

Os itens 3, 4 e 5 foram capturados como texto (a fonte é HTML, não PDF) — o
cabeçalho de cada arquivo tem a URL original; a fonte original prevalece em
caso de divergência. O item 5 é, adicionalmente, uma fonte secundária
(jornalismo sobre o edital, não o edital em si) — proposital, para testar
esse caso realista.

## Como isso se conecta ao Inception do Agente Enquadrador

Resolve a pergunta de validação nº3 do `agente-enquadrador/01-inception/INCEPTION.md`
("tem algum edital real específico que já quer usar como critério de
aceite?") — os critérios de aceite podem apontar direto pra esta pasta em
vez de depender de um edital ainda não escolhido.

Recomendação de cobertura mínima pro critério de aceite: rodar contra pelo
menos um PDF bem estruturado (1 ou 2) **e** o caso de informação
insuficiente (4) — é o teste mais duro da regra "não inventar o que não
está no edital".
