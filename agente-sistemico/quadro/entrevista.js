// Entrevista em rodadas (Bolt 7; decisão 12 do Inception). O agente devolve
// perguntas com opções; o squad responde num formulário; cada resposta
// preenche um campo do mapa; a rodada seguinte parte das respostas; no fim,
// o agente propõe pergunta-problema, fronteira e horizonte, e o squad
// aceita ou edita. Funções puras + HTML; eventos em app.js.

import { adicionarAtor } from "./estado.js";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Rótulos das linhas que as respostas acrescentam à descrição do contexto.
const ROTULO_NA_DESCRICAO = {
  situacao: "Situação",
  comportamento: "Comportamento observado",
  certezas: "O squad sabe com fonte",
  suposicoes: "O squad supõe",
  outro: "Da entrevista",
};

export function novaEntrevista() {
  return { rodadas: [] };
}

export function rodadaAberta(ent) {
  if (ent.encerrada) return null;
  const ultima = ent.rodadas.at(-1);
  return ultima && !ultima.respostas ? ultima : null;
}

// Guarda a rodada que veio na resposta do motor (uma vez por pedido).
export function registrarRodada(ent, resposta) {
  if (resposta.entrevista && !ent.rodadas.some((r) => r.pedido === resposta.pedido)) {
    ent.rodadas.push({
      rodada: resposta.entrevista.rodada,
      pedido: resposta.pedido,
      objetivo: resposta.entrevista.objetivo,
      perguntas: resposta.entrevista.perguntas,
    });
  }
  if (resposta.proposta_contexto) ent.proposta = { ...resposta.proposta_contexto };
  return ent;
}

// Texto único de uma resposta: opções marcadas + o que o squad escreveu.
export function valorDaResposta(r) {
  if (!r || r.pulada) return "";
  return [...(r.opcoes || []), r.texto || ""].map((t) => t.trim()).filter(Boolean).join("; ");
}

export function responderRodada(ent, respostas) {
  const rodada = rodadaAberta(ent);
  if (!rodada) throw new Error("Não há rodada aberta.");
  const semNada = rodada.perguntas.filter((p) => {
    const r = respostas.find((x) => x.pergunta === p.id);
    return !r || (!r.pulada && !valorDaResposta(r));
  });
  if (semNada.length) {
    throw new Error(`Responda ou marque "ainda não sabemos" em: ${semNada.map((p) => p.pergunta).join(" / ")}`);
  }
  rodada.respostas = respostas;
  return rodada;
}

function acrescentarNaDescricao(mapa, rotulo, valor) {
  const linha = `${rotulo}: ${valor}`;
  const atual = mapa.contexto.descricao || "";
  if (atual.split("\n").includes(linha)) return false;
  mapa.contexto.descricao = atual ? `${atual}\n${linha}` : linha;
  return true;
}

// "Ciclistas; motoristas, prefeitura" → ["Ciclistas", "motoristas", "prefeitura"]
function separarNomes(valor) {
  return valor.split(/[;,]/).map((t) => t.trim()).filter(Boolean);
}

function garantirAtor(mapa, nome, papel) {
  const existente = mapa.atores.find((a) => a.nome.toLowerCase() === nome.toLowerCase());
  if (existente) {
    if (!existente.papeis.includes(papel)) existente.papeis = [...existente.papeis.filter((p) => p !== "outro"), papel];
    return null;
  }
  return adicionarAtor(mapa, { nome, papeis: [papel] });
}

// Aplica as respostas de uma rodada ao mapa e devolve o que mudou.
export function aplicarRespostas(mapa, rodada) {
  const mudancas = [];
  for (const p of rodada.perguntas) {
    const valor = valorDaResposta(rodada.respostas?.find((r) => r.pergunta === p.id));
    if (!valor) continue;
    if (p.campo === "horizonte_tempo" || p.campo === "fronteira") {
      mapa.contexto[p.campo] = valor;
      mudancas.push(`${p.campo === "fronteira" ? "Fronteira" : "Horizonte de tempo"}: ${valor}`);
    } else if (p.campo === "pergunta_problema" && valor.trim().endsWith("?")) {
      mapa.contexto.pergunta_problema = valor;
      mudancas.push(`Pergunta-problema: ${valor}`);
    } else if (p.campo === "afetados" || p.campo === "decisores") {
      const papel = p.campo === "afetados" ? "sofre" : "decide";
      for (const nome of separarNomes(valor)) {
        const novo = garantirAtor(mapa, nome, papel);
        mudancas.push(novo ? `Ator novo: ${nome} (${papel})` : `Ator ${nome} agora também ${papel}`);
      }
    } else {
      const rotulo = ROTULO_NA_DESCRICAO[p.campo] || ROTULO_NA_DESCRICAO.outro;
      if (acrescentarNaDescricao(mapa, rotulo, valor)) mudancas.push(`${rotulo}: ${valor}`);
    }
  }
  return mudancas;
}

