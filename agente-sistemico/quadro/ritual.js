// Ritual do fundo do U (Bolt 9; FLUXO-PEDAGOGICO.md 5.1): presencing como um
// dispositivo com etapas, não uma sugestão. Painel de visões fica oculto
// enquanto o ritual está aberto; cada membro escreve sozinho ("ocultar e
// passar"); a revelação liga cada reflexão a um elemento do mapa, mostra
// cobertura por membro, registra divergências e manda perguntas para a
// Matriz CSD. Mecânico — sem chamar o subagente/LLM. Funções puras + HTML;
// rede e eventos ficam em app.js.

import { proporItemCsd } from "./estado.js";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const PERGUNTAS_SUGERIDAS = [
  "O que te surpreendeu neste mapa?",
  "O que quer emergir aqui?",
  "O que você está percebendo que ainda não foi dito?",
];

// Mesmas frases do guard de linguagem de solução do validador do motor
// (modelo-dados/validar_resposta.py, LINGUAGEM_DE_SOLUCAO), adaptadas para
// o que o squad digita no ritual (sem acento normalizado: o squad escreve
// livre, o agente não).
const PARECE_SOLUCAO = [
  /\b(fazer|criar|construir|desenvolver|lan[çc]ar|implementar)\s+(um|uma)\s+(app|aplicativo|plataforma|chatbot|dashboard|painel|site|sistema|bot|ferramenta)\b/i,
  /\ba solu[çc][ãa]o (seria|[ée])\b/i,
  /\buma boa solu[çc][ãa]o\b/i,
  /\bdeveríamos (criar|construir|desenvolver|fazer|lançar)\b/i,
];

export function pareceSolucao(texto) {
  return PARECE_SOLUCAO.some((r) => r.test(texto));
}

// ---------- ciclo de vida do ritual ----------

export function abrirRitual(mapa, { pergunta_generativa, duracao_min, agora }) {
  const pergunta = (pergunta_generativa || "").trim();
  if (!pergunta) throw new Error("Escreva a pergunta generativa antes de abrir o ritual.");
  if (/\bsolu[çc][ãa]o\b/i.test(pergunta)) throw new Error('A pergunta generativa não pode perguntar "qual é a solução?" — pergunte o que surpreendeu ou o que quer emergir.');
  const minutos = Number(duracao_min);
  if (!(minutos >= 3 && minutos <= 15)) throw new Error("A duração precisa ser entre 3 e 15 minutos.");
  return {
    id: "rit_01",
    recorte: mapa.recorte,
    pergunta_generativa: pergunta,
    duracao_min: minutos,
    aberto_em: agora,
    reflexoes: [],
  };
}

function proximoIdReflexao(rit) {
  let n = rit.reflexoes.length + 1;
  while (rit.reflexoes.some((r) => r.id === `ref_${String(n).padStart(2, "0")}`)) n += 1;
  return `ref_${String(n).padStart(2, "0")}`;
}

// Cada membro escreve sozinho; "ocultar e passar" é responsabilidade do
// app.js (esconder o formulário depois de enviar) — aqui só a regra: nunca
// aceitar algo que pareça proposta de solução.
export function enviarReflexao(rit, { autor, tipo, texto, agora }) {
  if (rit.encerrado_em) throw new Error("A reflexão individual já foi encerrada.");
  const limpo = (texto || "").trim();
  if (!limpo) throw new Error("Escreva a percepção ou pergunta antes de enviar.");
  if (pareceSolucao(limpo)) {
    throw new Error('Isso parece uma proposta de solução. Reescreva como percepção ("notei que…") ou pergunta ("por que…?").');
  }
  const reflexao = { id: proximoIdReflexao(rit), autor: (autor || "mem_squad").trim(), tipo, texto: limpo, criado_em: agora };
  rit.reflexoes.push(reflexao);
  return reflexao;
}

export function encerrarReflexoes(rit, { seguiuSem = [], agora }) {
  if (!rit.reflexoes.length) throw new Error("Ninguém enviou uma reflexão ainda.");
  if (rit.encerrado_em) throw new Error("A reflexão já foi encerrada.");
  rit.encerrado_em = agora;
  const ids = [...new Set((seguiuSem || []).map((s) => s.trim()).filter(Boolean))];
  if (ids.length) rit.seguiu_sem = ids;
}

