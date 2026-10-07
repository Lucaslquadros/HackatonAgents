// Operações sobre o `squad` (modelo-dados/hackos.schema.json, $defs/squad e
// $defs/membro), sem interface. Mesma separação lógica/DOM do
// agente-sistemico/quadro/estado.js.

const FRENTES = ["dominio_negocio", "construcao", "experiencia_ux", "dados_evidencias", "narrativa"];
const NIVEIS = ["experiencia", "interesse", "nenhum"];

export function novoSquad() {
  return { hackathon: "", membros: [] };
}

// Garante os campos obrigatórios ao carregar um squad.json antigo ou incompleto.
export function normalizar(dado) {
  const base = novoSquad();
  const squad = { ...base, ...dado };
  if (typeof squad.hackathon !== "string") squad.hackathon = "";
  if (!Array.isArray(squad.membros)) squad.membros = [];
  squad.membros = squad.membros.map((m) => ({
    id: m.id,
    nome: m.nome || "",
    frentes: Array.isArray(m.frentes) ? m.frentes.filter((f) => FRENTES.includes(f)) : [],
    areas_afinidade: Array.isArray(m.areas_afinidade)
      ? m.areas_afinidade.map((a) => ({ area: a.area || "", nivel: NIVEIS.includes(a.nivel) ? a.nivel : "interesse", como_agrega: a.como_agrega || "" }))
      : [],
  }));
  return squad;
}

function proximoIdMembro(squad) {
  let maior = 0;
  for (const m of squad.membros) {
    const match = /^mem_(\d+)$/.exec(m.id || "");
    if (match) maior = Math.max(maior, Number(match[1]));
  }
  return `mem_${maior + 1}`;
}

export function adicionarMembro(squad, { nome } = {}) {
  const membro = {
    id: proximoIdMembro(squad),
    nome: (nome || "").trim(),
    frentes: [],
    areas_afinidade: [],
  };
  squad.membros.push(membro);
  return membro;
}

export function removerMembro(squad, id) {
  const indice = squad.membros.findIndex((m) => m.id === id);
  if (indice === -1) throw new Error(`membro inexistente: ${id}`);
  squad.membros.splice(indice, 1);
}

function acharMembro(squad, id) {
  const membro = squad.membros.find((m) => m.id === id);
  if (!membro) throw new Error(`membro inexistente: ${id}`);
  return membro;
}

export function atualizarMembro(squad, id, campos) {
  const membro = acharMembro(squad, id);
  if ("nome" in campos) membro.nome = campos.nome;
  return membro;
}

export function alternarFrente(squad, id, frente, ligada) {
  if (!FRENTES.includes(frente)) throw new Error(`frente inválida: ${frente}`);
  const membro = acharMembro(squad, id);
  const semEla = membro.frentes.filter((f) => f !== frente);
  membro.frentes = ligada ? [...semEla, frente] : semEla;
}

export function adicionarAreaAfinidade(squad, id, { area = "", nivel = "interesse", como_agrega = "" } = {}) {
  if (!NIVEIS.includes(nivel)) throw new Error(`nível inválido: ${nivel}`);
  const membro = acharMembro(squad, id);
  const item = { area, nivel, como_agrega };
  membro.areas_afinidade.push(item);
  return item;
}

export function removerAreaAfinidade(squad, id, indice) {
  const membro = acharMembro(squad, id);
  if (indice < 0 || indice >= membro.areas_afinidade.length) throw new Error(`índice de área inválido: ${indice}`);
  membro.areas_afinidade.splice(indice, 1);
}

export function atualizarAreaAfinidade(squad, id, indice, campos) {
  const membro = acharMembro(squad, id);
  const item = membro.areas_afinidade[indice];
  if (!item) throw new Error(`índice de área inválido: ${indice}`);
  if ("area" in campos) item.area = campos.area;
  if ("nivel" in campos) {
    if (!NIVEIS.includes(campos.nivel)) throw new Error(`nível inválido: ${campos.nivel}`);
    item.nivel = campos.nivel;
  }
  if ("como_agrega" in campos) item.como_agrega = campos.como_agrega;
}

