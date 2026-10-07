import { montarPedido } from "./visoes.js";

// Panorama do Agente de Panorama e Priorização (Bolt 1 — Fatos +
// classificação CSD, por cenário). Mecânico, sem LLM: squad cria cenários,
// registra fatos com evidência (fonte+data ou estimativa com a conta
// aberta — $defs/evidencia) e classifica cada um na Matriz CSD (Inception,
// decisão 11 — a diferença é explicada na tela, não um rótulo escondido).
// Funções puras + HTML; rede e eventos ficam em app.js. Reaproveita o
// quadro do Sistêmico (Inception, decisão 3) em vez de uma interface nova.

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const CLASSIFICACOES_CSD = ["certeza", "suposicao", "duvida"];
export const EXPLICACAO_CSD = {
  certeza: {
    rotulo: "Certeza",
    explicacao: "Tem evidência verificável — uma fonte, um dado, uma observação registrada. Não é opinião do squad.",
  },
  suposicao: {
    rotulo: "Suposição",
    explicacao: "O squad acredita que é verdade, mas ainda não tem prova. Vira uma pergunta de pesquisa a responder antes de apostar nela.",
  },
  duvida: {
    rotulo: "Dúvida",
    explicacao: "Nem suposição — é uma lacuna de conhecimento reconhecida. Vira uma tarefa de discovery: o squad precisa ir atrás da resposta.",
  },
};

export const TIPOS_EVIDENCIA = ["fonte_publica", "entrevista", "observacao", "dado", "experimento", "estimativa"];
export const ROTULO_TIPO_EVIDENCIA = {
  fonte_publica: "Fonte pública",
  entrevista: "Entrevista",
  observacao: "Observação",
  dado: "Dado",
  experimento: "Experimento",
  estimativa: "Estimativa (conta aberta)",
};

// ---------- estado ----------

export function novoPanorama() {
  return { versao: 1, cenarios: [], fatos: [], clusters: [], problemas_candidatos: [], criterios_ranqueamento: [], ranqueamento: [] };
}

// Garante os campos obrigatórios ao carregar um panorama.json antigo ou
// incompleto — mesmo padrão de `normalizar` em estado.js.
export function normalizarPanorama(dado) {
  const base = novoPanorama();
  const pan = { ...base, ...dado };
  for (const chave of ["cenarios", "fatos", "clusters", "problemas_candidatos", "criterios_ranqueamento", "ranqueamento"]) {
    if (!Array.isArray(pan[chave])) pan[chave] = [];
  }
  return pan;
}

function proximoId(lista, prefixo) {
  let maior = 0;
  const re = new RegExp(`^${prefixo}_(\\d+)$`);
  for (const item of lista) {
    const m = re.exec(item.id || "");
    if (m) maior = Math.max(maior, Number(m[1]));
  }
  return `${prefixo}_${maior + 1}`;
}

export function adicionarCenario(pan, { nome, descricao } = {}) {
  const limpo = (nome || "").trim();
  if (!limpo) throw new Error("Dê um nome ao cenário antes de criar.");
  const cenario = { id: proximoId(pan.cenarios, "cen"), nome: limpo, atores: [] };
  if ((descricao || "").trim()) cenario.descricao = descricao.trim();
  pan.cenarios.push(cenario);
  return cenario;
}

export function atualizarCenario(pan, id, campos) {
  const cenario = pan.cenarios.find((c) => c.id === id);
  if (!cenario) throw new Error(`cenário inexistente: ${id}`);
  if ("nome" in campos) cenario.nome = campos.nome;
  if ("descricao" in campos) cenario.descricao = campos.descricao;
  return cenario;
}

// Cascata: fato/cluster/problema sem cenário não fazem sentido no
// contrato (todos exigem `cenario`), então remover o cenário remove tudo
// que pertence a ele.
export function removerCenario(pan, id) {
  const indice = pan.cenarios.findIndex((c) => c.id === id);
  if (indice === -1) throw new Error(`cenário inexistente: ${id}`);
  pan.cenarios.splice(indice, 1);
  pan.fatos = pan.fatos.filter((f) => f.cenario !== id);
  pan.clusters = pan.clusters.filter((c) => c.cenario !== id);
  pan.problemas_candidatos = pan.problemas_candidatos.filter((p) => p.cenario !== id);
}

export function adicionarFato(pan, cenarioId, { autor, agora } = {}) {
  if (!pan.cenarios.some((c) => c.id === cenarioId)) throw new Error(`cenário inexistente: ${cenarioId}`);
  const fato = {
    id: proximoId(pan.fatos, "fat"),
    cenario: cenarioId,
    texto: "",
    evidencia: { tipo: "estimativa", descricao: "", contem_dado_pessoal: false },
    classificacao_csd: "suposicao",
    autor: (autor || "mem_squad").trim(),
  };
  if (agora) fato.criado_em = agora;
  pan.fatos.push(fato);
  return fato;
}

// Cascata leve: remover um fato tira ele de qualquer problema candidato
// que o citava como fonte, em vez de deixar uma referência quebrada.
export function removerFato(pan, id) {
  const indice = pan.fatos.findIndex((f) => f.id === id);
  if (indice === -1) throw new Error(`fato inexistente: ${id}`);
  pan.fatos.splice(indice, 1);
  for (const p of pan.problemas_candidatos) {
    p.fontes = (p.fontes || []).filter((f) => f !== id);
  }
}

export function atualizarFato(pan, id, campos) {
  const fato = pan.fatos.find((f) => f.id === id);
  if (!fato) throw new Error(`fato inexistente: ${id}`);
  if ("texto" in campos) fato.texto = campos.texto;
  if ("classificacao_csd" in campos) {
    if (!CLASSIFICACOES_CSD.includes(campos.classificacao_csd)) throw new Error(`classificação inválida: ${campos.classificacao_csd}`);
    fato.classificacao_csd = campos.classificacao_csd;
  }
  if ("evidencia" in campos) fato.evidencia = { ...fato.evidencia, ...campos.evidencia };
  return fato;
}