// ---------- revelação e integração (passo 4) ----------

// "elementos" já vem expandido para ids reais (um loop vira as setas dele —
// ver montarOpcoesElementos/app.js, porque o contrato só aceita ids com
// prefixo var_/seta_/ator_, não a chave composta de um loop).
export function ligarAoMapa(rit, reflexaoId, elementos) {
  if (!rit.reflexoes.some((r) => r.id === reflexaoId)) throw new Error("Reflexão não encontrada.");
  if (!rit.integracao) rit.integracao = {};
  if (!rit.integracao.cobertura) rit.integracao.cobertura = [];
  let c = rit.integracao.cobertura.find((x) => x.reflexao === reflexaoId);
  if (!c) {
    c = { reflexao: reflexaoId, presente_no_mapa: false };
    rit.integracao.cobertura.push(c);
  }
  const limpos = [...new Set(elementos || [])];
  c.presente_no_mapa = limpos.length > 0;
  if (limpos.length) c.elementos = limpos;
  else delete c.elementos;
  return c;
}

export function registrarDivergencia(rit, reflexoesIds, descricao) {
  const ids = [...new Set(reflexoesIds || [])];
  if (ids.length < 2) throw new Error("Uma divergência precisa de pelo menos 2 reflexões.");
  if (!ids.every((id) => rit.reflexoes.some((r) => r.id === id))) throw new Error("Reflexão não encontrada.");
  const limpo = (descricao || "").trim();
  if (!limpo) throw new Error("Descreva a divergência antes de registrar.");
  if (!rit.integracao) rit.integracao = {};
  if (!rit.integracao.divergencias) rit.integracao.divergencias = [];
  const divergencia = { reflexoes: ids, descricao: limpo };
  rit.integracao.divergencias.push(divergencia);
  return divergencia;
}

// Uma pergunta da reflexão vira suposição ou dúvida da Matriz CSD (passo 4
// do ritual). `rit.enviadasCsd` é interno do quadro (como `mapaTemp` nas
// visões do Bolt 7b) — o contrato de `reflexao` não tem campo para isso,
// então fica fora do objeto antes de ir ao pedido (ver ritualParaPedido).
export function enviarReflexaoParaCsd(rit, mapa, csd, reflexaoId, { tipo, pergunta_pesquisa, tarefa_discovery, autor, agora }) {
  const ref = rit.reflexoes.find((r) => r.id === reflexaoId);
  if (!ref) throw new Error("Reflexão não encontrada.");
  if (ref.tipo !== "pergunta") throw new Error("Só perguntas da reflexão podem virar item da Matriz CSD.");
  if ((rit.enviadasCsd || []).includes(reflexaoId)) throw new Error("Essa pergunta já foi enviada para a Matriz CSD.");
  const item = proporItemCsd(csd, mapa, {
    tipo, texto: ref.texto, autor, pergunta_pesquisa, tarefa_discovery, agora,
    origem: { etapa: "ritual_u", ref: reflexaoId },
  });
  rit.enviadasCsd = [...(rit.enviadasCsd || []), reflexaoId];
  return item;
}

// O que vai no pedido: o contrato (`$defs/ritual`) não conhece `enviadasCsd`
// nem a marca de "painel já reaberto" (ambos internos do quadro).
export function ritualParaPedido(rit) {
  if (!rit) return null;
  const { id, recorte, pergunta_generativa, duracao_min, aberto_em, encerrado_em, seguiu_sem, reflexoes, integracao } = rit;
  const doc = { id, recorte, pergunta_generativa, duracao_min, aberto_em, reflexoes };
  if (encerrado_em) doc.encerrado_em = encerrado_em;
  if (seguiu_sem?.length) doc.seguiu_sem = seguiu_sem;
  if (integracao && (integracao.cobertura?.length || integracao.divergencias?.length)) doc.integracao = integracao;
  return doc;
}

// ---------- HTML (tela cheia enquanto o ritual está aberto) ----------

