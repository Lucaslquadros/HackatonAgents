---
edital: Hackathon Low Hack 2026 ONLINE — Siemens Industry Software / Mendix
fonte: editais-referencia/02-lowhack-2026-online.pdf
desafio_central: "Como desenvolver soluções inovadoras que incentivem consumo consciente e produção responsável, reduzindo desperdício, alinhadas à ODS 9 e ODS 12 — construídas obrigatoriamente na plataforma low-code Mendix."
duracao_assumida_horas: "37h corridas (9h de sábado 18/04 às 22h de domingo 19/04/2026) — próximo do modelo clássico de 48h da Aula 2, mas não idêntico; totalmente online."
criterios:
  - nome: Potencial de impacto
    peso_percentual: "não declarado (nota 1-4, mesma escala dos outros 5 — ver inferência)"
    pergunta: "Qual o potencial de impacto da solução para o desafio proposto?"
    horas_sugeridas: "não declarado"
  - nome: Modelo de negócio
    peso_percentual: "não declarado (nota 1-4)"
    pergunta: "O modelo de negócio é escalável e aplicável ao desafio?"
    horas_sugeridas: "não declarado"
  - nome: Aderência ao desafio
    peso_percentual: "não declarado (nota 1-4)"
    pergunta: "A solução resolve efetivamente o desafio proposto?"
    horas_sugeridas: "não declarado"
  - nome: Inovação da solução
    peso_percentual: "não declarado (nota 1-4)"
    pergunta: "A solução traz inovação em tecnologia e/ou mudança de processo?"
    horas_sugeridas: "não declarado"
  - nome: Apresentação da solução (vídeo)
    peso_percentual: "não declarado (nota 1-4)"
    pergunta: "O pitch em vídeo foi claro, completo e aderente ao desafio?"
    horas_sugeridas: "não declarado"
  - nome: Critério técnico da solução
    peso_percentual: "não declarado (nota 1-4)"
    pergunta: "A aplicação funciona, usa GenAI (ChatGPT API) de forma efetiva, integra bem e tem boa UX/UI?"
    horas_sugeridas: "não declarado"
restricoes:
  - "OBRIGATÓRIO usar Mendix (plataforma low-code) — item 8.4: qualquer solução que não use Mendix é desclassificada, nem chega a ser avaliada."
  - "OBRIGATÓRIO usar GenAI via API OpenAI fornecida."
  - "Publicar no Mendix Cloud (Free Tier)."
  - "Equipe de 3 a 5 pessoas; ao menos 1 integrante deve estar nas 'lives obrigatórias' sob pena de desclassificação da equipe inteira."
  - "100% online; notebook próprio obrigatório."
entregaveis:
  - "Pasta de projeto até 19/04 21:59h."
  - "Pitch em vídeo (até 3 min) no YouTube não listado, até o mesmo prazo."
riscos:
  - "Desclassificação automática por não usar Mendix é a regra mais dura do edital — mais crítica que qualquer nota de critério. Deveria ser o primeiro checkpoint técnico da equipe, não uma decisão de meio de caminho."
  - "Os 6 critérios usam a mesma escala (1-4) sem peso declarado — ver inferência abaixo sobre como isso muda o tratamento em relação ao edital 01."
  - "Critério de desempate (item 8.2.7) expõe um piso técnico implícito: interface responsiva, ≥1 microflow/nanoflow funcional, ≥3 páginas navegáveis, persistência de dados — ler isso como 'requisito mínimo de qualidade', não só como desempate."
expectativas_implicitas:
  - "(inferência) O patrocinador (Siemens, dona da Mendix) está usando o hackathon como vitrine da própria plataforma — aderência ao Mendix provavelmente pesa tanto quanto ou mais que a criatividade da ideia, mesmo sem estar explícito como critério de nota (está como regra de eliminação, o que é ainda mais forte)."
  - "(inferência) A parceria com 'Comunidade Hackathon Brasil' e 'True Change' sugere objetivo também de ecossistema/geração de conteúdo de marketing (a cessão ampla de imagem no item 11.3 reforça isso), não só achar a melhor solução técnica."
informacao_insuficiente: false
---

## Nota sobre pesos (diferença do caso 01)

Aqui os 6 critérios são notas na mesma escala (1-4) sem peso relativo
declarado — isso é sutilmente diferente do edital 01 (TJCE-UFC), onde os
3 critérios eram nomeados mas sem escala visível. **(inferência)** Escala
igual não é prova de peso igual — mas na ausência de qualquer outro sinal,
tratar os 6 como igualmente relevantes é a leitura mais defensável, com uma
ressalva: a regra de eliminação por não usar Mendix funciona como um "peso
infinito" de fato — nenhuma nota nos 6 critérios importa se essa condição
não for cumprida.

## Perguntas de Ackoff para o squad

1. Qual problema isso resolve? — a resposta precisa nomear um desperdício
   concreto na cadeia de valor, não "sustentabilidade" em geral.
2. Que suposição está sendo assumida? — que a equipe consegue aprender
   Mendix o suficiente em ~37h para entregar as 3 páginas navegáveis e a
   integração com GenAI funcionando?
3. Qual o menor teste possível? — construir 1 microflow funcional cedo,
   antes de investir na narrativa do pitch, para validar que a stack
   obrigatória (Mendix + OpenAI) realmente funciona no tempo disponível.
4. O que conta como evidência? — nota do critério técnico (8.2.5.f) exige
   "funcionamento do app" — isso é binário (funciona/não funciona) antes de
   ser uma questão de qualidade.
5. Qual o Δt? — a equipe tem 37h corridas; decisão de estack tecnológica
   errada nas primeiras horas custa desproporcionalmente caro aqui, dado
   que não há tempo de "descobrir no meio do caminho" como no formato de 8
   semanas do edital 01.