export function fatosDoCenario(pan, cenarioId) {
  return pan.fatos.filter((f) => f.cenario === cenarioId);
}

// ---------- clusters (Bolt 2 — squad monta o board primeiro; crítica do
// agente, se vier, é só no Bolt 6/motor) ----------

export function clustersDoCenario(pan, cenarioId) {
  return pan.clusters.filter((c) => c.cenario === cenarioId);
}

function elementosDisponiveis(pan, cenario) {
  const fatos = fatosDoCenario(pan, cenario.id).map((f) => ({ id: f.id, rotulo: f.texto || `(fato sem texto) ${f.id}` }));
  const atores = (cenario.atores || []).map((a) => ({ id: a.id, rotulo: `${a.nome} (ator)` }));
  return [...fatos, ...atores];
}

export function adicionarCluster(pan, cenarioId, { nome } = {}) {
  if (!pan.cenarios.some((c) => c.id === cenarioId)) throw new Error(`cenário inexistente: ${cenarioId}`);
  const cluster = { id: proximoId(pan.clusters, "clu"), cenario: cenarioId, nome: (nome || "").trim(), elementos: [] };
  pan.clusters.push(cluster);
  return cluster;
}

export function atualizarCluster(pan, id, campos) {
  const cluster = pan.clusters.find((c) => c.id === id);
  if (!cluster) throw new Error(`cluster inexistente: ${id}`);
  if ("nome" in campos) cluster.nome = campos.nome;
  return cluster;
}

// Remover cluster não leva os problemas candidatos junto — só desliga a
// referência `cluster_origem`, se algum problema apontava pra ele.
export function removerCluster(pan, id) {
  const indice = pan.clusters.findIndex((c) => c.id === id);
  if (indice === -1) throw new Error(`cluster inexistente: ${id}`);
  pan.clusters.splice(indice, 1);
  for (const p of pan.problemas_candidatos) {
    if (p.cluster_origem === id) delete p.cluster_origem;
  }
}

// Remover cluster não remove o elemento (fato/ator) em si — só a
// referência dentro deste cluster.
export function adicionarElementoCluster(pan, clusterId, elementoId) {
  const cluster = pan.clusters.find((c) => c.id === clusterId);
  if (!cluster) throw new Error(`cluster inexistente: ${clusterId}`);
  if (!elementoId) throw new Error("escolha um elemento antes de adicionar.");
  if (!cluster.elementos.includes(elementoId)) cluster.elementos.push(elementoId);
  return cluster;
}

export function removerElementoCluster(pan, clusterId, elementoId) {
  const cluster = pan.clusters.find((c) => c.id === clusterId);
  if (!cluster) throw new Error(`cluster inexistente: ${clusterId}`);
  cluster.elementos = cluster.elementos.filter((e) => e !== elementoId);
}

// Detecção mecânica de nós (Inception, decisão 1.2): um elemento presente
// em mais de um cluster do mesmo cenário. Lógica de conjunto pura, sem
// agente — a crítica do agente (lacunas) fica para o motor, Bolt 6.
export function nosDoCenario(pan, cenarioId) {
  const contagem = new Map();
  for (const cluster of clustersDoCenario(pan, cenarioId)) {
    for (const elementoId of cluster.elementos) {
      if (!contagem.has(elementoId)) contagem.set(elementoId, []);
      contagem.get(elementoId).push(cluster.id);
    }
  }
  const nos = [];
  for (const [elementoId, clusterIds] of contagem) {
    if (clusterIds.length > 1) nos.push({ elementoId, clusterIds });
  }
  return nos;
}

// ---------- problemas candidatos (Bolt 3 — passo 3 do funil: pergunta-
// problema + magnitude + fonte, construído sobre fatos já classificados
// na CSD, não antes) ----------

export function problemasDoCenario(pan, cenarioId) {
  return pan.problemas_candidatos.filter((p) => p.cenario === cenarioId);
}

export function adicionarProblema(pan, cenarioId) {
  if (!pan.cenarios.some((c) => c.id === cenarioId)) throw new Error(`cenário inexistente: ${cenarioId}`);
  const problema = { id: proximoId(pan.problemas_candidatos, "prob"), cenario: cenarioId, pergunta_problema: "", magnitude: "", fontes: [] };
  pan.problemas_candidatos.push(problema);
  return problema;
}

export function atualizarProblema(pan, id, campos) {
  const problema = pan.problemas_candidatos.find((p) => p.id === id);
  if (!problema) throw new Error(`problema candidato inexistente: ${id}`);
  if ("pergunta_problema" in campos) problema.pergunta_problema = campos.pergunta_problema;
  if ("magnitude" in campos) problema.magnitude = campos.magnitude;
  if ("cluster_origem" in campos) {
    if (campos.cluster_origem) problema.cluster_origem = campos.cluster_origem;
    else delete problema.cluster_origem;
  }
  return problema;
}

export function removerProblema(pan, id) {
  const indice = pan.problemas_candidatos.findIndex((p) => p.id === id);
  if (indice === -1) throw new Error(`problema candidato inexistente: ${id}`);
  pan.problemas_candidatos.splice(indice, 1);
}

// Fonte só pode ser um fato do mesmo cenário do problema — evita misturar
// evidência de um cenário dentro do problema de outro.
export function alternarFonteProblema(pan, id, fatoId, marcado) {
  const problema = pan.problemas_candidatos.find((p) => p.id === id);
  if (!problema) throw new Error(`problema candidato inexistente: ${id}`);
  const fato = pan.fatos.find((f) => f.id === fatoId);
  if (!fato || fato.cenario !== problema.cenario) throw new Error(`fato não pertence ao cenário deste problema: ${fatoId}`);
  const semEle = (problema.fontes || []).filter((f) => f !== fatoId);
  problema.fontes = marcado ? [...semEle, fatoId] : semEle;
  return problema;
}

