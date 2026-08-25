---
edital: Edital Conjunto UFC - TJCE Nº 01/2026 — I Hackathon TJCE-UFC
fonte: editais-referencia/01-ufc-tjce-hackathon-2026.pdf
desafio_central: "3 desafios distintos, cada equipe escolhe 1: (1) ocupações irregulares em áreas de preservação ambiental, (2) atualização contínua de dados de ocupação em áreas judicializadas, (3) organização do acervo processual da Vara Estadual do Meio Ambiente (VEMA/TJCE) para reduzir retrabalho."
duracao_assumida_horas: "NÃO é um sprint de 48h — ver risco #1. Formato real: ~8 semanas corridas (11/09 a 05/11/2026), com 5 marcos síncronos obrigatórios (~12h de contato direto no total) intercalados com blocos assíncronos de dias a semanas cada."
criterios:
  - nome: Funcionalidade (avaliação técnica)
    peso_percentual: "não declarado"
    pergunta: "A solução responde ao problema/desafio identificado de forma consistente, inovadora e tecnicamente viável, considerando as necessidades da VEMA/TJCE e as condições institucionais de eventual implementação?"
    horas_sugeridas: "não declarado — ver nota de inferência no corpo"
  - nome: Aplicabilidade (viabilidade institucional)
    peso_percentual: "não declarado"
    pergunta: "A solução tem potencial de uso prático, boa relação custo-benefício, usabilidade, escalabilidade, aderência às rotinas do TJCE, e respeita proteção de dados/segurança da informação/viabilidade operacional?"
    horas_sugeridas: "não declarado — ver nota de inferência no corpo"
  - nome: Pitch (avaliação da apresentação)
    peso_percentual: "não declarado"
    pergunta: "A apresentação foi bem construída esteticamente, organizada, exposta de forma entusiástica e compreensível, com informações claras sobre funcionamento, etapas, recursos e condições de implementação?"
    horas_sugeridas: "não declarado — ver nota de inferência no corpo"
restricoes:
  - "Equipe fixa de 4 estudantes UFC (grad 30-80% do curso, ou pós), perfis Hacker/Hipster/Hustler recomendados."
  - "Cada equipe se dedica a apenas 1 dos 3 desafios."
  - "Predominantemente remoto; só Dia 1 e Demoday são presenciais no TJCE."
  - "Proibido usar material de terceiros sem autorização; proibido uso indevido de dados institucionais/pessoais/processuais."
entregaveis:
  - "Proposta de solução fundamentada — explicitamente NÃO precisa ser final/definitiva."
  - "Protótipo/modelagem."
  - "Pitch final no Demoday, com um pitch prévio avaliado informalmente ('Demolation') antes."
riscos:
  - "Tratar como hackathon de 48h é o erro mais provável aqui: a estrutura real é ~8 semanas com marcos fixos — alocar esforço como sprint concentrado desperdiça mentoria (01-07/10) e o ensaio avaliado (22/10)."
  - "Critérios sem peso declarado."
  - "Escolha do desafio (1 de 3) parece ocorrer já na inscrição — desalinhamento de equipe é risco real se não decidido antes."
  - "Eliminação por formulário 'inconsistente' (item 9.1) — risco administrativo, não só de solução."
expectativas_implicitas:
  - "(inferência) Problema por trás do problema: a VEMA sofre com esses 3 problemas de forma crônica, sugerindo que soluções de baixo atrito institucional têm mais chance que soluções de grande investimento."
  - "(inferência) Perfil da banca institucional/jurídico-administrativo — defesa deve ser em linguagem de impacto institucional, não só argumento técnico."
  - "(inferência) O que seria constrangedor: qualquer solução fraca em LGPD/segurança da informação — o próprio edital eleva isso a critério de eliminação (item 9.6)."
  - "(inferência) Critério não declarado, sinalizado no item 8.4: o edital busca soluções com 'maior potencial de implementação futura' — Aplicabilidade pode pesar tanto quanto Funcionalidade. O prêmio (vaga de estágio, não dinheiro) reforça que o patrocinador está comprando funil de talento e soluções adotáveis, não vitrine de criatividade."
informacao_insuficiente: false
---

Ver análise completa na conversa (Bolt 3, primeiro teste). Resumo: matriz de
critérios extraída corretamente; achado principal foi a duração real
(~8 semanas, não 48h) — o prompt do agente tratou isso como risco #1 em vez
de forçar a suposição padrão.
