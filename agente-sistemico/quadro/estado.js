// Operações sobre o `mapa` (modelo-dados/hackos.schema.json), sem interface.
// Todas mutam o mapa recebido; o quadro tira um snapshot antes de cada
// operação para o "desfazer".

export function novoMapa() {
  return {
    versao: 1,
    recorte: "rec_novo",
    contexto: { tema: "", pergunta_problema: "" },
    atores: [],
    variaveis: [],
    setas: [],
    loops_anotados: [],
    analise: {},
    alavancas: [],
  };
}

// Garante os campos obrigatórios ao abrir um arquivo antigo ou incompleto.
export function normalizar(dado) {
  const base = novoMapa();
  const mapa = { ...base, ...dado };
  mapa.contexto = { ...base.contexto, ...(dado.contexto || {}) };
  for (const lista of ["atores", "variaveis", "setas", "loops_anotados", "alavancas"]) {
    if (!Array.isArray(mapa[lista])) mapa[lista] = [];
  }
  if (!mapa.analise || typeof mapa.analise !== "object") mapa.analise = {};
  return mapa;
}

export function proximoId(mapa, prefixo, largura = 0) {
  const usados = new Set([
    ...mapa.atores, ...mapa.variaveis, ...mapa.setas, ...mapa.alavancas,
  ].map((x) => x.id));
  let maior = 0;
  for (const id of usados) {
    const m = id.match(new RegExp(`^${prefixo}_(\\d+)$`));
    if (m) maior = Math.max(maior, Number(m[1]));
  }
  let n = maior + 1;
  let id;
  do {
    id = `${prefixo}_${String(n).padStart(largura, "0")}`;
    n += 1;
  } while (usados.has(id));
  return id;
}

export function adicionarVariavel(mapa, { nome, posicao, autor, tipo = "neutra" }) {
  const variavel = {
    id: proximoId(mapa, "var"),
    nome: nome.trim(),
    tipo,
    atores: [],
    status: "aceita",
    autor,
    posicao: { x: Math.round(posicao.x), y: Math.round(posicao.y) },
  };
  mapa.variaveis.push(variavel);
  return variavel;
}

export function adicionarSeta(mapa, { de, para, autor, polaridade = "+" }) {
  if (de === para) throw new Error("Uma variável não pode ligar a ela mesma.");
  const ids = new Set(mapa.variaveis.map((v) => v.id));
  if (!ids.has(de) || !ids.has(para)) throw new Error("A seta precisa ligar duas variáveis do mapa.");
  const seta = {
    id: proximoId(mapa, "seta", 2),
    de,
    para,
    polaridade,
    atraso: false,
    mecanismo: "",
    classificacao: "suposicao",
    status: "aceita",
    autor,
  };
  mapa.setas.push(seta);
  return seta;
}

export function adicionarAtor(mapa, { nome, papeis }) {
  const ator = { id: proximoId(mapa, "ator"), nome: nome.trim(), papeis: papeis.length ? papeis : ["outro"] };
  mapa.atores.push(ator);
  return ator;
}

export function moverVariavel(mapa, id, posicao) {
  const v = mapa.variaveis.find((x) => x.id === id);
  if (v) v.posicao = { x: Math.round(posicao.x), y: Math.round(posicao.y) };
}

// Atualiza campos de uma variável ou seta. Campos vazios opcionais saem do
// objeto, para o arquivo continuar passando no schema.
const OPCIONAIS = new Set(["atraso_descricao", "fonte", "csd_item", "motivo_recusa"]);

export function atualizar(mapa, id, campos) {
  const item = [...mapa.variaveis, ...mapa.setas, ...mapa.atores].find((x) => x.id === id);
  if (!item) return;
  for (const [campo, valor] of Object.entries(campos)) {
    if (OPCIONAIS.has(campo) && (valor === "" || valor == null)) delete item[campo];
    else item[campo] = valor;
  }
  if (item.atraso === false) delete item.atraso_descricao;
  if (item.classificacao === "suposicao") delete item.fonte;
}

