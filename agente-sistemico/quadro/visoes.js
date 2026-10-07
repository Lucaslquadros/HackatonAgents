// Aba "Visões" do quadro: monta o pedido ao motor do agente (Bolt 4),
// guarda as visões recebidas, prevê o efeito de aceitar uma conexão e
// desenha o painel com o estacionamento (Bolt 5). Funções puras + HTML;
// a rede e os eventos ficam em app.js.

import { validarMapa } from "./validador.js";
import { setaJaExiste, ehIdTemporario } from "./estado.js";

export const LIMITE_VISOES = 3;

export const TIPOS_VISAO = {
  conexao_sugerida: "Conexão sugerida",
  visao_ausente: "Visão ausente",
  validacao_relacao: "Validação de relação",
  intervencao_programada: "Pergunta do facilitador",
  alavanca: "Alavanca",
  hipotese: "Hipótese",
  estacionar: "Estacionar ideia",
  cobertura_ritual: "Visão do time",
  rascunho_mapa: "Rascunho de mapa",
};

const ETAPAS_RETOMADA = [
  ["ideacao", "Ideação"], ["framing", "Framing"], ["decidir", "Decidir"],
  ["validacao", "Validação"], ["construir", "Construir"],
];

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function idPedido(agora = new Date()) {
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return `ped_${agora.getFullYear()}${p(agora.getMonth() + 1)}${p(agora.getDate())}-${p(agora.getHours())}${p(agora.getMinutes())}${p(agora.getSeconds())}`;
}