// Monta o objeto pronto para o contrato do schema: tira espaços nas pontas,
// descarta membros/áreas sem os campos obrigatórios preenchidos (em vez de
// mandar string vazia, que violaria minLength) e tira campos opcionais
// vazios (como_agrega, frentes) para não sujar o arquivo.
export function paraContrato(squad) {
  const hackathon = (squad.hackathon || "").trim();
  const membros = squad.membros
    .map((m) => {
      const nome = (m.nome || "").trim();
      const frentes = (m.frentes || []).filter((f) => FRENTES.includes(f));
      const areas = (m.areas_afinidade || [])
        .map((a) => ({ area: (a.area || "").trim(), nivel: a.nivel, como_agrega: (a.como_agrega || "").trim() }))
        .filter((a) => a.area && NIVEIS.includes(a.nivel));
      const membro = { id: m.id, nome };
      if (frentes.length) membro.frentes = frentes;
      if (areas.length) {
        membro.areas_afinidade = areas.map((a) => {
          const item = { area: a.area, nivel: a.nivel };
          if (a.como_agrega) item.como_agrega = a.como_agrega;
          return item;
        });
      }
      return membro;
    })
    .filter((m) => m.nome);
  return { hackathon, membros };
}

export function pendencias(squad) {
  const motivos = [];
  if (!(squad.hackathon || "").trim()) motivos.push("falta o nome do hackathon");
  const comNome = squad.membros.filter((m) => (m.nome || "").trim());
  if (comNome.length === 0) motivos.push("cadastre ao menos 1 integrante com nome");
  return motivos;
}

// Avisos não-bloqueantes: coisas que `paraContrato` vai descartar em
// silêncio ao salvar, mas que o squad deveria ver antes (Bolt 2.1 —
// decisão do Lucas: avisar em vez de só descartar).
export function avisos(squad) {
  const lista = [];
  squad.membros.forEach((m, indicePosicao) => {
    const semNome = !(m.nome || "").trim();
    const rotulo = semNome ? `Integrante ${indicePosicao + 1}` : m.nome.trim();
    if (semNome) {
      lista.push({
        membroId: m.id,
        mensagem: `${rotulo} está sem nome — não vai ser salvo.`,
      });
    }
    (m.areas_afinidade || []).forEach((a, indice) => {
      if (!(a.area || "").trim()) {
        lista.push({
          membroId: m.id,
          indice,
          mensagem: `Área de afinidade sem nome em "${rotulo}" — não vai ser salva.`,
        });
      }
    });
  });
  return lista;
}

// Critério de "cadastro incompleto" para a Visão da equipe (Bolt 2.1).
// Decisão própria, documentada para revisão do Lucas: um integrante é
// "completo" quando tem nome, ao menos 1 frente marcada, e ao menos 1
// área de afinidade com nível diferente de "nenhum" (uma área marcada
// "nenhum" declara falta de afinidade, não conta como cadastro útil pro
// ranqueamento do Panorama). Frentes e afinidade são opcionais no
// schema — isso é um padrão de produto, não uma regra do contrato.
export function completudeMembro(membro) {
  const motivos = [];
  if (!(membro.nome || "").trim()) motivos.push("sem nome");
  if (!(membro.frentes || []).length) motivos.push("sem nenhuma frente marcada");
  const areasUteis = (membro.areas_afinidade || []).filter(
    (a) => (a.area || "").trim() && a.nivel !== "nenhum"
  );
  if (!areasUteis.length) motivos.push("sem área de afinidade com interesse ou experiência");
  return { completo: motivos.length === 0, motivos };
}

// Resumo somente-leitura para a aba "Visão da equipe": por integrante,
// nome/frentes/áreas e se está completo; no topo, se o hackathon foi
// preenchido e se o squad inteiro está pronto.
export function resumoEquipe(squad) {
  const hackathon = (squad.hackathon || "").trim();
  const membros = squad.membros.map((m) => {
    const { completo, motivos } = completudeMembro(m);
    return {
      id: m.id,
      nome: (m.nome || "").trim() || "(sem nome)",
      frentes: m.frentes || [],
      areas_afinidade: m.areas_afinidade || [],
      completo,
      motivos,
    };
  });
  const tudoCompleto = !!hackathon && membros.length > 0 && membros.every((m) => m.completo);
  return { hackathon, membros, tudoCompleto };
}

export { FRENTES, NIVEIS };