// Remove e limpa tudo que apontava para o que saiu: setas das variáveis,
// loops anotados e alavancas que citavam setas removidas, análise.
export function remover(mapa, id) {
  const setasRemovidas = new Set();
  if (mapa.variaveis.some((v) => v.id === id)) {
    mapa.variaveis = mapa.variaveis.filter((v) => v.id !== id);
    for (const s of mapa.setas) if (s.de === id || s.para === id) setasRemovidas.add(s.id);
  } else if (mapa.setas.some((s) => s.id === id)) {
    setasRemovidas.add(id);
  } else if (mapa.atores.some((a) => a.id === id)) {
    mapa.atores = mapa.atores.filter((a) => a.id !== id);
    for (const v of mapa.variaveis) v.atores = (v.atores || []).filter((a) => a !== id);
    return;
  } else {
    return;
  }
  mapa.setas = mapa.setas.filter((s) => !setasRemovidas.has(s.id));
  mapa.loops_anotados = mapa.loops_anotados.filter((l) => !l.setas.some((s) => setasRemovidas.has(s)));

  const existe = new Set([...mapa.variaveis.map((v) => v.id), ...mapa.setas.map((s) => s.id)]);
  // Alavanca sobre um loop perde o sentido se qualquer seta do loop sai;
  // sobre variáveis ou setas, só perde as referências removidas.
  mapa.alavancas = mapa.alavancas
    .filter((a) => a.alvo.tipo !== "loop" || a.alvo.refs.every((r) => existe.has(r)))
    .map((a) => ({ ...a, alvo: { ...a.alvo, refs: a.alvo.refs.filter((r) => existe.has(r)) } }))
    .filter((a) => a.alvo.refs.length > 0);
  const analise = mapa.analise;
  if (analise.loop_principal?.some((s) => !existe.has(s))) delete analise.loop_principal;
  if (analise.comportamento_no_tempo && !existe.has(analise.comportamento_no_tempo.variavel)) {
    delete analise.comportamento_no_tempo;
  }
}

// ---------- loops anotados, análise (bloco 3) e alavancas (bloco 4) ----------

export const chaveLoop = (setas) => [...setas].sort().join("|");

// Cria ou atualiza a anotação do loop identificado pelo conjunto de setas.
export function anotarLoop(mapa, setas, campos) {
  const chave = chaveLoop(setas);
  let anotacao = mapa.loops_anotados.find((l) => chaveLoop(l.setas) === chave);
  if (!anotacao) {
    anotacao = { setas: [...setas], nome: "" };
    mapa.loops_anotados.push(anotacao);
  }
  for (const [campo, valor] of Object.entries(campos)) {
    const texto = typeof valor === "string" ? valor : "";
    if (campo !== "nome" && !texto.trim()) delete anotacao[campo];
    else anotacao[campo] = texto;
  }
  return anotacao;
}

export function removerAnotacao(mapa, setas) {
  const chave = chaveLoop(setas);
  mapa.loops_anotados = mapa.loops_anotados.filter((l) => chaveLoop(l.setas) !== chave);
}

// Campos vazios saem do objeto; cynefin e comportamento_no_tempo são objetos.
export function atualizarAnalise(mapa, campos) {
  const a = mapa.analise;
  for (const [campo, valor] of Object.entries(campos)) {
    if (campo === "cynefin") {
      const atual = { ...(a.cynefin || {}), ...valor };
      if (!atual.dominio) delete a.cynefin;
      else a.cynefin = { dominio: atual.dominio, justificativa: atual.justificativa || "" };
    } else if (campo === "comportamento_no_tempo") {
      const atual = { ...(a.comportamento_no_tempo || {}), ...valor };
      if (!atual.variavel) delete a.comportamento_no_tempo;
      else a.comportamento_no_tempo = { variavel: atual.variavel, descricao: atual.descricao || "" };
    } else if (campo === "loop_principal") {
      if (Array.isArray(valor) && valor.length) a.loop_principal = [...valor];
      else delete a.loop_principal;
    } else if (typeof valor === "string" && valor.trim()) {
      a[campo] = valor;
    } else {
      delete a[campo];
    }
  }
}

export function adicionarAlavanca(mapa, { alvo, nivel_meadows, impacto_esperado, teste_sanidade, autor }) {
  const faltando = [];
  if (!alvo?.refs?.length) faltando.push("onde intervir");
  if (!nivel_meadows) faltando.push("nível de Meadows");
  if (!impacto_esperado?.trim()) faltando.push("impacto esperado");
  if (!teste_sanidade?.trim()) faltando.push("teste de sanidade");
  if (faltando.length) throw new Error(`Falta: ${faltando.join(", ")}.`);
  const alavanca = {
    id: proximoId(mapa, "alv", 2),
    alvo: { tipo: alvo.tipo, refs: [...alvo.refs] },
    nivel_meadows,
    impacto_esperado: impacto_esperado.trim(),
    teste_sanidade: teste_sanidade.trim(),
    autor,
  };
  mapa.alavancas.push(alavanca);
  return alavanca;
}

