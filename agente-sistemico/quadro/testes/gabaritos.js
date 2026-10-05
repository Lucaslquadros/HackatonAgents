// Gabaritos da aula de pensamento sistêmico como mapas mínimos.
// Fonte: Revisao_AP1/fontes_md/04_Pensamento_Sistemico_CLD_Little_e_Metricas.md
// (exercícios 2, 3, 7 e 8) e o diagrama do caso Nexa Pay (HTML da aula).
//
// Cada seta é [origem, polaridade, destino] ou [origem, polaridade, destino, "atraso"].
// `loops` lista os loops esperados pelos números das setas (1 = primeira seta).

export function mapaDe(setasCompactas, { loopsAnotados = [] } = {}) {
  const nomes = [];
  for (const [de, , para] of setasCompactas) {
    for (const n of [de, para]) if (!nomes.includes(n)) nomes.push(n);
  }
  const idVar = (nome) => `var_${nomes.indexOf(nome) + 1}`;
  const idSeta = (i) => `seta_${String(i + 1).padStart(2, "0")}`;
  return {
    versao: 1,
    recorte: "rec_teste",
    contexto: { tema: "teste", pergunta_problema: "teste" },
    atores: [{ id: "ator_teste", nome: "Ator", papeis: ["outro"] }],
    variaveis: nomes.map((nome, i) => ({
      id: `var_${i + 1}`,
      nome,
      tipo: "neutra",
      atores: ["ator_teste"],
      status: "aceita",
      autor: "agente",
      posicao: { x: 0, y: 0 },
    })),
    setas: setasCompactas.map(([de, polaridade, para, atraso], i) => ({
      id: idSeta(i),
      de: idVar(de),
      para: idVar(para),
      polaridade,
      atraso: atraso === "atraso",
      mecanismo: `${de} move ${para}`,
      classificacao: "suposicao",
      status: "aceita",
      autor: "agente",
    })),
    loops_anotados: loopsAnotados.map(({ setas, meta }) => ({
      setas: setas.map((n) => idSeta(n - 1)),
      nome: "anotado",
      ...(meta ? { meta } : {}),
    })),
    analise: {},
    alavancas: [],
  };
}

export const idsDe = (numeros) => numeros.map((n) => `seta_${String(n).padStart(2, "0")}`);

// Exercício 2: classifique o loop (conte as negativas).
export const exercicio2 = [
  { item: "a", setas: [["A", "+", "B"], ["B", "+", "C"], ["C", "+", "A"]], tipo: "R", negativas: 0 },
  { item: "b", setas: [["A", "+", "B"], ["B", "-", "C"], ["C", "+", "A"]], tipo: "B", negativas: 1 },
  { item: "c", setas: [["A", "-", "B"], ["B", "-", "C"], ["C", "+", "A"]], tipo: "R", negativas: 2 },
  { item: "d", setas: [["A", "-", "B"], ["B", "-", "C"], ["C", "-", "D"], ["D", "+", "A"]], tipo: "B", negativas: 3 },
  {
    item: "e",
    setas: [
      ["Pressão por prazo", "+", "Horas extras"], ["Horas extras", "+", "Cansaço"],
      ["Cansaço", "+", "Erros"], ["Erros", "+", "Retrabalho"], ["Retrabalho", "+", "Pressão por prazo"],
    ],
    tipo: "R", negativas: 0,
  },
  {
    item: "f",
    setas: [["Contratação", "+", "Capacidade", "atraso"], ["Capacidade", "-", "Pressão"], ["Pressão", "+", "Contratação"]],
    tipo: "B", negativas: 1,
  },
  {
    item: "g",
    setas: [
      ["Defeitos", "+", "Retrabalho"], ["Retrabalho", "-", "Tempo para features"],
      ["Tempo para features", "+", "Entregas"], ["Entregas", "-", "Pressão"],
      ["Pressão", "+", "Atalhos"], ["Atalhos", "+", "Defeitos"],
    ],
    tipo: "R", negativas: 2,
  },
];

