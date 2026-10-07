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

// `extras` deixa gerar ids de uma lista que não mora dentro do mapa (ex.: a
// Matriz CSD, que no contrato é irmã do mapa dentro do pedido, não filha).
export function proximoId(mapa, prefixo, largura = 0, extras = []) {
  const usados = new Set([
    ...mapa.atores, ...mapa.variaveis, ...mapa.setas, ...mapa.alavancas, ...extras,
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

// `csdItens` é a lista de itens da Matriz CSD (vive fora do mapa, ver nota
// no Bolt 8 do BOLTS.md) — só serve aqui para não guardar uma suposição que
// não existe mais.
export function adicionarAlavanca(mapa, { alvo, nivel_meadows, impacto_esperado, teste_sanidade, autor, suposicoes }, csdItens = []) {
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
  const existentes = new Set(csdItens.map((i) => i.id));
  const validas = [...new Set(suposicoes || [])].filter((id) => existentes.has(id));
  if (validas.length) alavanca.suposicoes = validas;
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

// ---------- rascunho de CLD proposto pelo agente (Bolt 7b) ----------
// Mesma garantia do Bolt 5, por item: nada entra no mapa sem o squad
// aceitar. `mapaTemp` liga cada id_temp do rascunho (ainda não existe no
// mapa) à variável real já criada a partir dele.

export function ehIdTemporario(ref) {
  return ref.startsWith("tmp_");
}

export function aceitarSetaRascunho(mapa, proposta, mapaTemp) {
  const resolver = (ref) => (ehIdTemporario(ref) ? mapaTemp[ref] : ref);
  const de = resolver(proposta.de);
  const para = resolver(proposta.para);
  if (!de || !para) throw new Error("Adicione as variáveis desta seta antes de aceitá-la.");
  return aceitarConexao(mapa, { de, para, polaridade: proposta.polaridade, atraso: proposta.atraso, mecanismo: proposta.mecanismo });
}

// ---------- Matriz CSD (Bolt 8) ----------
// No contrato (hackos.schema.json), `csd` é irmã do `mapa` dentro do
// pedido/resposta, não um campo do mapa — por isso essas funções recebem um
// `csd` (`{ itens: [] }`) à parte, do mesmo jeito que `estacionar()` recebe
// o `estacionamento`. O agente só propõe ("proposto"); quem confirma ou
// descarta é o squad. Duas origens de proposta: uma seta marcada como
// suposição pelo próprio squad no quadro (proporSetaParaCsd), ou uma visão
// `hipotese` do agente (aceitarItemCsd, que só registra o item pronto que
// já veio na resposta).

export function novoCsd() {
  return { itens: [] };
}

export function proporItemCsd(csd, mapa, { tipo, texto, autor, origem, pergunta_pesquisa, tarefa_discovery, agora }) {
  const limpo = (texto || "").trim();
  if (!limpo) throw new Error("Escreva o texto do item antes de propor.");
  if (tipo === "suposicao" && !pergunta_pesquisa?.trim()) throw new Error("Toda suposição precisa de uma pergunta de pesquisa.");
  if (tipo === "duvida" && !tarefa_discovery?.trim()) throw new Error("Toda dúvida precisa de uma tarefa de discovery.");
  const item = {
    id: proximoId(mapa, "csd", 2, csd.itens),
    tipo,
    texto: limpo,
    autor,
    criado_em: agora,
    status: "proposto",
    origem,
    evidencias: [],
  };
  if (pergunta_pesquisa?.trim()) item.pergunta_pesquisa = pergunta_pesquisa.trim();
  if (tarefa_discovery?.trim()) item.tarefa_discovery = tarefa_discovery.trim();
  csd.itens.push(item);
  return item;
}

// Uma seta já é, em si, uma suposição não verificada (classificacao
// "suposicao"); propor para a CSD é só dar a ela o tratamento de evidência
// que a aba CSD exige: pergunta de pesquisa e um status que o squad decide.
export function proporSetaParaCsd(csd, mapa, setaId, { pergunta_pesquisa, autor, agora }) {
  const seta = mapa.setas.find((s) => s.id === setaId);
  if (!seta) throw new Error("Seta não encontrada.");
  if (seta.classificacao !== "suposicao") throw new Error("Só setas marcadas como suposição podem virar item da CSD.");
  if (seta.csd_item) throw new Error("Essa seta já está na Matriz CSD.");
  const nome = (id) => mapa.variaveis.find((v) => v.id === id)?.nome || id;
  const texto = `${nome(seta.de)} → ${nome(seta.para)}: ${seta.mecanismo || "(sem mecanismo ainda)"}`;
  const item = proporItemCsd(csd, mapa, {
    tipo: "suposicao", texto, autor, pergunta_pesquisa, agora,
    origem: { etapa: "mapa_sistemico", ref: setaId },
  });
  seta.csd_item = item.id;
  return item;
}

// Visão `hipotese` do agente: o item já vem pronto em `proposta_csd`
// (id, criado_em e status "proposto" definidos pelo próprio agente); aceitar
// só registra na CSD, sem recriar nada.
export function aceitarItemCsd(csd, propostaCsd) {
  if (csd.itens.some((i) => i.id === propostaCsd.id)) throw new Error("Esse item já está na Matriz CSD.");
  const item = { ...propostaCsd };
  csd.itens.push(item);
  return item;
}

export function mudarStatusItemCsd(csd, id, status) {
  const item = csd.itens.find((i) => i.id === id);
  if (item) item.status = status;
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