// O squad aceita a proposta (possivelmente editada): entra no contexto.
export function aceitarProposta(mapa, ent, campos) {
  for (const campo of ["pergunta_problema", "fronteira", "horizonte_tempo"]) {
    const valor = (campos[campo] || "").trim();
    if (valor) mapa.contexto[campo] = valor;
  }
  ent.encerrada = true;
}

// O que vai no pedido (o contrato não conhece os rascunhos do quadro).
export function entrevistaParaPedido(ent) {
  if (!ent.rodadas.length) return null;
  const doc = {
    rodadas: ent.rodadas.map((r) => {
      const rodada = { rodada: r.rodada, pedido: r.pedido, objetivo: r.objetivo, perguntas: r.perguntas };
      if (r.respostas) rodada.respostas = r.respostas;
      return rodada;
    }),
  };
  if (ent.encerrada) doc.encerrada = true;
  return doc;
}

function htmlPergunta(p, rascunho = {}) {
  const tipo = p.multipla ? "checkbox" : "radio";
  const marcadas = new Set(rascunho.opcoes || []);
  return `
    <fieldset class="pergunta-entrevista" data-pergunta="${esc(p.id)}">
      <legend>${esc(p.pergunta)}</legend>
      ${p.ajuda ? `<p class="dica">${esc(p.ajuda)}</p>` : ""}
      ${(p.opcoes || []).length ? `<div class="opcoes-entrevista">${p.opcoes.map((o) => `
        <label><input type="${tipo}" name="ent-${esc(p.id)}" value="${esc(o)}" ${marcadas.has(o) ? "checked" : ""}> ${esc(o)}</label>`).join("")}</div>` : ""}
      <textarea data-livre="${esc(p.id)}" placeholder="${(p.opcoes || []).length ? "Outra resposta ou complemento" : "Resposta do time"}">${esc(rascunho.texto)}</textarea>
      <label class="pular"><input type="checkbox" data-pular="${esc(p.id)}" ${rascunho.pulada ? "checked" : ""}> Ainda não sabemos</label>
    </fieldset>`;
}

export function htmlEntrevista(ent, rascunhos = {}, { aguardando = false, ultimasMudancas = [] } = {}) {
  if (ent.encerrada) return "";
  const aberta = rodadaAberta(ent);
  const respondidas = ent.rodadas.filter((r) => r.respostas).length;
  let corpo = "";
  if (aberta && !aguardando) {
    corpo = `
      <p class="dica">${esc(aberta.objetivo)}</p>
      <form id="form-entrevista">
        ${aberta.perguntas.map((p) => htmlPergunta(p, rascunhos[p.id])).join("")}
        <p class="erro" id="entrevista-erro" role="alert"></p>
        <div class="linha-acoes">
          <button type="submit" class="primario">Enviar respostas ao agente</button>
        </div>
      </form>`;
  } else if (ent.proposta && !aguardando) {
    const pr = ent.proposta;
    corpo = `
      <p class="dica">Com o que vocês responderam, o agente propõe o recorte abaixo. Editem à vontade antes de usar.</p>
      ${pr.justificativa ? `<p class="dica">${esc(pr.justificativa)}</p>` : ""}
      <label for="prop-pergunta">Pergunta-problema</label>
      <textarea id="prop-pergunta" data-proposta="pergunta_problema">${esc(pr.pergunta_problema)}</textarea>
      <label for="prop-fronteira">Fronteira</label>
      <textarea id="prop-fronteira" data-proposta="fronteira">${esc(pr.fronteira)}</textarea>
      <label for="prop-horizonte">Horizonte de tempo</label>
      <input type="text" id="prop-horizonte" data-proposta="horizonte_tempo" value="${esc(pr.horizonte_tempo)}">
      <div class="linha-acoes">
        <button type="button" class="primario" id="btn-usar-proposta">Usar no mapa</button>
        <button type="button" id="btn-outra-rodada">Pedir mais uma rodada</button>
      </div>`;
  }
  if (!corpo && !ultimasMudancas.length) return "";
  return `
    <section class="entrevista">
      <h3>Entrevista${aberta ? ` · rodada ${aberta.rodada}` : ""}${respondidas ? ` <span class="contagem">${respondidas} respondida(s)</span>` : ""}</h3>
      ${ultimasMudancas.length ? `<div class="mudancas"><p class="dica">As respostas entraram no mapa:</p><ul>${ultimasMudancas.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>` : ""}
      ${corpo}
      ${corpo ? `<button type="button" class="link" id="btn-pular-entrevista">Encerrar a entrevista e seguir sem ela</button>` : ""}
    </section>`;
}