export function removerAlavanca(mapa, id) {
  mapa.alavancas = mapa.alavancas.filter((a) => a.id !== id);
}

// ---------- sugestões do agente aceitas pelo squad (Bolt 5) ----------
// A sugestão só entra no mapa quando o squad aceita. O autor fica "agente",
// para o mapa guardar de onde a ideia veio; o status "aceita" registra a
// decisão do squad. Nasce como suposição: ninguém verificou ainda.

export function setaJaExiste(mapa, { de, para, polaridade }) {
  return mapa.setas.some((s) => s.de === de && s.para === para && s.polaridade === polaridade && s.status !== "recusada");
}

export function aceitarConexao(mapa, proposta) {
  if (setaJaExiste(mapa, proposta)) throw new Error("Essa seta já está no mapa.");
  const seta = adicionarSeta(mapa, { de: proposta.de, para: proposta.para, autor: "agente", polaridade: proposta.polaridade });
  atualizar(mapa, seta.id, { mecanismo: proposta.mecanismo, atraso: !!proposta.atraso });
  return seta;
}

export function aceitarVariavel(mapa, proposta, posicao) {
  return adicionarVariavel(mapa, { nome: proposta.nome, tipo: proposta.tipo, posicao, autor: "agente" });
}

// ---------- estacionamento (parking lot do Lean Inception) ----------

export function novoEstacionamento() {
  return { itens: [] };
}

export function estacionar(est, { texto, autor, etapa_origem = "mapa_sistemico", retomar_em = "ideacao", agora }) {
  const limpo = (texto || "").trim();
  if (!limpo) throw new Error("Escreva a ideia antes de estacionar.");
  if (est.itens.some((i) => i.texto.trim().toLowerCase() === limpo.toLowerCase())) {
    throw new Error("Essa ideia já está no estacionamento.");
  }
  let n = est.itens.length + 1;
  while (est.itens.some((i) => i.id === `est_${String(n).padStart(2, "0")}`)) n += 1;
  const item = {
    id: `est_${String(n).padStart(2, "0")}`,
    texto: limpo,
    autor,
    etapa_origem,
    retomar_em,
    criado_em: agora,
    status: "estacionada",
  };
  est.itens.push(item);
  return item;
}

export function mudarStatusIdeia(est, id, status) {
  const item = est.itens.find((i) => i.id === id);
  if (item) item.status = status;
}

// O que ainda impede o arquivo de passar no schema. O quadro deixa salvar
// rascunhos, mas avisa.
export function pendencias(mapa) {
  const lista = [];
  if (!mapa.contexto.tema.trim()) lista.push("Falta o tema (aba Contexto).");
  if (!mapa.contexto.pergunta_problema.trim()) lista.push("Falta a pergunta-problema (aba Contexto).");
  for (const v of mapa.variaveis) if (!v.nome.trim()) lista.push(`Variável ${v.id} sem nome.`);
  for (const s of mapa.setas) {
    const nome = (id) => mapa.variaveis.find((v) => v.id === id)?.nome || id;
    if (!s.mecanismo.trim()) lista.push(`Seta "${nome(s.de)} → ${nome(s.para)}" sem mecanismo.`);
    if (s.classificacao === "certeza" && !s.fonte) lista.push(`Seta "${nome(s.de)} → ${nome(s.para)}" marcada como certeza, sem fonte.`);
  }
  for (const l of mapa.loops_anotados) if (!l.nome.trim()) lista.push("Há um loop anotado sem nome (painel Análise).");
  if (mapa.analise.cynefin && !mapa.analise.cynefin.justificativa.trim()) lista.push("Falta justificar a classificação Cynefin (painel Análise).");
  if (mapa.analise.comportamento_no_tempo && !mapa.analise.comportamento_no_tempo.descricao.trim()) {
    lista.push("Falta descrever o comportamento ao longo do tempo (painel Análise).");
  }
  return lista;
}