// ISO 8601 com o fuso local (o schema exige date-time com fuso).
export function dataHoraLocal(agora = new Date()) {
  const p = (n) => String(Math.abs(n)).padStart(2, "0");
  const fuso = -agora.getTimezoneOffset();
  const sinal = fuso >= 0 ? "+" : "-";
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}T${p(agora.getHours())}:${p(agora.getMinutes())}:${p(agora.getSeconds())}${sinal}${p(Math.trunc(fuso / 60))}:${p(fuso % 60)}`;
}

// O quadro guarda campos de texto vazios enquanto o squad edita; o contrato
// não aceita texto vazio, então eles não vão no pedido.
function semCamposVazios(mapa) {
  const contexto = Object.fromEntries(Object.entries(mapa.contexto).filter(([, v]) => typeof v !== "string" || v.trim()));
  return { ...mapa, contexto };
}

// A visão como o contrato espera (sem os campos internos do quadro).
// `mapaTemp` e `decisoesSetas` só existem no quadro: guardam, por rascunho,
// que id_temp já virou variável de verdade e o que o squad decidiu de cada
// seta (Bolt 7b).
function paraContrato(v) {
  const { pedido, chave, mapaTemp, decisoesSetas, ...resto } = v;
  return resto;
}

export function montarPedido(mapa, validacao, visoes, { gatilho = "pedido", agora = new Date(), limite = LIMITE_VISOES, estacionamento, entrevista, csd, ritual } = {}) {
  const pedido = {
    versao: 1,
    id: idPedido(agora),
    criado_em: dataHoraLocal(agora),
    gatilho,
    mapa: semCamposVazios(mapa),
    validacao: { loops: validacao.loops, problemas: validacao.problemas },
    visoes_abertas: visoes.filter((v) => v.status === "aberta").map(paraContrato),
    limite_visoes: limite,
  };
  if (estacionamento?.itens?.length) pedido.estacionamento = estacionamento;
  if (entrevista?.rodadas?.length) pedido.entrevista = entrevista;
  // csd é irmã do mapa no contrato (hackos.schema.json), não filha dele —
  // por isso entra aqui a partir do estado do quadro, não de `mapa`.
  if (csd?.itens?.length) pedido.csd = csd;
  // ritual só vai ao motor depois de encerrado (Bolt 9) — mandar um ritual
  // ainda em reflexão individual não serve a nenhum gatilho do contrato.
  if (ritual?.encerrado_em) pedido.ritual = ritual;
  return pedido;
}

// Junta as visões novas às que o quadro já tem. A chave inclui o pedido,
// porque o agente pode reutilizar ids como "vis_01" em rodadas diferentes.
export function mesclarVisoes(atuais, resposta) {
  const existentes = new Set(atuais.map((v) => v.chave));
  const novas = resposta.visoes
    .map((v) => {
      const base = { ...v, pedido: resposta.pedido, chave: `${resposta.pedido}:${v.id}` };
      if (v.tipo === "rascunho_mapa" && v.proposta_rascunho) {
        base.mapaTemp = {};
        base.decisoesSetas = v.proposta_rascunho.setas.map(() => null);
      }
      return base;
    })
    .filter((v) => !existentes.has(v.chave));
  return [...atuais, ...novas];
}

export function mudarStatus(visoes, chave, status, motivo) {
  return visoes.map((v) => {
    if (v.chave !== chave) return v;
    const nova = { ...v, status };
    if (status === "recusada" && motivo) nova.motivo_recusa = motivo;
    else delete nova.motivo_recusa;
    return nova;
  });
}

// Decisões do squad dentro de um rascunho (Bolt 7b): qual id_temp já virou
// variável de verdade, e o que foi decidido de cada seta.
export function atualizarRascunho(visoes, chave, patch) {
  return visoes.map((v) => (v.chave === chave ? { ...v, ...patch } : v));
}

function nomeDe(mapa, id) {
  const v = mapa.variaveis.find((x) => x.id === id);
  if (v) return v.nome;
  const s = mapa.setas.find((x) => x.id === id);
  if (s) return `${nomeDe(mapa, s.de)} → ${nomeDe(mapa, s.para)}`;
  const a = mapa.atores.find((x) => x.id === id);
  if (a) return a.nome;
  return id;
}

// Situação de uma conexão sugerida diante do mapa atual (o mapa pode ter
// mudado desde o pedido).
export function situacaoConexao(mapa, proposta) {
  const ids = new Set(mapa.variaveis.filter((v) => v.status !== "recusada").map((v) => v.id));
  if (!ids.has(proposta.de) || !ids.has(proposta.para)) return "variavel_saiu";
  if (setaJaExiste(mapa, proposta)) return "ja_existe";
  return "pode_aceitar";
}

// Que loops novos a seta fecharia, calculados pelo mesmo validador do painel.
export function preverConexao(mapa, proposta) {
  const ID = "seta_previa";
  const copia = {
    ...mapa,
    setas: [...mapa.setas, { id: ID, de: proposta.de, para: proposta.para, polaridade: proposta.polaridade, atraso: !!proposta.atraso, mecanismo: proposta.mecanismo || "prévia", classificacao: "suposicao", status: "aceita", autor: "agente" }],
  };
  const setas = new Map(copia.setas.map((s) => [s.id, s]));
  return validarMapa(copia).loops
    .filter((l) => l.setas.includes(ID))
    .map((l) => {
      const inicio = l.setas.indexOf(ID);
      const ordem = [...l.setas.slice(inicio), ...l.setas.slice(0, inicio)];
      const caminho = [nomeDe(mapa, proposta.de), ...ordem.map((id) => nomeDe(mapa, setas.get(id).para))];
      return { tipo: l.tipo, negativas: l.negativas, tamanho: l.setas.length, caminho };
    });
}

// ---------- rascunho de CLD proposto pelo agente (Bolt 7b) ----------

// Nome para mostrar: variável real (do mapa), variável do rascunho já
// adicionada (via mapaTemp), ou ainda provisória (pelo nome proposto).
function nomeRascunhoRef(mapa, rascunho, mapaTemp, ref) {
  if (!ehIdTemporario(ref)) return nomeDe(mapa, ref);
  if (mapaTemp[ref]) return nomeDe(mapa, mapaTemp[ref]);
  return rascunho.variaveis.find((v) => v.id_temp === ref)?.nome || ref;
}

// "falta_variavel": uma ponta ainda não foi adicionada ao mapa.
// "ja_existe": as duas pontas já existem e a seta já está no mapa.
// "pode_aceitar": as duas pontas existem e a seta pode entrar.
export function situacaoSetaRascunho(mapa, setaProposta, mapaTemp) {
  const resolver = (ref) => (ehIdTemporario(ref) ? mapaTemp[ref] : ref);
  const de = resolver(setaProposta.de);
  const para = resolver(setaProposta.para);
  if (!de || !para) return "falta_variavel";
  if (setaJaExiste(mapa, { de, para, polaridade: setaProposta.polaridade })) return "ja_existe";
  return "pode_aceitar";
}

function htmlItemVariavelRascunho(v, variavel) {
  const feita = v.mapaTemp?.[variavel.id_temp];
  if (feita) {
    return `<li class="item-rascunho feita">${esc(variavel.nome)} <span class="dica">(${esc(variavel.tipo)}) · adicionada</span></li>`;
  }
  return `<li class="item-rascunho">
    <span>${esc(variavel.nome)} <span class="dica">(${esc(variavel.tipo)})</span></span>
    <button type="button" class="aceitar" data-visao-acao="rascunho_adicionar_var" data-chave="${esc(v.chave)}" data-temp="${esc(variavel.id_temp)}">Adicionar</button>
  </li>`;
}

function htmlItemSetaRascunho(mapa, v, setaProposta, idx) {
  const rascunho = v.proposta_rascunho;
  const mapaTemp = v.mapaTemp || {};
  const decisao = (v.decisoesSetas || [])[idx];
  const rotulo = `${esc(nomeRascunhoRef(mapa, rascunho, mapaTemp, setaProposta.de))} → ${esc(nomeRascunhoRef(mapa, rascunho, mapaTemp, setaProposta.para))} (${setaProposta.polaridade === "-" ? "−" : "+"}${setaProposta.atraso ? ", com atraso" : ""})`;
  if (decisao === "aceita") return `<li class="item-rascunho feita">${rotulo} <span class="dica">· aceita</span></li>`;
  if (decisao === "recusada") return `<li class="item-rascunho recusada">${rotulo} <span class="dica">· recusada</span></li>`;
  const situacao = situacaoSetaRascunho(mapa, setaProposta, mapaTemp);
  const mecanismo = `<p class="dica">${esc(setaProposta.mecanismo)}</p>`;
  if (situacao === "falta_variavel") {
    return `<li class="item-rascunho pendente">${rotulo}${mecanismo}<p class="aviso">Adicione as variáveis desta seta primeiro.</p></li>`;
  }
  if (situacao === "ja_existe") {
    return `<li class="item-rascunho pendente">${rotulo}${mecanismo}<p class="dica">O time já desenhou essa seta.</p></li>`;
  }
  const resolver = (ref) => (ehIdTemporario(ref) ? mapaTemp[ref] : ref);
  const previa = htmlPrevia(mapa, { de: resolver(setaProposta.de), para: resolver(setaProposta.para), polaridade: setaProposta.polaridade, atraso: setaProposta.atraso, mecanismo: setaProposta.mecanismo });
  return `<li class="item-rascunho pendente">
    ${rotulo}${mecanismo}${previa}
    <div class="linha-acoes">
      <button type="button" class="aceitar" data-visao-acao="rascunho_aceitar_seta" data-chave="${esc(v.chave)}" data-idx="${idx}">Aceitar esta seta</button>
      <button type="button" data-visao-acao="rascunho_recusar_seta" data-chave="${esc(v.chave)}" data-idx="${idx}">Recusar</button>
    </div>
  </li>`;
}

function htmlRascunho(mapa, v) {
  const rascunho = v.proposta_rascunho;
  return `<div class="rascunho-mapa">
    <p class="dica">Rascunho proposto pelo agente, tudo suposição. Revise item a item; nada entra no mapa sozinho.</p>
    <ul class="itens-rascunho">${rascunho.variaveis.map((variavel) => htmlItemVariavelRascunho(v, variavel)).join("")}</ul>
    <ul class="itens-rascunho">${rascunho.setas.map((seta, idx) => htmlItemSetaRascunho(mapa, v, seta, idx)).join("")}</ul>
  </div>`;
}

function htmlPrevia(mapa, proposta) {
  const loops = preverConexao(mapa, proposta);
  if (!loops.length) return `<p class="dica">Aceitar não fecha nenhum loop novo.</p>`;
  const mostrar = loops.slice(0, 3);
  return `<p class="dica">Aceitar fecharia ${loops.length} loop(s) novo(s):</p>
    <ul class="previa">${mostrar.map((l) => `<li><span class="selo ${l.tipo}">${l.tipo}</span> ${l.caminho.map(esc).join(" → ")}</li>`).join("")}</ul>
    ${loops.length > mostrar.length ? `<p class="dica">e mais ${loops.length - mostrar.length}.</p>` : ""}`;
}

function botoesStatus(v, { respondida = "Discutimos e respondemos" } = {}) {
  return `<button type="button" data-visao-acao="respondida" data-chave="${esc(v.chave)}">${respondida}</button>
    <button type="button" data-visao-acao="recusada" data-chave="${esc(v.chave)}">Dispensar…</button>`;
}

function acoesAbertas(mapa, v) {
  if (v.tipo === "conexao_sugerida" && v.proposta_seta) {
    const situacao = situacaoConexao(mapa, v.proposta_seta);
    if (situacao === "variavel_saiu") {
      return `<p class="aviso">Uma das variáveis desta seta saiu do mapa.</p><div class="linha-acoes">${botoesStatus(v)}</div>`;
    }
    if (situacao === "ja_existe") {
      return `<p class="dica">O time já desenhou essa seta.</p><div class="linha-acoes">${botoesStatus(v)}</div>`;
    }
    return `${htmlPrevia(mapa, v.proposta_seta)}
      <div class="linha-acoes">
        <button type="button" class="aceitar" data-visao-acao="aceitar_seta" data-chave="${esc(v.chave)}">Aceitar a seta</button>
        <button type="button" data-visao-acao="recusada" data-chave="${esc(v.chave)}">Recusar…</button>
      </div>`;
  }
  if (v.tipo === "rascunho_mapa" && v.proposta_rascunho) {
    return `${htmlRascunho(mapa, v)}<div class="linha-acoes">${botoesStatus(v, { respondida: "Terminei de revisar o rascunho" })}</div>`;
  }
  if (v.tipo === "estacionar" && v.texto_estacionado) {
    return `<div class="linha-acoes">
        <button type="button" class="aceitar" data-visao-acao="estacionar" data-chave="${esc(v.chave)}">Estacionar a ideia</button>
        <button type="button" data-visao-acao="recusada" data-chave="${esc(v.chave)}">Dispensar…</button>
      </div>`;
  }
  if (v.tipo === "hipotese" && v.proposta_csd) {
    return `<div class="linha-acoes">
        <button type="button" class="aceitar" data-visao-acao="aceitar_item_csd" data-chave="${esc(v.chave)}">Aceitar para a CSD</button>
        ${botoesStatus(v)}
      </div>`;
  }
  const extra = v.proposta_variavel
    ? `<button type="button" class="aceitar" data-visao-acao="aceitar_variavel" data-chave="${esc(v.chave)}">Adicionar "${esc(v.proposta_variavel.nome)}"</button>`
    : "";
  return `<div class="linha-acoes">${extra}${botoesStatus(v)}</div>`;
}

const ROTULO_FECHADA = {
  aceita: "Aceita pelo time",
  respondida: "Respondida pelo time",
  recusada: "Dispensada",
};

function htmlRecusa(v) {
  const conexao = v.tipo === "conexao_sugerida";
  return `
    <div class="recusa">
      <label for="motivo-recusa">${conexao ? "Por que recusar esta seta?" : "Por que dispensar esta visão?"}</label>
      <p class="dica">Opcional. O motivo vai junto no próximo pedido e ajuda o agente a não repetir.</p>
      <textarea id="motivo-recusa" placeholder="Ex.: o contexto não mostra essa relação"></textarea>
      <div class="linha-acoes">
        <button type="button" data-visao-acao="confirmar_recusa" data-chave="${esc(v.chave)}">${conexao ? "Recusar" : "Dispensar"}</button>
        <button type="button" class="link" data-visao-acao="cancelar_recusa" data-chave="${esc(v.chave)}">Cancelar</button>
      </div>
    </div>`;
}

function htmlVisao(mapa, v, recusando) {
  const fechada = v.status !== "aberta";
  const proposta = v.proposta_seta;
  return `
    <li class="visao ${v.tipo} ${fechada ? "fechada" : ""}" data-cartao="${esc(v.chave)}">
      <p class="visao-tipo">${esc(TIPOS_VISAO[v.tipo] || v.tipo)}${v.nivel_meadows ? ` · Meadows: ${esc(v.nivel_meadows.replace("_", " "))}` : ""}</p>
      <p>${esc(v.texto)}</p>
      ${proposta ? `<p class="proposta">Seta proposta: <strong>${esc(nomeDe(mapa, proposta.de))}</strong> → <strong>${esc(nomeDe(mapa, proposta.para))}</strong> (${proposta.polaridade === "-" ? "−" : "+"}${proposta.atraso ? ", com atraso" : ""}). ${esc(proposta.mecanismo)}</p>` : ""}
      ${v.proposta_variavel ? `<p class="proposta">Variável proposta: <strong>${esc(v.proposta_variavel.nome)}</strong> (${esc(v.proposta_variavel.tipo)})</p>` : ""}
      ${v.texto_estacionado ? `<p class="proposta">Ideia para o estacionamento: ${esc(v.texto_estacionado)}</p>` : ""}
      ${v.proposta_rascunho ? `<p class="proposta">Rascunho: ${v.proposta_rascunho.variaveis.length} variável(is) nova(s), ${v.proposta_rascunho.setas.length} seta(s) proposta(s).</p>` : ""}
      ${v.proposta_csd ? `<p class="proposta">Item proposto para a CSD: ${esc(v.proposta_csd.texto)}${v.proposta_csd.pergunta_pesquisa ? ` — ${esc(v.proposta_csd.pergunta_pesquisa)}` : ""}</p>` : ""}
      <p class="visao-pergunta">${esc(v.pergunta)}</p>
      ${v.refs.length ? `<p class="refs">${v.refs.map((r) => `<button type="button" class="ref" data-ref="${esc(r)}">${esc(nomeDe(mapa, r))}</button>`).join("")}</p>` : ""}
      <p class="fonte">${esc(v.fonte_teorica.referencia)}${v.fonte_teorica.suplementar ? ` <span class="suplementar">suplementar</span>` : ""}</p>
      ${fechada
        ? `<p class="dica">${ROTULO_FECHADA[v.status] || v.status}${v.motivo_recusa ? `: ${esc(v.motivo_recusa)}` : ""}.
            ${v.status === "aceita" ? "" : `<button type="button" class="link" data-visao-acao="aberta" data-chave="${esc(v.chave)}">Reabrir</button>`}</p>`
        : recusando === v.chave ? htmlRecusa(v) : acoesAbertas(mapa, v)}
    </li>`;
}

function htmlEstacionamento(est) {
  const paradas = est.itens.filter((i) => i.status === "estacionada");
  const outras = est.itens.filter((i) => i.status !== "estacionada");
  const etapa = (id) => ETAPAS_RETOMADA.find(([v]) => v === id)?.[1] || id;
  return `
    <section class="estacionamento">
      <h3>Estacionamento <span class="contagem">${paradas.length}</span></h3>
      <p class="dica">"Ouvi, mas essa conversa é para depois." Ideias de solução ficam aqui até a etapa certa (Lean Inception).</p>
      ${paradas.length ? `<ul class="ideias">${paradas.map((i) => `
        <li class="ideia">
          <p>${esc(i.texto)}</p>
          <p class="dica">Volta na etapa: ${esc(etapa(i.retomar_em))}${i.autor === "agente" ? " · sugerida pelo agente" : ""}</p>
          <div class="linha-acoes">
            <button type="button" data-ideia="${i.id}" data-ideia-status="retomada">Retomar</button>
            <button type="button" data-ideia="${i.id}" data-ideia-status="descartada">Descartar</button>
          </div>
        </li>`).join("")}</ul>` : ""}
      <label for="nova-ideia">Estacionar uma ideia do time</label>
      <textarea id="nova-ideia" placeholder="Ex.: um app de roteirização para os entregadores"></textarea>
      <select id="nova-ideia-etapa" aria-label="Etapa em que a ideia volta">${ETAPAS_RETOMADA.map(([v, r]) => `<option value="${v}">Volta em: ${r}</option>`).join("")}</select>
      <p class="erro" id="ideia-erro" role="alert"></p>
      <div class="linha-acoes"><button type="button" id="btn-estacionar">Estacionar</button></div>
      ${outras.length ? `<details class="ideias-fechadas"><summary>Retomadas e descartadas (${outras.length})</summary>
        <ul class="ideias">${outras.map((i) => `<li class="ideia fechada"><p>${esc(i.texto)}</p><p class="dica">${i.status === "retomada" ? "Retomada" : "Descartada"}.
          <button type="button" class="link" data-ideia="${i.id}" data-ideia-status="estacionada">Estacionar de novo</button></p></li>`).join("")}</ul></details>` : ""}
    </section>`;
}

// `estado.motor`: "sem_servidor" | "pronto" | "aguardando" | "erro"
export function htmlVisoes(mapa, visoes, estado, estacionamento = { itens: [] }, htmlEntrevista = "") {
  const abertas = visoes.filter((v) => v.status === "aberta");
  const fechadas = visoes.filter((v) => v.status !== "aberta");
  let topo;
  if (estado.motor === "sem_servidor") {
    topo = `<p class="aviso">O quadro precisa do servidor local para falar com o agente. Na pasta <code>agente-sistemico</code>, rode <code>python servidor.py</code> e abra o quadro pelo endereço que ele mostrar.</p>`;
  } else if (estado.motor === "aguardando") {
    topo = `
      <div class="aguardando" role="status">
        <p><strong>Pedido enviado.</strong> No Claude Code aberto na pasta <code>agente-sistemico</code>, rode:</p>
        <p class="comando"><code>${esc(estado.comando)}</code> <button type="button" id="btn-copiar">Copiar</button></p>
        <p class="dica">O quadro mostra as visões assim que a resposta chegar. Pode continuar editando: o agente vai olhar o mapa como estava no pedido.</p>
        <button type="button" id="btn-cancelar-pedido" class="link">Cancelar espera</button>
      </div>`;
  } else {
    topo = `
      <button type="button" id="btn-pedir-visao" class="primario">Pedir visão ao agente</button>
      <p class="dica">O agente olha o mapa como está agora e devolve até ${LIMITE_VISOES} visões, sempre como pergunta. Ele diz onde o sistema pode ser alavancado, nunca o que construir.</p>
      ${estado.motor === "erro" ? `<p class="erro" role="alert">${esc(estado.erro)}</p>` : ""}`;
  }
  return `
    <h2>Visões do agente</h2>
    ${topo}
    ${htmlEntrevista}
    ${estado.informacaoInsuficiente ? `<p class="aviso">O agente achou que o mapa ainda tem pouca informação para uma análise; veja a visão abaixo.</p>` : ""}
    ${abertas.length ? `<ul class="visoes">${abertas.map((v) => htmlVisao(mapa, v, estado.recusando)).join("")}</ul>` : `<p class="ok">Nenhuma visão aberta.</p>`}
    ${fechadas.length ? `
      <details class="visoes-fechadas">
        <summary>Aceitas, respondidas e dispensadas (${fechadas.length})</summary>
        <ul class="visoes">${fechadas.map((v) => htmlVisao(mapa, v)).join("")}</ul>
      </details>` : ""}
    ${htmlEstacionamento(estacionamento)}`;
}