// ---------- ranqueamento (Bolt 4 — nível do panorama inteiro, não por
// cenário: a finalidade é comparar problemas candidatos de categorias
// diferentes entre si e escolher 1 só. Pesos são sempre do squad; o
// agente não escolhe (Inception, decisão 1.4). ----------

export const CRITERIOS_SUGERIDOS = [
  "Magnitude do problema",
  "Centralidade sistêmica",
  "Alavancagem alcançável",
  "Tratabilidade (Cynefin, dados, Δt)",
  "Aderência ao edital",
  "Aderência ao time",
];

export function adicionarCriterio(pan, { nome, peso } = {}) {
  const limpo = (nome || "").trim();
  if (!limpo) throw new Error("Dê um nome ao critério antes de criar.");
  const criterio = { id: proximoId(pan.criterios_ranqueamento, "crit"), nome: limpo, peso: Number(peso) || 1 };
  pan.criterios_ranqueamento.push(criterio);
  return criterio;
}

export function atualizarCriterio(pan, id, campos) {
  const criterio = pan.criterios_ranqueamento.find((c) => c.id === id);
  if (!criterio) throw new Error(`critério inexistente: ${id}`);
  if ("nome" in campos) criterio.nome = campos.nome;
  if ("peso" in campos) {
    const n = Number(campos.peso);
    criterio.peso = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  return criterio;
}

// Cascata: remover um critério remove as notas que o citavam — uma nota
// órfã (sem critério) não faz sentido no contrato.
export function removerCriterio(pan, id) {
  const indice = pan.criterios_ranqueamento.findIndex((c) => c.id === id);
  if (indice === -1) throw new Error(`critério inexistente: ${id}`);
  pan.criterios_ranqueamento.splice(indice, 1);
  pan.ranqueamento = pan.ranqueamento.filter((n) => n.criterio !== id);
}

// Uma nota por (problema, critério) — upsert: se já existe, atualiza; se
// `nota` vier vazio/indefinido, a entrada é removida (squad apagou a nota).
export function definirNota(pan, problemaId, criterioId, { nota, justificativa } = {}) {
  if (!pan.problemas_candidatos.some((p) => p.id === problemaId)) throw new Error(`problema candidato inexistente: ${problemaId}`);
  if (!pan.criterios_ranqueamento.some((c) => c.id === criterioId)) throw new Error(`critério inexistente: ${criterioId}`);
  const existente = pan.ranqueamento.find((n) => n.problema === problemaId && n.criterio === criterioId);
  const vazio = nota === "" || nota === null || nota === undefined;
  if (vazio) {
    if (existente) pan.ranqueamento = pan.ranqueamento.filter((n) => n !== existente);
    return null;
  }
  const n = Number(nota);
  if (!Number.isFinite(n) || n < 0 || n > 10) throw new Error("nota precisa ser um número de 0 a 10");
  if (existente) {
    existente.nota = n;
    if (justificativa !== undefined) existente.justificativa = justificativa;
    return existente;
  }
  const item = { problema: problemaId, criterio: criterioId, nota: n };
  if ((justificativa || "").trim()) item.justificativa = justificativa.trim();
  pan.ranqueamento.push(item);
  return item;
}

function notaDe(pan, problemaId, criterioId) {
  return pan.ranqueamento.find((n) => n.problema === problemaId && n.criterio === criterioId);
}

// Total ponderado = média ponderada (não soma) das notas já dadas: assim
// um problema ainda parcialmente avaliado não fica artificialmente mais
// baixo só por ter menos critérios preenchidos — compara o que já foi
// avaliado, não pune quem está em progresso.
export function totalPonderado(pan, problemaId) {
  let somaPesoNota = 0;
  let somaPeso = 0;
  let avaliados = 0;
  for (const criterio of pan.criterios_ranqueamento) {
    const nota = notaDe(pan, problemaId, criterio.id);
    if (!nota) continue;
    somaPesoNota += nota.nota * criterio.peso;
    somaPeso += criterio.peso;
    avaliados += 1;
  }
  if (!somaPeso) return null;
  return { total: somaPesoNota / somaPeso, avaliados, deCriterios: pan.criterios_ranqueamento.length };
}

// Apoio (não cálculo automático — quem dá a nota final é o squad) para o
// critério de aderência ao time: cruza o nome do cenário do problema com
// `membro.areas_afinidade` do Cadastro do Time (Hack_OS/squad.json, Bolt 2
// do agente-orquestrador). Match por substring, sem distinguir
// maiúsculas/acentos — aproximado de propósito, "Green Tech" deve bater
// com "Green Tech & Agtech".
function normalizarTexto(t) {
  return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function apoioAderenciaTime(squad, nomeCenario) {
  const alvo = normalizarTexto(nomeCenario);
  if (!alvo || !squad?.membros) return [];
  const apoios = [];
  for (const membro of squad.membros) {
    for (const area of membro.areas_afinidade || []) {
      const areaNorm = normalizarTexto(area.area);
      if (!areaNorm) continue;
      if (alvo.includes(areaNorm) || areaNorm.includes(alvo)) {
        apoios.push({ membro: membro.nome, area: area.area, nivel: area.nivel, como_agrega: area.como_agrega || "" });
      }
    }
  }
  return apoios;
}

export function ehCriterioDeTime(criterio) {
  return normalizarTexto(criterio.nome).includes("time");
}

// ---------- finalista + handoff pro Sistêmico (Bolt 5 — Inception,
// "Contrato de saída": o problema escolhido sai pronto para popular
// mapa.contexto + atores[] de uma sessão nova do Sistêmico, pulando a 1ª
// rodada da entrevista dele) ----------

function slugify(texto) {
  const s = (texto || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s.slice(0, 40) || "tema";
}

export function montarFinalista(pan, problemaId) {
  const problema = pan.problemas_candidatos.find((p) => p.id === problemaId);
  if (!problema) throw new Error(`problema candidato inexistente: ${problemaId}`);
  const cenario = pan.cenarios.find((c) => c.id === problema.cenario);
  if (!cenario) throw new Error(`cenário inexistente para o problema: ${problema.cenario}`);
  if (!(problema.pergunta_problema || "").trim()) throw new Error("este problema candidato ainda não tem pergunta-problema — preencha antes de escolher como finalista.");
  if (!(cenario.nome || "").trim()) throw new Error("o cenário deste problema está sem nome.");
  const finalista = {
    problema: problema.id,
    tema: cenario.nome.trim(),
    pergunta_problema: problema.pergunta_problema.trim(),
    atores: cenario.atores || [],
  };
  if (problema.cluster_origem) {
    const cluster = pan.clusters.find((c) => c.id === problema.cluster_origem);
    if (cluster?.nome) finalista.fronteira = `Recorte definido no Panorama a partir do cluster "${cluster.nome}".`;
  }
  return finalista;
}

export function recorteDoFinalista(finalista) {
  return `rec_${slugify(finalista.tema)}`;
}

export function escolherFinalista(pan, problemaId) {
  const finalista = montarFinalista(pan, problemaId);
  pan.finalista = finalista;
  return finalista;
}

// Mapa mínimo mas completo pro schema ($defs/mapa exige todos os campos
// mesmo vazios) + reaproveita montarPedido (visoes.js, Bolt 4 do
// Sistêmico) em vez de duplicar a lógica de montagem do pedido.
export function pedidoVisaoDoFinalista(finalista, recorte, agora = new Date()) {
  const mapa = {
    versao: 1,
    recorte,
    contexto: {
      tema: finalista.tema,
      pergunta_problema: finalista.pergunta_problema,
      ...(finalista.fronteira ? { fronteira: finalista.fronteira } : {}),
    },
    atores: finalista.atores || [],
    variaveis: [],
    setas: [],
    loops_anotados: [],
    analise: {},
    alavancas: [],
  };
  return montarPedido(mapa, { loops: [], problemas: [] }, [], { gatilho: "pedido", agora });
}

export function pendencias(pan) {
  const motivos = [];
  if (!pan.cenarios.length) motivos.push("crie ao menos 1 cenário");
  const comTexto = pan.fatos.filter((f) => (f.texto || "").trim());
  if (pan.cenarios.length && !comTexto.length) motivos.push("registre ao menos 1 fato com texto");
  return motivos;
}

// Avisos não-bloqueantes: um fato sem texto ou sem a descrição da
// evidência é descartado em silêncio por `paraContrato` — avisa antes.
// Mesmo princípio do Cadastro do Time (Bolt 2.1, correção pós-teste real
// do Lucas: avisar em vez de só descartar).
export function avisos(pan) {
  const lista = [];
  for (const f of pan.fatos) {
    if (!(f.texto || "").trim()) {
      lista.push({ fatoId: f.id, mensagem: `Fato ${f.id} sem texto — não vai ser salvo.` });
      continue;
    }
    if (!(f.evidencia?.descricao || "").trim()) {
      const trecho = f.texto.length > 40 ? `${f.texto.slice(0, 40)}…` : f.texto;
      lista.push({ fatoId: f.id, mensagem: `"${trecho}": falta descrever a evidência (fonte, ou a conta aberta se for estimativa) — não vai ser salvo.` });
    }
  }
  for (const c of pan.clusters) {
    if (!(c.nome || "").trim()) {
      lista.push({ clusterId: c.id, mensagem: `Cluster ${c.id} sem nome — não vai ser salvo.` });
    } else if (!c.elementos.length) {
      lista.push({ clusterId: c.id, mensagem: `Cluster "${c.nome}" sem nenhum elemento — não vai ser salvo.` });
    }
  }
  for (const p of pan.problemas_candidatos) {
    const faltando = [];
    if (!(p.pergunta_problema || "").trim()) faltando.push("pergunta-problema");
    if (!(p.magnitude || "").trim()) faltando.push("magnitude");
    if (!(p.fontes || []).length) faltando.push("nenhuma fonte marcada");
    if (faltando.length) {
      lista.push({ problemaId: p.id, mensagem: `Problema candidato ${p.id} sem ${faltando.join(", ")} — não vai ser salvo.` });
    }
  }
  for (const c of pan.criterios_ranqueamento || []) {
    if (!(c.nome || "").trim()) {
      lista.push({ criterioId: c.id, mensagem: `Critério ${c.id} sem nome — não vai ser salvo.` });
    } else if (!(c.peso > 0)) {
      lista.push({ criterioId: c.id, mensagem: `Critério "${c.nome}" com peso 0 — não entra no total ponderado de nenhum problema.` });
    }
  }
  if (pan.criterios_ranqueamento?.length && pan.problemas_candidatos?.length) {
    for (const p of pan.problemas_candidatos) {
      const semNota = !pan.ranqueamento.some((n) => n.problema === p.id);
      if (semNota) lista.push({ problemaId: p.id, mensagem: `Problema "${(p.pergunta_problema || p.id).slice(0, 40)}" ainda sem nenhuma nota no ranqueamento.` });
    }
  }
  return lista;
}

// Monta o objeto pronto para o contrato do schema ($defs/panorama):
// descarta cenários sem nome e fatos sem texto/evidência (em vez de
// mandar string vazia, que violaria minLength), mantém o resto do
// objeto (clusters, problemas_candidatos etc.) intacto para os próximos
// bolts não perderem dado ao salvar neste.
export function paraContrato(pan) {
  const cenarios = pan.cenarios
    .map((c) => {
      const cenario = { id: c.id, nome: (c.nome || "").trim() };
      if ((c.descricao || "").trim()) cenario.descricao = c.descricao.trim();
      if (c.atores?.length) cenario.atores = c.atores;
      return cenario;
    })
    .filter((c) => c.nome);
  const cenarioIds = new Set(cenarios.map((c) => c.id));
  const fatos = pan.fatos
    .filter((f) => cenarioIds.has(f.cenario))
    .map((f) => {
      const texto = (f.texto || "").trim();
      const descricao = (f.evidencia?.descricao || "").trim();
      if (!texto || !descricao) return null;
      const evidencia = { tipo: f.evidencia.tipo, descricao, contem_dado_pessoal: false };
      if ((f.evidencia.referencia || "").trim()) evidencia.referencia = f.evidencia.referencia.trim();
      if (f.evidencia.data) evidencia.data = f.evidencia.data;
      const fato = { id: f.id, cenario: f.cenario, texto, evidencia, classificacao_csd: f.classificacao_csd, autor: f.autor };
      if (f.criado_em) fato.criado_em = f.criado_em;
      return fato;
    })
    .filter(Boolean);
  const fatoIds = new Set(fatos.map((f) => f.id));
  const atorIds = new Set(cenarios.flatMap((c) => (c.atores || []).map((a) => a.id)));
  const elementosValidos = new Set([...fatoIds, ...atorIds]);
  const clusters = (pan.clusters || [])
    .filter((c) => cenarioIds.has(c.cenario))
    .map((c) => ({
      id: c.id,
      cenario: c.cenario,
      nome: (c.nome || "").trim(),
      elementos: (c.elementos || []).filter((e) => elementosValidos.has(e)),
    }))
    .filter((c) => c.nome && c.elementos.length);
  const clusterIdsValidos = new Set(clusters.map((c) => c.id));
  const problemas = (pan.problemas_candidatos || [])
    .filter((p) => cenarioIds.has(p.cenario))
    .map((p) => {
      const pergunta_problema = (p.pergunta_problema || "").trim();
      const magnitude = (p.magnitude || "").trim();
      const fontes = (p.fontes || []).filter((f) => fatoIds.has(f));
      if (!pergunta_problema || !magnitude || !fontes.length) return null;
      const problema = { id: p.id, cenario: p.cenario, pergunta_problema, magnitude, fontes };
      if (p.cluster_origem && clusterIdsValidos.has(p.cluster_origem)) problema.cluster_origem = p.cluster_origem;
      return problema;
    })
    .filter(Boolean);
  const problemaIds = new Set(problemas.map((p) => p.id));
  const criterios = (pan.criterios_ranqueamento || [])
    .map((c) => ({ id: c.id, nome: (c.nome || "").trim(), peso: Number(c.peso) || 0 }))
    .filter((c) => c.nome);
  const criterioIds = new Set(criterios.map((c) => c.id));
  const ranqueamento = (pan.ranqueamento || [])
    .filter((n) => problemaIds.has(n.problema) && criterioIds.has(n.criterio) && Number.isFinite(n.nota))
    .map((n) => {
      const item = { problema: n.problema, criterio: n.criterio, nota: n.nota };
      if ((n.justificativa || "").trim()) item.justificativa = n.justificativa.trim();
      return item;
    });
  const doc = {
    versao: 1,
    cenarios,
    fatos,
    clusters,
    problemas_candidatos: problemas,
    criterios_ranqueamento: criterios,
    ranqueamento,
  };
  if (pan.finalista) doc.finalista = pan.finalista;
  return doc;
}

// ---------- HTML (tela cheia, mesmo padrão do ritual — Bolt 9) ----------

function htmlExplicacaoCsd() {
  return `
    <details class="csd-explicacao">
      <summary>O que significa certeza / suposição / dúvida?</summary>
      <ul>
        ${CLASSIFICACOES_CSD.map((c) => `<li><strong>${esc(EXPLICACAO_CSD[c].rotulo)}:</strong> ${esc(EXPLICACAO_CSD[c].explicacao)}</li>`).join("")}
      </ul>
    </details>`;
}

function htmlFormCenario(rascunho = {}) {
  return `
    <form id="form-panorama-cenario" class="panorama-form-cenario">
      <h3>Novo cenário</h3>
      <p class="dica">Um cenário é um tema ou categoria em avaliação — pode ser uma categoria de edital (ex.: "Green Tech &amp; Agtech") ou um tema livre.</p>
      <input type="text" id="pan-cenario-nome" placeholder="Nome do cenário" value="${esc(rascunho.nome || "")}">
      <textarea id="pan-cenario-descricao" placeholder="Descrição (opcional)">${esc(rascunho.descricao || "")}</textarea>
      <p class="erro" id="panorama-cenario-erro" role="alert"></p>
      <button type="submit" class="primario">Criar cenário</button>
    </form>`;
}

function htmlListaCenarios(cenarios, abertoId) {
  if (!cenarios.length) return "";
  return `
    <nav class="panorama-cenarios" role="tablist" aria-label="Cenários">
      ${cenarios.map((c) => `
        <button type="button" role="tab" class="panorama-cenario-botao ${c.id === abertoId ? "ativo" : ""}" data-panorama-abrir-cenario="${esc(c.id)}" aria-selected="${c.id === abertoId}">
          ${esc(c.nome)}
        </button>`).join("")}
    </nav>`;
}

function htmlEvidencia(fato) {
  const ev = fato.evidencia || {};
  return `
    <div class="panorama-evidencia">
      <label>Tipo de evidência</label>
      <select data-panorama-campo="evidencia.tipo" data-fato="${esc(fato.id)}">
        ${TIPOS_EVIDENCIA.map((t) => `<option value="${t}" ${ev.tipo === t ? "selected" : ""}>${esc(ROTULO_TIPO_EVIDENCIA[t])}</option>`).join("")}
      </select>
      <label>Descrição da evidência${ev.tipo === "estimativa" ? " (a conta aberta — como vocês chegaram nesse número)" : " (o que comprova o fato)"}</label>
      <textarea data-panorama-campo="evidencia.descricao" data-fato="${esc(fato.id)}" placeholder="${ev.tipo === "estimativa" ? "Ex.: 3 em cada 5 municípios da região, segundo levantamento informal do squad" : "Ex.: IBGE, Censo Agropecuário 2023"}">${esc(ev.descricao || "")}</textarea>
      <label>Fonte/link (opcional)</label>
      <input type="text" data-panorama-campo="evidencia.referencia" data-fato="${esc(fato.id)}" value="${esc(ev.referencia || "")}">
      <label>Data (opcional)</label>
      <input type="date" data-panorama-campo="evidencia.data" data-fato="${esc(fato.id)}" value="${esc(ev.data || "")}">
    </div>`;
}

function htmlFato(fato) {
  return `
    <li class="panorama-fato" data-fato-id="${esc(fato.id)}">
      <div class="panorama-fato-cabecalho">
        <textarea data-panorama-campo="texto" data-fato="${esc(fato.id)}" placeholder="O que vocês descobriram ou presumem?">${esc(fato.texto)}</textarea>
        <button type="button" class="perigo" data-panorama-acao="remover-fato" data-fato="${esc(fato.id)}">🗑 Remover</button>
      </div>
      <label>Classificação (Matriz CSD)</label>
      <select data-panorama-campo="classificacao_csd" data-fato="${esc(fato.id)}">
        ${CLASSIFICACOES_CSD.map((c) => `<option value="${c}" ${fato.classificacao_csd === c ? "selected" : ""}>${esc(EXPLICACAO_CSD[c].rotulo)}</option>`).join("")}
      </select>
      ${htmlEvidencia(fato)}
    </li>`;
}

function htmlCluster(cluster, elementosDisp, nosPorElemento) {
  const rotulo = (id) => elementosDisp.find((e) => e.id === id)?.rotulo || id;
  const disponiveisParaAdicionar = elementosDisp.filter((e) => !cluster.elementos.includes(e.id));
  return `
    <li class="panorama-cluster" data-cluster-id="${esc(cluster.id)}">
      <div class="panorama-cluster-cabecalho">
        <input type="text" data-panorama-cluster-campo="nome" data-cluster="${esc(cluster.id)}" placeholder="Nome do cluster (ex.: conectividade no campo)" value="${esc(cluster.nome)}">
        <button type="button" class="perigo" data-panorama-acao="remover-cluster" data-cluster="${esc(cluster.id)}">🗑 Remover cluster</button>
      </div>
      <ul class="panorama-cluster-elementos">
        ${cluster.elementos.map((id) => `
          <li class="${nosPorElemento.has(id) ? "panorama-no" : ""}">
            ${esc(rotulo(id))}
            ${nosPorElemento.has(id) ? `<span class="panorama-no-selo" title="Também está em outro cluster">nó</span>` : ""}
            <button type="button" class="link perigo" data-panorama-acao="remover-elemento-cluster" data-cluster="${esc(cluster.id)}" data-elemento="${esc(id)}">×</button>
          </li>`).join("")}
      </ul>
      ${disponiveisParaAdicionar.length ? `
        <div class="panorama-cluster-add">
          <select data-panorama-cluster-select="${esc(cluster.id)}">
            ${disponiveisParaAdicionar.map((e) => `<option value="${esc(e.id)}">${esc(e.rotulo)}</option>`).join("")}
          </select>
          <button type="button" data-panorama-acao="adicionar-elemento-cluster" data-cluster="${esc(cluster.id)}">+ Adicionar ao cluster</button>
        </div>` : `<p class="dica">Todos os fatos/atores do cenário já estão neste cluster.</p>`}
    </li>`;
}

function htmlClustersSecao(pan, cenario) {
  const clusters = clustersDoCenario(pan, cenario.id);
  const elementosDisp = elementosDisponiveis(pan, cenario);
  const nos = nosDoCenario(pan, cenario.id);
  const nosPorElemento = new Set(nos.map((n) => n.elementoId));
  return `
    <section class="panorama-clusters">
      <h4>Clusters</h4>
      <p class="dica">
        Agrupem fatos (e atores, se já tiverem) por <strong>relação</strong>
        — não por área/departamento. O squad monta o board; se um elemento
        aparecer em mais de um cluster, ele é marcado como "nó" aqui
        embaixo automaticamente.
      </p>
      ${!elementosDisp.length ? `<p class="dica">Registrem ao menos 1 fato neste cenário antes de montar clusters.</p>` : ""}
      ${nos.length ? `<p class="panorama-contagem">${nos.length} nó(s) encontrado(s) — elemento presente em mais de um cluster.</p>` : ""}
      <ul class="panorama-clusters-lista">${clusters.map((c) => htmlCluster(c, elementosDisp, nosPorElemento)).join("")}</ul>
      ${elementosDisp.length ? `<button type="button" class="primario" data-panorama-acao="adicionar-cluster" data-cenario="${esc(cenario.id)}">+ Cluster</button>` : ""}
    </section>`;
}

function htmlProblema(pan, cenario, problema) {
  const fatos = fatosDoCenario(pan, cenario.id);
  const clusters = clustersDoCenario(pan, cenario.id);
  return `
    <li class="panorama-problema" data-problema-id="${esc(problema.id)}">
      <div class="panorama-problema-cabecalho">
        <textarea data-panorama-problema-campo="pergunta_problema" data-problema="${esc(problema.id)}" placeholder="Por que X, apesar de Y?">${esc(problema.pergunta_problema)}</textarea>
        <button type="button" class="perigo" data-panorama-acao="remover-problema" data-problema="${esc(problema.id)}">🗑 Remover</button>
      </div>
      <label>Magnitude</label>
      <textarea data-panorama-problema-campo="magnitude" data-problema="${esc(problema.id)}" placeholder="Estimativa aberta, ou dado com fonte — quão grande é isso?">${esc(problema.magnitude)}</textarea>
      <label>Fontes (fatos deste cenário — pelo menos 1)</label>
      <ul class="panorama-problema-fontes">
        ${fatos.length ? fatos.map((f) => `
          <li>
            <label>
              <input type="checkbox" data-panorama-problema-fonte="${esc(problema.id)}" value="${esc(f.id)}" ${(problema.fontes || []).includes(f.id) ? "checked" : ""}>
              ${esc(f.texto || `(fato sem texto) ${f.id}`)}
            </label>
          </li>`).join("") : `<li class="dica">Nenhum fato neste cenário ainda.</li>`}
      </ul>
      ${clusters.length ? `
        <label>Cluster de origem (opcional)</label>
        <select data-panorama-problema-campo="cluster_origem" data-problema="${esc(problema.id)}">
          <option value="">— nenhum —</option>
          ${clusters.map((c) => `<option value="${esc(c.id)}" ${problema.cluster_origem === c.id ? "selected" : ""}>${esc(c.nome || c.id)}</option>`).join("")}
        </select>` : ""}
    </li>`;
}

function htmlProblemasSecao(pan, cenario) {
  const problemas = problemasDoCenario(pan, cenario.id);
  const fatos = fatosDoCenario(pan, cenario.id);
  return `
    <section class="panorama-problemas">
      <h4>Problemas candidatos</h4>
      <p class="dica">
        Cada problema candidato é uma pergunta-problema com magnitude e
        pelo menos 1 fato como fonte — construído sobre o que já foi
        registrado e classificado na CSD acima, não antes dela.
      </p>
      ${!fatos.length ? `<p class="dica">Registrem ao menos 1 fato neste cenário antes de criar um problema candidato.</p>` : ""}
      <ul class="panorama-problemas-lista">${problemas.map((p) => htmlProblema(pan, cenario, p)).join("")}</ul>
      ${fatos.length ? `<button type="button" class="primario" data-panorama-acao="adicionar-problema" data-cenario="${esc(cenario.id)}">+ Problema candidato</button>` : ""}
    </section>`;
}

function htmlCenarioAberto(pan, cenario, rascunhoCenario) {
  if (!cenario) return "";
  const fatos = fatosDoCenario(pan, cenario.id);
  return `
    <section class="panorama-cenario-conteudo">
      <div class="panorama-cenario-cabecalho">
        <div>
          <h3>${esc(cenario.nome)}</h3>
          ${cenario.descricao ? `<p class="dica">${esc(cenario.descricao)}</p>` : ""}
        </div>
        <button type="button" class="link perigo" data-panorama-acao="remover-cenario" data-cenario="${esc(cenario.id)}">Remover cenário</button>
      </div>
      <p class="dica">Primeira pergunta do Panorama (Vuja Dé): qual é a explicação oficial deste problema? Registrem-na como um fato — e questionem se ela é mesmo uma certeza.</p>
      ${htmlExplicacaoCsd()}
      <p class="panorama-contagem">${fatos.length} fato(s) neste cenário.</p>
      <ul class="panorama-fatos">${fatos.map(htmlFato).join("")}</ul>
      <button type="button" class="primario" data-panorama-acao="adicionar-fato" data-cenario="${esc(cenario.id)}">+ Fato</button>
      ${htmlClustersSecao(pan, cenario)}
      ${htmlProblemasSecao(pan, cenario)}
    </section>`;
}

function nomeCenario(pan, cenarioId) {
  return pan.cenarios.find((c) => c.id === cenarioId)?.nome || cenarioId;
}

function htmlApoioTime(squad, cenarioNome) {
  const apoios = apoioAderenciaTime(squad, cenarioNome);
  if (!apoios.length) {
    return `<p class="dica panorama-apoio-time">Nenhuma área de afinidade do Cadastro do Time bate com "${esc(cenarioNome)}" — confira o Cadastro ou dê a nota pelo que o squad já sabe mesmo assim.</p>`;
  }
  return `
    <ul class="panorama-apoio-time">
      ${apoios.map((a) => `<li><strong>${esc(a.membro)}</strong> — ${esc(a.area)} (${esc(a.nivel)})${a.como_agrega ? `: ${esc(a.como_agrega)}` : ""}</li>`).join("")}
    </ul>`;
}

function htmlCriterios(pan) {
  return `
    <section class="panorama-criterios">
      <h4>Critérios do ranqueamento</h4>
      <p class="dica">Pesos são sempre do squad — o agente não escolhe por vocês. Sugestão de partida: ${CRITERIOS_SUGERIDOS.join(", ")}.</p>
      <ul class="panorama-criterios-lista">
        ${pan.criterios_ranqueamento.map((c) => `
          <li data-criterio-id="${esc(c.id)}">
            <input type="text" data-panorama-criterio-campo="nome" data-criterio="${esc(c.id)}" value="${esc(c.nome)}" placeholder="Nome do critério">
            <label>peso <input type="number" min="0" step="0.5" data-panorama-criterio-campo="peso" data-criterio="${esc(c.id)}" value="${esc(c.peso)}" style="width:4.5em"></label>
            <button type="button" class="link perigo" data-panorama-acao="remover-criterio" data-criterio="${esc(c.id)}">×</button>
          </li>`).join("")}
      </ul>
      <div class="linha-acoes">
        <button type="button" data-panorama-acao="adicionar-criterio">+ Critério</button>
        ${!pan.criterios_ranqueamento.length ? CRITERIOS_SUGERIDOS.map((n) => `<button type="button" data-panorama-acao="adicionar-criterio-sugerido" data-nome="${esc(n)}">+ ${esc(n)}</button>`).join("") : ""}
      </div>
    </section>`;
}

function htmlMatrizRanqueamento(pan, squad) {
  const problemas = pan.problemas_candidatos;
  const criterios = pan.criterios_ranqueamento;
  if (!problemas.length) return `<p class="dica">Registrem problemas candidatos em algum cenário antes de ranquear.</p>`;
  if (!criterios.length) return `<p class="dica">Criem ao menos 1 critério acima antes de montar a matriz.</p>`;
  return `
    <div class="panorama-matriz-wrap">
      <table class="panorama-matriz">
        <thead>
          <tr>
            <th>Problema candidato</th>
            ${criterios.map((c) => `<th>${esc(c.nome)}<br><small>peso ${esc(c.peso)}</small></th>`).join("")}
            <th>Total ponderado</th>
            <th>Finalista</th>
          </tr>
        </thead>
        <tbody>
          ${problemas.map((p) => {
            const total = totalPonderado(pan, p.id);
            const ehFinalista = pan.finalista?.problema === p.id;
            return `
            <tr data-problema-id="${esc(p.id)}" class="${ehFinalista ? "panorama-linha-finalista" : ""}">
              <td class="panorama-matriz-problema">
                <strong>${esc((p.pergunta_problema || "(sem pergunta-problema)").slice(0, 90))}${p.pergunta_problema?.length > 90 ? "…" : ""}</strong>
                <br><small>${esc(nomeCenario(pan, p.cenario))}</small>
              </td>
              ${criterios.map((c) => {
                const nota = notaDe(pan, p.id, c.id);
                const ehTime = ehCriterioDeTime(c);
                return `<td class="panorama-matriz-celula">
                  <input type="number" min="0" max="10" step="0.5" style="width:4em" data-panorama-nota data-problema="${esc(p.id)}" data-criterio="${esc(c.id)}" value="${nota ? esc(nota.nota) : ""}" placeholder="–">
                  ${ehTime ? `<details class="panorama-apoio-time-details"><summary>apoio do time</summary>${htmlApoioTime(squad, nomeCenario(pan, p.cenario))}</details>` : ""}
                </td>`;
              }).join("")}
              <td class="panorama-matriz-total">${total ? `${total.total.toFixed(1)} <small>(${total.avaliados}/${total.deCriterios})</small>` : "–"}</td>
              <td class="panorama-matriz-acao">
                <button type="button" class="${ehFinalista ? "" : "primario"}" data-panorama-acao="escolher-finalista" data-problema="${esc(p.id)}">${ehFinalista ? "✓ Finalista" : "Escolher"}</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    <p class="erro" id="panorama-finalista-erro" role="alert"></p>
    ${htmlFinalistaBanner(pan)}`;
}

function htmlFinalistaBanner(pan) {
  if (!pan.finalista) return "";
  const recorte = recorteDoFinalista(pan.finalista);
  const comando = `/visao-sistemica ${recorte}`;
  return `
    <div class="panorama-finalista-banner" role="status">
      <strong>Finalista escolhido:</strong> ${esc(pan.finalista.pergunta_problema)}
      <p>Sessão pronta para o Sistêmico: <code>${esc(recorte)}</code>. Para continuar, abra uma sessão do Claude Code na pasta <code>agente-sistemico/</code> e rode:</p>
      <p class="comando"><code>${esc(comando)}</code></p>
      <p class="dica">Escolher outro finalista troca esta escolha e cria/sobrescreve a sessão correspondente — não apaga uma sessão já em andamento no Sistêmico para o recorte anterior.</p>
    </div>`;
}

function htmlRanqueamentoSecao(pan, squad) {
  return `
    <section class="panorama-ranqueamento">
      <h3>Ranqueamento</h3>
      <p class="dica">
        Compara problemas candidatos de qualquer cenário entre si — é aqui
        que o squad escolhe o finalista. O agente nunca pontua por vocês.
      </p>
      ${htmlCriterios(pan)}
      ${htmlMatrizRanqueamento(pan, squad)}
    </section>`;
}

function htmlAvisos(pan) {
  const lista = avisos(pan);
  if (!lista.length) return "";
  return `
    <div class="panorama-avisos" role="alert">
      <strong>Antes de salvar, repare:</strong>
      <ul>${lista.map((a) => `<li>${esc(a.mensagem)}</li>`).join("")}</ul>
    </div>`;
}

export function htmlPanorama(pan, { cenarioAberto, rascunhoCenario = {}, squad = null } = {}) {
  const aberto = pan.cenarios.find((c) => c.id === cenarioAberto) || pan.cenarios[0] || null;
  return `
    <div class="panorama-tela">
      <button type="button" class="link" id="btn-panorama-fechar">← Fechar e voltar ao quadro</button>
      <h2>Panorama</h2>
      <p class="dica">
        Antes de desenhar qualquer sistema: pesquisem fatos sobre cada
        cenário, sempre com fonte e data — ou marcados como estimativa,
        com a conta aberta — e classifiquem cada um na Matriz CSD. O
        mapa sistêmico só começa depois de escolhido um finalista aqui.
      </p>
      ${htmlListaCenarios(pan.cenarios, aberto?.id)}
      ${htmlFormCenario(rascunhoCenario)}
      ${htmlAvisos(pan)}
      ${htmlCenarioAberto(pan, aberto, rascunhoCenario)}
      ${pan.problemas_candidatos.length ? htmlRanqueamentoSecao(pan, squad) : ""}
    </div>`;
}