// Exercício 3: suporte.
export const suporte = {
  setas: [
    ["Chamados abertos", "+", "Pressão"],                 // 1
    ["Pressão", "+", "Velocidade de atendimento"],        // 2
    ["Velocidade de atendimento", "+", "Chamados resolvidos"], // 3
    ["Chamados resolvidos", "-", "Chamados abertos"],     // 4
    ["Velocidade de atendimento", "+", "Respostas incompletas"], // 5
    ["Respostas incompletas", "+", "Retorno dos clientes", "atraso"], // 6
    ["Retorno dos clientes", "+", "Chamados abertos"],    // 7
  ],
  loops: [
    { nome: "B1 · Redução da fila", setas: [1, 2, 3, 4], tipo: "B" },
    { nome: "R1 · Retrabalho do suporte", setas: [1, 2, 5, 6, 7], tipo: "R" },
  ],
  total: 2,
};

// Exercício 7: fila do time de dados da Loja Alfa.
export const lojaAlfa = {
  setas: [
    ["Fila de pedidos", "+", "Pressão por SLA"],          // 1
    ["Pressão por SLA", "+", "Velocidade de entrega"],    // 2
    ["Velocidade de entrega", "-", "Fila de pedidos"],    // 3
    ["Velocidade de entrega", "-", "Profundidade da análise"], // 4
    ["Profundidade da análise", "-", "Pedidos de refação", "atraso"], // 5
    ["Pedidos de refação", "+", "Fila de pedidos"],       // 6
    ["Fila de pedidos", "+", "Tamanho do time"],          // 7
    ["Tamanho do time", "+", "Capacidade produtiva do time", "atraso"], // 8
    ["Capacidade produtiva do time", "+", "Velocidade de entrega"], // 9
    ["Tamanho do time", "+", "Tempo de mentoria"],        // 10
    ["Tempo de mentoria", "-", "Capacidade produtiva do time"], // 11
  ],
  loops: [
    { nome: "B1 · Redução da fila", setas: [1, 2, 3], tipo: "B" },
    { nome: "R1 · Espiral da refação", setas: [1, 2, 4, 5, 6], tipo: "R" },
    { nome: "B2 · Contratação", setas: [7, 8, 9, 3], tipo: "B" },
    { nome: "R2 · Custo da mentoria", setas: [7, 10, 11, 9, 3], tipo: "R" },
  ],
  // O gabarito nomeia 4 loops, mas o grafo tem mais 2 ciclos simples que
  // combinam contratação com refação. Eles existem de verdade; o painel
  // precisa saber lidar com isso (ver BOLTS.md, Bolt 1).
  compostos: [
    { setas: [7, 8, 9, 4, 5, 6], tipo: "R", negativas: 2 },
    { setas: [7, 10, 11, 9, 4, 5, 6], tipo: "B", negativas: 3 },
  ],
  total: 6,
};

// Exercício 8: Nexa Pay (setas e polaridades do diagrama do HTML da aula).
export const nexaPay = {
  setas: [
    ["Gap de entrega", "+", "Pressão por prazo"],         // 1
    ["Pressão por prazo", "+", "Atalhos técnicos"],       // 2
    ["Atalhos técnicos", "+", "Dívida técnica", "atraso"], // 3
    ["Dívida técnica", "+", "Incidentes"],                // 4
    ["Incidentes", "-", "Capacidade real"],               // 5
    ["Capacidade real", "+", "Entregas de valor"],        // 6
    ["Entregas de valor", "-", "Gap de entrega"],         // 7
    ["Gap de entrega", "+", "Contratações"],              // 8
    ["Contratações", "+", "Capacidade real", "atraso"],   // 9
    ["Contratações", "+", "Coordenação"],                 // 10
    ["Coordenação", "-", "Capacidade real"],              // 11
    ["Incidentes", "+", "Saída de seniores"],             // 12
    ["Saída de seniores", "-", "Capacidade real"],        // 13
    ["Incidentes", "+", "Controles (CAB)"],               // 14
    ["Controles (CAB)", "-", "Incidentes"],               // 15
  ],
  loops: [
    { nome: "R1 · Bola de neve da dívida", setas: [1, 2, 3, 4, 5, 6, 7], tipo: "R" },
    { nome: "B1 · Mais gente", setas: [8, 9, 6, 7], tipo: "B" },
    { nome: "R2 · Lei de Brooks", setas: [8, 10, 11, 6, 7], tipo: "R" },
    { nome: "R3 · Fuga de talentos", setas: [1, 2, 3, 4, 12, 13, 6, 7], tipo: "R" },
    { nome: "B2 · Controle", setas: [14, 15], tipo: "B" },
  ],
  total: 5,
};