function htmlConfiguracao(rascunho) {
  return `
    <div class="ritual-config">
      <h2>Ritual do fundo do U</h2>
      <p class="dica">Antes de definir o problema, uma pausa: cada pessoa escreve sozinha o que percebeu no mapa, sem ver o que os colegas escreveram.</p>
      <label for="rit-pergunta">Pergunta generativa</label>
      <select id="rit-pergunta-sugerida">
        <option value="">Escrever a minha…</option>
        ${PERGUNTAS_SUGERIDAS.map((p) => `<option value="${esc(p)}" ${rascunho.pergunta_generativa === p ? "selected" : ""}>${esc(p)}</option>`).join("")}
      </select>
      <textarea id="rit-pergunta" placeholder="Nunca 'qual é a solução?'">${esc(rascunho.pergunta_generativa)}</textarea>
      <label for="rit-duracao">Duração (3 a 15 minutos)</label>
      <input type="number" id="rit-duracao" min="3" max="15" value="${rascunho.duracao_min || 5}">
      <p class="erro" id="ritual-erro" role="alert"></p>
      <div class="linha-acoes">
        <button type="button" class="primario" id="btn-ritual-abrir">Abrir o ritual</button>
        <button type="button" class="link" id="btn-ritual-cancelar">Cancelar</button>
      </div>
    </div>`;
}

function formatarTempo(segundos) {
  const s = Math.max(0, Math.round(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Exportado à parte para o app.js atualizar só o texto a cada segundo, sem
// redesenhar o formulário inteiro (perderia o que a pessoa está digitando).
export function textoCronometro(rit, agora = new Date()) {
  const decorrido = (agora.getTime() - new Date(rit.aberto_em).getTime()) / 1000;
  const restante = rit.duracao_min * 60 - decorrido;
  const esgotado = restante <= 0;
  const texto = esgotado ? "Tempo esgotado — podem continuar e enviar quando terminarem." : `⏱ ${formatarTempo(restante)}`;
  return { texto, esgotado };
}

function htmlCronometro(rit, agora) {
  const { texto, esgotado } = textoCronometro(rit, agora);
  return `<p class="ritual-cronometro ${esgotado ? "esgotado" : ""}">${texto}</p>`;
}

function htmlEntradaIndividual(rit, agora) {
  return `
    <div class="ritual-entrada">
      <h2>Reflexão individual</h2>
      ${htmlCronometro(rit, agora)}
      <p class="ritual-pergunta">${esc(rit.pergunta_generativa)}</p>
      <p class="dica">Escreva sozinho. Não mostre para os colegas antes de enviar.</p>
      <form id="form-ritual-reflexao">
        <fieldset class="tipo-reflexao">
          <label><input type="radio" name="rit-tipo" value="percepcao" checked> Percepção</label>
          <label><input type="radio" name="rit-tipo" value="pergunta"> Pergunta</label>
        </fieldset>
        <textarea id="rit-texto" placeholder="O que você percebeu ou qual pergunta surgiu?" autofocus></textarea>
        <p class="erro" id="ritual-reflexao-erro" role="alert"></p>
        <div class="linha-acoes">
          <button type="submit" class="primario">Enviar e passar o dispositivo</button>
        </div>
      </form>
      <p class="ritual-contagem">${rit.reflexoes.length} reflexão(ões) enviada(s) até agora.</p>
      <div class="linha-acoes">
        <button type="button" id="btn-ritual-terminamos">Terminamos nossa reflexão</button>
      </div>
    </div>`;
}

function htmlInterludio(rit) {
  return `
    <div class="ritual-interludio">
      <h2>Passe o dispositivo</h2>
      <p class="ritual-pergunta">${esc(rit.pergunta_generativa)}</p>
      <p class="dica">${rit.reflexoes.length} reflexão(ões) enviada(s) até agora. Ninguém vê o que os colegas escreveram ainda.</p>
      <div class="linha-acoes">
        <button type="button" class="primario" id="btn-ritual-proximo">Sou a próxima pessoa</button>
        <button type="button" id="btn-ritual-terminamos">Terminamos nossa reflexão</button>
      </div>
    </div>`;
}

function htmlConfirmarEncerramento() {
  return `
    <div class="ritual-encerrar">
      <h2>Encerrar a reflexão individual?</h2>
      <p class="dica">Se alguém não enviou, pode listar quem para o squad decidir seguir sem essa pessoa.</p>
      <label for="rit-seguiu-sem">Ids de quem não enviou (opcional, separados por vírgula)</label>
      <input type="text" id="rit-seguiu-sem" placeholder="mem_bruno, mem_carla">
      <p class="erro" id="ritual-encerrar-erro" role="alert"></p>
      <div class="linha-acoes">
        <button type="button" class="primario" id="btn-ritual-confirmar-encerrar">Revelar as reflexões</button>
        <button type="button" class="link" id="btn-ritual-voltar">Voltar</button>
      </div>
    </div>`;
}

function rotuloElemento(mapa, id) {
  const v = mapa.variaveis.find((x) => x.id === id);
  if (v) return `Variável: ${v.nome}`;
  const a = mapa.atores.find((x) => x.id === id);
  if (a) return `Ator: ${a.nome}`;
  const s = mapa.setas.find((x) => x.id === id);
  if (s) return `Seta ${id}`;
  return id;
}

// `selecionados` é o conjunto de ids (já expandidos, não a chave do loop)
// marcados como "selected" — uma opção de loop fica marcada se qualquer
// seta dela estiver no conjunto.
function htmlOpcoesElementos(mapa, selecionados = new Set()) {
  const opcao = (valor, ids, rotulo) =>
    `<option value="${esc(valor)}" data-ids="${esc(ids.join(","))}" ${ids.some((id) => selecionados.has(id)) ? "selected" : ""}>${esc(rotulo)}</option>`;
  const atores = mapa.atores.map((a) => opcao(a.id, [a.id], `Ator: ${a.nome}`));
  const variaveis = mapa.variaveis.map((v) => opcao(v.id, [v.id], `Variável: ${v.nome}`));
  const loops = mapa.loops_anotados
    .filter((l) => l.nome?.trim())
    .map((l) => opcao(`loop:${l.setas.join("|")}`, l.setas, `Loop: ${l.nome}`));
  return [...atores, ...variaveis, ...loops].join("");
}

function htmlReflexaoRevelada(rit, mapa, csd, r) {
  const cobertura = rit.integracao?.cobertura?.find((c) => c.reflexao === r.id);
  const elementosAtuais = new Set(cobertura?.elementos || []);
  const statusCobertura = !cobertura
    ? '<p class="ritual-pendente">Ainda não ligada a nenhum elemento do mapa.</p>'
    : cobertura.presente_no_mapa
      ? `<p class="ritual-coberta">No mapa: ${cobertura.elementos.map((id) => esc(rotuloElemento(mapa, id))).join(", ")}</p>`
      : '<p class="ritual-ausente">Não aparece no mapa — fica como pendência para o squad.</p>';
  const jaEnviada = (rit.enviadasCsd || []).includes(r.id);
  return `
    <li class="reflexao-revelada" data-reflexao="${esc(r.id)}">
      <p class="reflexao-meta"><strong>${esc(r.autor)}</strong> · ${r.tipo === "pergunta" ? "Pergunta" : "Percepção"}</p>
      <p class="reflexao-texto">${esc(r.texto)}</p>
      ${statusCobertura}
      <label>Ligar a elementos do mapa</label>
      <select multiple size="4" data-ligar="${esc(r.id)}">${htmlOpcoesElementos(mapa, elementosAtuais)}</select>
      <div class="linha-acoes">
        <button type="button" data-ritual-ligar="${esc(r.id)}">Salvar ligação</button>
        <button type="button" data-ritual-nao-mapa="${esc(r.id)}">Marcar como ausente do mapa</button>
      </div>
      ${r.tipo === "pergunta" ? (jaEnviada
        ? '<p class="dica">Já enviada para a Matriz CSD.</p>'
        : `<details class="csd-da-reflexao">
            <summary>Enviar para a Matriz CSD</summary>
            <label>Tipo</label>
            <select data-csd-tipo="${esc(r.id)}">
              <option value="suposicao">Suposição</option>
              <option value="duvida">Dúvida</option>
            </select>
            <textarea data-csd-texto="${esc(r.id)}" placeholder="Pergunta de pesquisa (suposição) ou tarefa de discovery (dúvida)"></textarea>
            <p class="erro" id="ritual-csd-erro-${esc(r.id)}" role="alert"></p>
            <button type="button" data-ritual-csd="${esc(r.id)}">Enviar para a CSD</button>
          </details>`) : ""}
    </li>`;
}

function htmlCoberturaPorMembro(rit) {
  const porAutor = new Map();
  for (const r of rit.reflexoes) {
    if (!porAutor.has(r.autor)) porAutor.set(r.autor, []);
    porAutor.get(r.autor).push(r);
  }
  const linhas = [...porAutor.entries()].map(([autor, reflexoes]) => {
    const cobertas = reflexoes.filter((r) => rit.integracao?.cobertura?.find((c) => c.reflexao === r.id)?.presente_no_mapa).length;
    return `<li>${esc(autor)}: ${reflexoes.length} reflexão(ões), ${cobertas} no mapa, ${reflexoes.length - cobertas} ainda não</li>`;
  });
  return `<ul class="cobertura-membro">${linhas.join("")}</ul>`;
}

function htmlDivergencias(rit) {
  const lista = rit.integracao?.divergencias || [];
  return `
    <div class="ritual-divergencias">
      <h3>Divergências</h3>
      ${lista.length ? `<ul>${lista.map((d) => `<li>${d.reflexoes.map(esc).join(", ")}: ${esc(d.descricao)}</li>`).join("")}</ul>` : '<p class="dica">Nenhuma registrada ainda.</p>'}
      <details>
        <summary>Registrar divergência</summary>
        <label>Reflexões envolvidas (Ctrl/Cmd+clique para mais de uma)</label>
        <select multiple size="5" id="rit-divergencia-reflexoes">
          ${rit.reflexoes.map((r) => `<option value="${esc(r.id)}">${esc(r.autor)}: ${esc(r.texto.slice(0, 40))}${r.texto.length > 40 ? "…" : ""}</option>`).join("")}
        </select>
        <textarea id="rit-divergencia-texto" placeholder="Em que elas discordam?"></textarea>
        <p class="erro" id="ritual-divergencia-erro" role="alert"></p>
        <button type="button" id="btn-ritual-divergencia">Registrar</button>
      </details>
    </div>`;
}

function htmlRevelacao(rit, mapa, csd) {
  return `
    <div class="ritual-revelacao">
      <h2>Revelação e integração</h2>
      <p class="dica">${rit.reflexoes.length} reflexões enviadas. Liguem cada uma a um elemento do mapa ou marquem como ausente.</p>
      ${rit.seguiu_sem?.length ? `<p class="dica">Seguiu sem: ${rit.seguiu_sem.map(esc).join(", ")}.</p>` : ""}
      <h3>Cobertura por membro</h3>
      ${htmlCoberturaPorMembro(rit)}
      <ul class="reflexoes-reveladas">${rit.reflexoes.map((r) => htmlReflexaoRevelada(rit, mapa, csd, r)).join("")}</ul>
      ${htmlDivergencias(rit)}
      <div class="linha-acoes">
        <button type="button" class="primario" id="btn-ritual-reabrir-painel">Reabrir o painel</button>
        <button type="button" id="btn-ritual-reabrir-painel-pedir">Reabrir e pedir visão ao agente</button>
      </div>
    </div>`;
}

// `etapa`: "configurar" | "entrada" | "interludio" | "confirmar-encerrar" | "revelacao".
export function htmlRitual(rit, { etapa, rascunhoConfig = {}, mapa, csd, agora = new Date() } = {}) {
  if (!rit) return htmlConfiguracao(rascunhoConfig);
  if (!rit.encerrado_em) {
    if (etapa === "confirmar-encerrar") return htmlConfirmarEncerramento();
    if (etapa === "interludio") return htmlInterludio(rit);
    return htmlEntradaIndividual(rit, agora);
  }
  return htmlRevelacao(rit, mapa, csd);
}
