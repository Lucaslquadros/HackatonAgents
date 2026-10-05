// Quadro do Agente de Visão Sistêmica: edição do mapa (Bolt 2) e painel de
// análise com o validador ao vivo (Bolt 3). As visões do agente entram no
// Bolt 4.

import {
  novoMapa, normalizar, adicionarVariavel, adicionarSeta, adicionarAtor,
  moverVariavel, atualizar, remover, pendencias, chaveLoop, anotarLoop,
  removerAnotacao, atualizarAnalise, adicionarAlavanca, removerAlavanca,
  aceitarConexao, aceitarVariavel, novoEstacionamento, estacionar, mudarStatusIdeia,
} from "./estado.js";
import { validarMapa } from "./validador.js";
import { htmlPainel, organizarLoops } from "./painel.js";
import { montarPedido, mesclarVisoes, mudarStatus, htmlVisoes, situacaoConexao, dataHoraLocal } from "./visoes.js";
import { novaEntrevista, registrarRodada, rodadaAberta, responderRodada, aplicarRespostas, aceitarProposta, entrevistaParaPedido, htmlEntrevista } from "./entrevista.js";

const CHAVE_RASCUNHO = "hackos.quadro.rascunho";
const CHAVE_AUTOR = "hackos.quadro.autor";
const EXEMPLO = "../../modelo-dados/exemplos/lastmile/mapa.json";
const SVG_NS = "http://www.w3.org/2000/svg";

const el = (id) => document.getElementById(id);
const tela = el("tela");
const camadaSetas = el("camada-setas");
const camadaVariaveis = el("camada-variaveis");
const ligacao = el("ligacao-temporaria");
const camadaSelos = el("camada-selos");
const lateral = el("lateral");
const inspetor = el("inspetor");
const painel = el("painel");
const painelVisoes = el("visoes");
const status = el("status");
const campoAutor = el("autor");

let mapa = lerArmazenado(CHAVE_RASCUNHO, (t) => normalizar(JSON.parse(t))) || novoMapa();
let selecionado = null;
let historico = [];
let arquivoAberto = null; // handle do File System Access API, quando disponível
let snapshotDoFoco = null;
let validacao = validarMapa(mapa);
let abaAtiva = "editar";
let loopAberto = null; // chave do loop aberto no painel (destacado no quadro)
const detalhesAbertos = new Set(); // <details> do painel que o squad deixou abertos
const rascunhoAlavanca = {};
const CHAVE_VISOES = "hackos.quadro.visoes.";
const CHAVE_PENDENTE = "hackos.quadro.pedido-pendente";
let visoes = carregarVisoes();
// motor: "sem_servidor" | "pronto" | "aguardando" | "erro"
let estadoMotor = { motor: "pronto" };
let espera = null;
const CHAVE_ESTACIONAMENTO = "hackos.quadro.estacionamento.";
let estacionamento = carregarEstacionamento();
let rascunhoIdeia = "";
const CHAVE_ENTREVISTA = "hackos.quadro.entrevista.";
let entrevista = carregarEntrevista();
let rascunhosEntrevista = {}; // respostas em edição, por pergunta
let rascunhoProposta = {};
let ultimasMudancas = [];

campoAutor.value = lerArmazenado(CHAVE_AUTOR, (t) => t) || "mem_squad";

// ---------- armazenamento local (rascunho por navegador) ----------

function lerArmazenado(chave, converter) {
  try {
    const t = localStorage.getItem(chave);
    return t ? converter(t) : null;
  } catch {
    return null;
  }
}
function gravarArmazenado(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento: segue sem rascunho */ }
}

// ---------- histórico ----------

function guardarHistorico(snapshot = JSON.stringify(mapa)) {
  historico.push(snapshot);
  if (historico.length > 100) historico.shift();
}
function desfazer() {
  const anterior = historico.pop();
  if (!anterior) return;
  mapa = normalizar(JSON.parse(anterior));
  if (selecionado && !existe(selecionado)) selecionado = null;
  render();
}
function operar(fn) {
  guardarHistorico();
  const resultado = fn();
  render();
  return resultado;
}

const autor = () => campoAutor.value.trim() || "mem_squad";
const existe = (id) => [...mapa.variaveis, ...mapa.setas].some((x) => x.id === id);
const varPorId = (id) => mapa.variaveis.find((v) => v.id === id);
const setaPorId = (id) => mapa.setas.find((s) => s.id === id);

// ---------- geometria ----------

function quebrarLinhas(texto, largura = 22) {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = "";
  for (const p of palavras) {
    if ((atual + " " + p).trim().length > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = (atual + " " + p).trim();
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas.slice(0, 3) : ["(sem nome)"];
}

function caixa(v) {
  const linhas = quebrarLinhas(v.nome);
  const largura = Math.min(220, Math.max(120, Math.max(...linhas.map((l) => l.length)) * 7.4 + 28));
  const altura = linhas.length * 17 + 22;
  return { x: v.posicao.x, y: v.posicao.y, w: largura, h: altura, linhas };
}
const centro = (c) => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 });

// Ponto onde o segmento (centro da caixa → alvo) cruza a borda da caixa.
function naBorda(c, alvo, folga = 4) {
  const ctr = centro(c);
  const dx = alvo.x - ctr.x;
  const dy = alvo.y - ctr.y;
  if (dx === 0 && dy === 0) return ctr;
  const escala = Math.min(
    dx === 0 ? Infinity : (c.w / 2 + folga) / Math.abs(dx),
    dy === 0 ? Infinity : (c.h / 2 + folga) / Math.abs(dy),
  );
  return { x: ctr.x + dx * escala, y: ctr.y + dy * escala };
}

function pontoQuadratico(p0, c, p1, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
}
function tangenteQuadratica(p0, c, p1, t) {
  const x = 2 * (1 - t) * (c.x - p0.x) + 2 * t * (p1.x - c.x);
  const y = 2 * (1 - t) * (c.y - p0.y) + 2 * t * (p1.y - c.y);
  const n = Math.hypot(x, y) || 1;
  return { x: x / n, y: y / n };
}

// ---------- render ----------

function criar(tag, atributos = {}, pai) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(atributos)) n.setAttribute(k, v);
  if (pai) pai.appendChild(n);
  return n;
}

function renderSetas(caixas) {
  camadaSetas.replaceChildren();
  // Setas no mesmo sentido entre o mesmo par ganham curvas mais abertas;
  // setas em sentidos opostos já curvam para lados opostos.
  const contagem = new Map();
  const fantasmas = visoes
    .filter((v) => v.status === "aberta" && v.tipo === "conexao_sugerida" && v.proposta_seta && situacaoConexao(mapa, v.proposta_seta) === "pode_aceitar")
    .map((v) => ({ ...v.proposta_seta, id: `fantasma:${v.chave}`, chaveVisao: v.chave, status: "fantasma" }));
  for (const s of [...mapa.setas, ...fantasmas]) {
    const c1 = caixas.get(s.de);
    const c2 = caixas.get(s.para);
    if (!c1 || !c2) continue;
    const chavePar = `${s.de}>${s.para}`;
    const k = contagem.get(chavePar) || 0;
    contagem.set(chavePar, k + 1);

    const a = centro(c1);
    const b = centro(c2);
    const comp = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const normal = { x: -(b.y - a.y) / comp, y: (b.x - a.x) / comp };
    const curva = 26 + 30 * k;
    const controle = { x: (a.x + b.x) / 2 + normal.x * curva, y: (a.y + b.y) / 2 + normal.y * curva };
    const inicio = naBorda(c1, controle);
    const fim = naBorda(c2, controle, 7);

    const classes = ["seta", s.status];
    if (!s.mecanismo || !s.mecanismo.trim()) classes.push("sem-mecanismo");
    if (s.id === selecionado) classes.push("selecionado");
    if (setasDoLoopAberto) classes.push(setasDoLoopAberto.has(s.id) ? "em-loop" : "esmaecida");
    if (s.chaveVisao) classes.push("sugerida");
    const g = criar("g", { class: classes.join(" "), [s.chaveVisao ? "data-fantasma" : "data-seta"]: s.chaveVisao || s.id }, camadaSetas);
    const d = `M${inicio.x},${inicio.y} Q${controle.x},${controle.y} ${fim.x},${fim.y}`;
    criar("path", { d, class: "linha", "marker-end": s.id === selecionado ? "url(#ponta-sel)" : "url(#ponta)" }, g);
    criar("path", { d, class: "toque" }, g);

    const pSinal = pontoQuadratico(inicio, controle, fim, 0.82);
    const sinal = criar("text", {
      class: "sinal",
      x: pSinal.x + normal.x * 13,
      y: pSinal.y + normal.y * 13 + 6,
      "text-anchor": "middle",
    }, g);
    sinal.textContent = s.polaridade === "-" ? "−" : "+";

    if (s.atraso) {
      const meio = pontoQuadratico(inicio, controle, fim, 0.5);
      const tan = tangenteQuadratica(inicio, controle, fim, 0.5);
      const perp = { x: -tan.y, y: tan.x };
      for (const desloc of [-3.5, 3.5]) {
        const cx = meio.x + tan.x * desloc;
        const cy = meio.y + tan.y * desloc;
        criar("line", {
          class: "atraso",
          x1: cx - perp.x * 8, y1: cy - perp.y * 8,
          x2: cx + perp.x * 8, y2: cy + perp.y * 8,
        }, g);
      }
    }
    const titulo = criar("title", {}, g);
    titulo.textContent = `${s.chaveVisao ? "Sugestão do agente (clique para ver): " : ""}${varPorId(s.de)?.nome} → ${varPorId(s.para)?.nome} (${s.polaridade})${s.mecanismo ? ": " + s.mecanismo : ""}`;
  }
}

let setasDoLoopAberto = null;

function renderVariaveis(caixas) {
  camadaVariaveis.replaceChildren();
  const comPergunta = new Set(validacao.problemas.flatMap((p) => p.refs || []));
  const noLoopAberto = setasDoLoopAberto
    ? new Set(mapa.setas.filter((s) => setasDoLoopAberto.has(s.id)).flatMap((s) => [s.de, s.para]))
    : null;
  for (const v of mapa.variaveis) {
    const c = caixas.get(v.id);
    const classes = ["var", v.tipo, v.status];
    if (v.id === selecionado) classes.push("selecionado");
    if (noLoopAberto && !noLoopAberto.has(v.id)) classes.push("esmaecida");
    const g = criar("g", { class: classes.join(" "), "data-var": v.id, tabindex: "0", role: "button", "aria-label": `Variável ${v.nome}` }, camadaVariaveis);
    criar("rect", { x: c.x, y: c.y, width: c.w, height: c.h }, g);
    const texto = criar("text", { x: c.x + c.w / 2, y: c.y + 24, "text-anchor": "middle" }, g);
    c.linhas.forEach((linha, i) => {
      const t = criar("tspan", { x: c.x + c.w / 2, dy: i === 0 ? 0 : 17 }, texto);
      t.textContent = linha;
    });
    if (comPergunta.has(v.id)) {
      const marca = criar("circle", { class: "marca-pergunta", cx: c.x + c.w - 2, cy: c.y + 2, r: 6 }, g);
      criar("title", {}, marca).textContent = "Há uma pergunta sobre esta variável no painel Análise";
    }
    if (v.id === selecionado) {
      const alca = criar("circle", { class: "alca", cx: c.x + c.w + 12, cy: c.y + c.h / 2, r: 8, "data-alca": v.id }, g);
      criar("title", {}, alca).textContent = "Arraste até outra variável para criar uma seta";
      const rot = criar("text", { class: "alca-rotulo", x: c.x + c.w + 24, y: c.y + c.h / 2 + 4 }, g);
      rot.textContent = "ligar";
    }
  }
}

function renderStatus() {
  const p = pendencias(mapa);
  const partes = [
    `${mapa.variaveis.length} variáveis`,
    `${mapa.setas.length} setas`,
    `${mapa.atores.length} atores`,
    p.length ? `${p.length} pendência(s) para o arquivo valer no contrato` : "pronto para salvar",
    arquivoAberto ? `arquivo: ${arquivoAberto.name}` : "rascunho guardado neste navegador",
  ];
  status.textContent = partes.join(" · ");
}

// Selo R/B no centro de cada loop que o squad nomeou.
function renderSelos(caixas) {
  camadaSelos.replaceChildren();
  const { nomeados } = organizarLoops(mapa, validacao);
  for (const loop of nomeados) {
    const vars = [...new Set(loop.setas.flatMap((id) => {
      const s = setaPorId(id);
      return [s.de, s.para];
    }))];
    const pontos = vars.map((id) => centro(caixas.get(id)));
    const x = pontos.reduce((t, p) => t + p.x, 0) / pontos.length;
    const y = pontos.reduce((t, p) => t + p.y, 0) / pontos.length;
    const rotulo = loop.rotulo.split("·")[0].trim().slice(0, 4) || loop.tipo;
    const classes = ["selo-loop", loop.tipo === "R" ? "reforco" : "balanco"];
    if (loopAberto === loop.chave) classes.push("aberto");
    const g = criar("g", { class: classes.join(" "), "data-selo": loop.chave }, camadaSelos);
    criar("circle", { cx: x, cy: y, r: 17 }, g);
    const t = criar("text", { x, y: y + 5, "text-anchor": "middle" }, g);
    t.textContent = rotulo;
    criar("title", {}, g).textContent = `${loop.rotulo}: ${loop.caminho.join(" → ")}`;
  }
}

function render() {
  validacao = validarMapa(mapa);
  const loopAindaExiste = validacao.loops.some((l) => chaveLoop(l.setas) === loopAberto);
  if (!loopAindaExiste) loopAberto = null;
  setasDoLoopAberto = loopAberto ? new Set(loopAberto.split("|")) : null;
  const caixas = new Map(mapa.variaveis.map((v) => [v.id, caixa(v)]));
  renderSetas(caixas);
  renderVariaveis(caixas);
  renderSelos(caixas);
  renderInspetor();
  renderPainel();
  renderVisoes();
  renderAbas();
  renderStatus();
  gravarArmazenado(CHAVE_RASCUNHO, JSON.stringify(mapa));
}

// ---------- abas e painel de análise ----------

const ABAS = ["editar", "analise", "visoes"];

function renderAbas() {
  for (const aba of ABAS) {
    const ativa = abaAtiva === aba;
    el(`aba-${aba}`).setAttribute("aria-selected", String(ativa));
    el(`aba-${aba}`).tabIndex = ativa ? 0 : -1;
  }
  inspetor.hidden = abaAtiva !== "editar";
  painel.hidden = abaAtiva !== "analise";
  painelVisoes.hidden = abaAtiva !== "visoes";
  const contar = (id, n) => {
    el(id).textContent = n ? String(n) : "";
    el(id).hidden = !n;
  };
  contar("contador", validacao.problemas.length);
  contar("contador-visoes", visoes.filter((v) => v.status === "aberta").length);
}

function mudarAba(aba) {
  abaAtiva = aba;
  render();
}

function renderPainel() {
  // Mesmo cuidado do inspetor: não redesenhar enquanto alguém digita no
  // painel, a menos que o loop aberto tenha mudado.
  const digitando = painel.contains(document.activeElement) && document.activeElement.matches("input[type=text], textarea");
  const chave = loopAberto || "";
  if (digitando && painel.dataset.loop === chave) return;
  painel.dataset.loop = chave;
  painel.innerHTML = htmlPainel(mapa, validacao, { loopAberto });
  for (const d of painel.querySelectorAll("details")) {
    if (detalhesAbertos.has(d.className)) d.open = true;
  }
  const f = rascunhoAlavanca;
  if (f.alvo) el("alv-alvo").value = f.alvo;
  if (f.nivel) el("alv-nivel").value = f.nivel;
  if (f.impacto) el("alv-impacto").value = f.impacto;
  if (f.sanidade) el("alv-sanidade").value = f.sanidade;
}

function abrirLoop(chave) {
  loopAberto = loopAberto === chave ? null : chave;
  abaAtiva = "analise";
  render();
}

const setasDaChave = (chave) => validacao.loops.find((l) => chaveLoop(l.setas) === chave)?.setas || [];

painel.addEventListener("toggle", (e) => {
  if (e.target.tagName !== "DETAILS") return;
  if (e.target.open) detalhesAbertos.add(e.target.className);
  else detalhesAbertos.delete(e.target.className);
}, true);

painel.addEventListener("click", (e) => {
  const botao = e.target.closest("button");
  if (!botao) return;
  if (botao.dataset.loop) {
    abrirLoop(botao.dataset.loop);
  } else if (botao.dataset.ir) {
    irParaProblema(JSON.parse(botao.dataset.ir));
  } else if (botao.dataset.removerAnotacao) {
    operar(() => removerAnotacao(mapa, setasDaChave(botao.dataset.removerAnotacao)));
  } else if (botao.hasAttribute("data-limpar-orfas")) {
    const atuais = new Set(validacao.loops.map((l) => chaveLoop(l.setas)));
    operar(() => { mapa.loops_anotados = mapa.loops_anotados.filter((l) => atuais.has(chaveLoop(l.setas))); });
  } else if (botao.dataset.removerAlavanca) {
    operar(() => removerAlavanca(mapa, botao.dataset.removerAlavanca));
  } else if (botao.id === "btn-alavanca") {
    criarAlavanca();
  }
});

// Cada pergunta do painel leva ao ponto do quadro de que ela fala.
function irParaProblema({ codigo, refs }) {
  if (codigo === "b_sem_meta") return abrirLoop(chaveLoop(refs));
  const alvo = refs.find((id) => existe(id));
  if (alvo) {
    loopAberto = null;
    selecionar(alvo);
    centralizarNoQuadro(alvo);
  } else if (codigo === "nenhum_loop" || codigo === "excesso_variaveis") {
    selecionar(null);
  }
}

// Rola o quadro até a variável (ou o meio da seta) indicada.
function centralizarNoQuadro(id) {
  const v = varPorId(id);
  const s = setaPorId(id);
  let ponto;
  if (v) ponto = centro(caixa(v));
  else if (s) {
    const a = centro(caixa(varPorId(s.de)));
    const b = centro(caixa(varPorId(s.para)));
    ponto = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  if (!ponto) return;
  const rolagem = el("rolagem");
  rolagem.scrollTo({ left: ponto.x - rolagem.clientWidth / 2, top: ponto.y - rolagem.clientHeight / 2, behavior: "smooth" });
}

function criarAlavanca() {
  const f = rascunhoAlavanca;
  const [tipo, ref] = (el("alv-alvo").value || "").split(":");
  const refs = tipo === "loop" ? setasDaChave(ref) : ref ? [ref] : [];
  try {
    guardarHistorico();
    adicionarAlavanca(mapa, {
      alvo: { tipo, refs },
      nivel_meadows: el("alv-nivel").value,
      impacto_esperado: el("alv-impacto").value,
      teste_sanidade: el("alv-sanidade").value,
      autor: autor(),
    });
    for (const k of Object.keys(f)) delete f[k];
    detalhesAbertos.delete("nova-alavanca");
    render();
  } catch (erro) {
    historico.pop();
    el("alv-erro").textContent = erro.message;
  }
}

painel.addEventListener("input", (e) => {
  const alvo = e.target;
  if (alvo.dataset.loopCampo) {
    if (!loopAberto) return;
    anotarLoop(mapa, setasDaChave(loopAberto), { [alvo.dataset.loopCampo]: alvo.value });
    render();
  } else if (alvo.dataset.analise && alvo.matches("textarea, input[type=text]")) {
    const [campo, sub] = alvo.dataset.analise.split(".");
    atualizarAnalise(mapa, { [campo]: sub ? { [sub]: alvo.value } : alvo.value });
    render();
  } else if (alvo.id?.startsWith("alv-")) {
    const nome = { "alv-alvo": "alvo", "alv-nivel": "nivel", "alv-impacto": "impacto", "alv-sanidade": "sanidade" }[alvo.id];
    if (nome) rascunhoAlavanca[nome] = alvo.value;
  }
});

painel.addEventListener("change", (e) => {
  const alvo = e.target;
  if (alvo.matches("input[type=text], textarea")) return; // histórico tratado em "lateral"
  if (alvo.name === "cynefin") {
    operar(() => atualizarAnalise(mapa, { cynefin: { dominio: alvo.value } }));
  } else if (alvo.dataset.analise === "loop_principal") {
    operar(() => atualizarAnalise(mapa, { loop_principal: alvo.value ? setasDaChave(alvo.value) : [] }));
  } else if (alvo.dataset.analise === "comportamento_no_tempo.variavel") {
    operar(() => atualizarAnalise(mapa, { comportamento_no_tempo: { variavel: alvo.value } }));
  } else if (alvo.dataset.analise === "arquetipo") {
    operar(() => atualizarAnalise(mapa, { arquetipo: alvo.value }));
  } else if (alvo.id?.startsWith("alv-")) {
    const nome = { "alv-alvo": "alvo", "alv-nivel": "nivel" }[alvo.id];
    if (nome) rascunhoAlavanca[nome] = alvo.value;
  }
});

camadaSelos.addEventListener("pointerdown", (e) => {
  const selo = e.target.closest("[data-selo]");
  if (!selo) return;
  e.stopPropagation();
  abrirLoop(selo.dataset.selo);
});

// ---------- inspetor ----------

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const PAPEIS = ["sofre", "decide", "paga", "opera", "regula", "outro"];
const TIPOS = [
  ["neutra", "Neutra", "variável do sistema"],
  ["problema", "Problema", "ponto crítico"],
  ["resultado", "Resultado", "resultado desejado"],
];

function renderInspetor() {
  const v = selecionado && varPorId(selecionado);
  const s = selecionado && setaPorId(selecionado);
  const alvo = v || s ? selecionado : "contexto";
  // Não redesenhar o formulário enquanto alguém digita nele, a menos que o
  // item mostrado tenha mudado (outra seleção, mapa novo, desfazer).
  const digitando = inspetor.contains(document.activeElement) && document.activeElement.matches("input[type=text], textarea");
  if (digitando && inspetor.dataset.alvo === alvo) return;
  inspetor.dataset.alvo = alvo;
  if (v) inspetor.innerHTML = htmlVariavel(v);
  else if (s) inspetor.innerHTML = htmlSeta(s);
  else inspetor.innerHTML = htmlContexto();
}

function htmlContexto() {
  const c = mapa.contexto;
  const p = pendencias(mapa);
  return `
    <h2>Contexto do mapa</h2>
    <label for="f-tema">Tema</label>
    <input type="text" id="f-tema" data-contexto="tema" class="obrigatorio" placeholder="Ex.: atrasos numa startup de entregas" value="${esc(c.tema)}">
    <label for="f-pergunta">Pergunta-problema</label>
    <p class="dica">Comece pelo comportamento: "por que X piorou apesar de Y?"</p>
    <textarea id="f-pergunta" data-contexto="pergunta_problema" class="obrigatorio" placeholder="Por que … apesar de …?">${esc(c.pergunta_problema)}</textarea>
    <label for="f-horizonte">Horizonte de tempo</label>
    <input type="text" id="f-horizonte" data-contexto="horizonte_tempo" placeholder="Ex.: últimos 6 meses" value="${esc(c.horizonte_tempo)}">
    <label for="f-fronteira">Fronteira</label>
    <input type="text" id="f-fronteira" data-contexto="fronteira" placeholder="O que entra e o que fica de fora" value="${esc(c.fronteira)}">
    <label for="f-recorte">Id do recorte</label>
    <input type="text" id="f-recorte" data-raiz="recorte" value="${esc(mapa.recorte)}">

    <h3>Atores</h3>
    <p class="dica">Aula 4: mapeie quem sofre, decide, paga ou opera antes das causas.</p>
    <ul class="lista-atores">
      ${mapa.atores.map((a) => `<li><span>${esc(a.nome)} <small>${a.papeis.join(", ")}</small></span>
        <button type="button" class="perigo" data-remover="${a.id}" aria-label="Remover ator ${esc(a.nome)}">×</button></li>`).join("")}
    </ul>
    <label for="f-ator">Novo ator</label>
    <input type="text" id="f-ator" placeholder="Ex.: Lojistas parceiros">
    <div class="opcoes">${PAPEIS.map((p) => `<label><input type="checkbox" name="papel" value="${p}"> ${p}</label>`).join("")}</div>
    <div class="linha-acoes"><button type="button" id="btn-ator">Adicionar ator</button></div>

    <h3>Pendências</h3>
    ${p.length ? `<ul class="pendencias">${p.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="dica">Nenhuma.</p>`}

    <h3>Como usar</h3>
    <ul class="ajuda">
      <li>Duplo clique no quadro cria uma variável.</li>
      <li>Selecione uma variável e arraste a bolinha "ligar" até outra para criar uma seta.</li>
      <li>Clique numa seta para dizer a polaridade, o atraso e o mecanismo.</li>
      <li>Delete apaga a seleção; Ctrl+Z desfaz.</li>
    </ul>`;
}

function htmlVariavel(v) {
  const outras = mapa.variaveis.filter((x) => x.id !== v.id);
  return `
    <h2>Variável</h2>
    <label for="f-nome">Nome</label>
    <p class="dica">Substantivo neutro, que pode subir ou descer.</p>
    <input type="text" id="f-nome" data-campo="nome" class="obrigatorio" placeholder="Ex.: volume de pedidos" value="${esc(v.nome)}">
    <label>Tipo</label>
    <div class="opcoes">
      ${TIPOS.map(([valor, rotulo, dica]) => `<label title="${dica}"><input type="radio" name="tipo" value="${valor}" ${v.tipo === valor ? "checked" : ""}> <span class="chip ${valor}"></span> ${rotulo}</label>`).join("")}
    </div>
    <label>Atores</label>
    ${mapa.atores.length
      ? `<div class="opcoes">${mapa.atores.map((a) => `<label><input type="checkbox" name="ator" value="${a.id}" ${(v.atores || []).includes(a.id) ? "checked" : ""}> ${esc(a.nome)}</label>`).join("")}</div>`
      : `<p class="dica">Nenhum ator cadastrado. Clique no fundo do quadro para cadastrar na aba Contexto.</p>`}
    ${outras.length ? `
      <h3>Ligar a outra variável</h3>
      <div class="opcoes">
        <select id="f-ligar-para" aria-label="Variável de destino">${outras.map((o) => `<option value="${o.id}">${esc(o.nome)}</option>`).join("")}</select>
        <select id="f-ligar-pol" aria-label="Polaridade"><option value="+">+ (mesmo sentido)</option><option value="-">− (sentido oposto)</option></select>
      </div>
      <div class="linha-acoes"><button type="button" id="btn-ligar">Criar seta</button></div>` : ""}
    <div class="linha-acoes"><button type="button" class="perigo" data-remover="${v.id}">Apagar variável</button></div>
    <p class="meta-info">${v.id} · autor ${esc(v.autor)} · ${v.status}</p>`;
}

function htmlSeta(s) {
  const de = varPorId(s.de)?.nome || s.de;
  const para = varPorId(s.para)?.nome || s.para;
  return `
    <h2>Seta</h2>
    <p><strong>${esc(de)}</strong> → <strong>${esc(para)}</strong></p>
    <label>Polaridade</label>
    <p class="dica">+ quando as duas andam no mesmo sentido; − quando andam em sentidos opostos. Não é bom ou ruim.</p>
    <div class="opcoes">
      <label><input type="radio" name="polaridade" value="+" ${s.polaridade === "+" ? "checked" : ""}> +</label>
      <label><input type="radio" name="polaridade" value="-" ${s.polaridade === "-" ? "checked" : ""}> −</label>
    </div>
    <label for="f-mecanismo">Mecanismo</label>
    <p class="dica">Por que uma move a outra, em uma frase. Sem mecanismo, é "fofoca com setas".</p>
    <textarea id="f-mecanismo" data-campo="mecanismo" class="obrigatorio" placeholder="Ex.: cada contrato novo traz os pedidos de mais um lojista.">${esc(s.mecanismo)}</textarea>
    <label class="opcoes"><input type="checkbox" id="f-atraso" ${s.atraso ? "checked" : ""}> Há atraso (‖) entre causa e efeito</label>
    ${s.atraso ? `<input type="text" data-campo="atraso_descricao" placeholder="Quanto tempo? Ex.: semanas" value="${esc(s.atraso_descricao)}">` : ""}
    <label>Evidência</label>
    <div class="opcoes">
      <label><input type="radio" name="classificacao" value="suposicao" ${s.classificacao === "suposicao" ? "checked" : ""}> Suposição</label>
      <label><input type="radio" name="classificacao" value="certeza" ${s.classificacao === "certeza" ? "checked" : ""}> Certeza</label>
    </div>
    ${s.classificacao === "certeza" ? `<input type="text" data-campo="fonte" class="obrigatorio" placeholder="Fonte da certeza" value="${esc(s.fonte)}">` : ""}
    <div class="linha-acoes"><button type="button" class="perigo" data-remover="${s.id}">Apagar seta</button></div>
    <p class="meta-info">${s.id} · autor ${esc(s.autor)} · ${s.status}</p>`;
}

// Texto digitado vira um único passo do "desfazer": foto ao focar, registro ao sair.
lateral.addEventListener("focusin", (e) => {
  if (e.target.matches("input[type=text], textarea")) snapshotDoFoco = JSON.stringify(mapa);
});
lateral.addEventListener("change", (e) => {
  if (!e.target.matches("input[type=text], textarea")) return;
  if (snapshotDoFoco && snapshotDoFoco !== JSON.stringify(mapa)) guardarHistorico(snapshotDoFoco);
  snapshotDoFoco = null;
});

inspetor.addEventListener("input", (e) => {
  const alvo = e.target;
  if (alvo.dataset.campo) {
    atualizar(mapa, selecionado, { [alvo.dataset.campo]: alvo.value });
  } else if (alvo.dataset.contexto) {
    const valor = alvo.value;
    if (valor || ["tema", "pergunta_problema"].includes(alvo.dataset.contexto)) mapa.contexto[alvo.dataset.contexto] = valor;
    else delete mapa.contexto[alvo.dataset.contexto];
  } else if (alvo.dataset.raiz === "recorte") {
    mapa.recorte = alvo.value;
  } else {
    return;
  }
  render();
});

inspetor.addEventListener("change", (e) => {
  const alvo = e.target;
  if (alvo.matches("input[type=text], textarea")) return; // histórico tratado em "lateral"
  if (alvo.name === "tipo") operar(() => atualizar(mapa, selecionado, { tipo: alvo.value }));
  else if (alvo.name === "polaridade") operar(() => atualizar(mapa, selecionado, { polaridade: alvo.value }));
  else if (alvo.name === "classificacao") operar(() => atualizar(mapa, selecionado, { classificacao: alvo.value }));
  else if (alvo.id === "f-atraso") operar(() => atualizar(mapa, selecionado, { atraso: alvo.checked }));
  else if (alvo.name === "ator") {
    const marcados = [...inspetor.querySelectorAll("input[name=ator]:checked")].map((x) => x.value);
    operar(() => atualizar(mapa, selecionado, { atores: marcados }));
  }
});

inspetor.addEventListener("click", (e) => {
  const botao = e.target.closest("button");
  if (!botao) return;
  if (botao.dataset.remover) {
    const id = botao.dataset.remover;
    operar(() => remover(mapa, id));
    if (id === selecionado) selecionado = null;
    render();
  } else if (botao.id === "btn-ator") {
    const nome = el("f-ator").value.trim();
    if (!nome) return el("f-ator").focus();
    const papeis = [...inspetor.querySelectorAll("input[name=papel]:checked")].map((x) => x.value);
    operar(() => adicionarAtor(mapa, { nome, papeis }));
  } else if (botao.id === "btn-ligar") {
    criarSeta(selecionado, el("f-ligar-para").value, el("f-ligar-pol").value);
  }
});

// ---------- interação no quadro ----------

function pontoNaTela(evento) {
  const r = tela.getBoundingClientRect();
  return { x: evento.clientX - r.left, y: evento.clientY - r.top };
}

function selecionar(id) {
  selecionado = id;
  if (id) abaAtiva = "editar";
  render();
}

function criarVariavelEm(ponto) {
  const v = operar(() => adicionarVariavel(mapa, {
    nome: "Nova variável",
    posicao: { x: ponto.x - 60, y: ponto.y - 20 },
    autor: autor(),
  }));
  selecionar(v.id);
  const campo = el("f-nome");
  campo?.focus();
  campo?.select();
}

function criarSeta(de, para, polaridade = "+") {
  try {
    const s = operar(() => adicionarSeta(mapa, { de, para, autor: autor(), polaridade }));
    selecionar(s.id);
    el("f-mecanismo")?.focus();
  } catch (erro) {
    historico.pop();
    status.textContent = erro.message;
  }
}

let arraste = null;

tela.addEventListener("pointerdown", (e) => {
  const alca = e.target.closest("[data-alca]");
  const grupoVar = e.target.closest("[data-var]");
  const grupoSeta = e.target.closest("[data-seta]");
  const fantasma = e.target.closest("[data-fantasma]");
  if (fantasma) {
    mostrarVisao(fantasma.dataset.fantasma);
    return;
  }
  const p = pontoNaTela(e);

  if (alca) {
    arraste = { tipo: "ligar", de: alca.dataset.alca };
    const v = varPorId(arraste.de);
    const c = centro(caixa(v));
    ligacao.setAttribute("x1", c.x);
    ligacao.setAttribute("y1", c.y);
    ligacao.setAttribute("x2", p.x);
    ligacao.setAttribute("y2", p.y);
    ligacao.style.display = "";
  } else if (grupoVar) {
    const v = varPorId(grupoVar.dataset.var);
    arraste = { tipo: "mover", id: v.id, dx: p.x - v.posicao.x, dy: p.y - v.posicao.y, antes: JSON.stringify(mapa), moveu: false };
    if (selecionado !== v.id) selecionar(v.id);
  } else if (grupoSeta) {
    selecionar(grupoSeta.dataset.seta);
    return;
  } else {
    if (selecionado) selecionar(null);
    return;
  }
  tela.setPointerCapture(e.pointerId);
});

tela.addEventListener("pointermove", (e) => {
  if (!arraste) return;
  const p = pontoNaTela(e);
  if (arraste.tipo === "ligar") {
    ligacao.setAttribute("x2", p.x);
    ligacao.setAttribute("y2", p.y);
  } else {
    arraste.moveu = true;
    moverVariavel(mapa, arraste.id, { x: Math.max(0, p.x - arraste.dx), y: Math.max(0, p.y - arraste.dy) });
    const caixas = new Map(mapa.variaveis.map((v) => [v.id, caixa(v)]));
    renderSetas(caixas);
    renderVariaveis(caixas);
  }
});

tela.addEventListener("pointerup", (e) => {
  if (!arraste) return;
  const atual = arraste;
  arraste = null;
  if (atual.tipo === "ligar") {
    ligacao.style.display = "none";
    const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-var]");
    if (alvo && alvo.dataset.var !== atual.de) criarSeta(atual.de, alvo.dataset.var);
  } else if (atual.moveu) {
    guardarHistorico(atual.antes);
    render();
  }
});

tela.addEventListener("dblclick", (e) => {
  if (e.target.closest("[data-var], [data-seta]")) return;
  criarVariavelEm(pontoNaTela(e));
});

tela.addEventListener("keydown", (e) => {
  const g = e.target.closest("[data-var]");
  if (g && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    selecionar(g.dataset.var);
  }
});

document.addEventListener("keydown", (e) => {
  const digitando = e.target.matches("input, textarea, select");
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !digitando) {
    e.preventDefault();
    desfazer();
  } else if ((e.key === "Delete" || e.key === "Backspace") && !digitando && selecionado) {
    e.preventDefault();
    const id = selecionado;
    selecionado = null;
    operar(() => remover(mapa, id));
  } else if (e.key === "Escape" && !digitando) {
    selecionar(null);
  }
});

// ---------- barra de ferramentas ----------

el("btn-variavel").addEventListener("click", () => {
  const rolagem = el("rolagem");
  criarVariavelEm({ x: rolagem.scrollLeft + rolagem.clientWidth / 2, y: rolagem.scrollTop + rolagem.clientHeight / 2 });
});
el("btn-desfazer").addEventListener("click", desfazer);

el("btn-novo").addEventListener("click", () => {
  if ((mapa.variaveis.length || mapa.setas.length) && !confirm("Começar um mapa novo? O atual continua disponível no Desfazer.")) return;
  guardarHistorico();
  mapa = novoMapa();
  selecionado = null;
  arquivoAberto = null;
  render();
});

function carregar(dado, nome) {
  guardarHistorico();
  mapa = normalizar(dado);
  selecionado = null;
  arquivoAberto = nome ? { name: nome } : null;
  visoes = carregarVisoes();
  estacionamento = carregarEstacionamento();
  entrevista = carregarEntrevista();
  rascunhosEntrevista = {};
  ultimasMudancas = [];
  render();
  if (estadoMotor.motor !== "sem_servidor") sincronizarEstacionamento().then(render);
}

el("btn-abrir").addEventListener("click", async () => {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({ types: [{ description: "Mapa JSON", accept: { "application/json": [".json"] } }] });
      const arquivo = await handle.getFile();
      carregar(JSON.parse(await arquivo.text()), arquivo.name);
      arquivoAberto = handle;
      renderStatus();
    } catch (erro) {
      if (erro.name !== "AbortError") alert(`Não foi possível abrir: ${erro.message}`);
    }
  } else {
    el("arquivo").click();
  }
});

el("arquivo").addEventListener("change", async (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  try {
    carregar(JSON.parse(await arquivo.text()), arquivo.name);
  } catch (erro) {
    alert(`Não foi possível abrir: ${erro.message}`);
  }
  e.target.value = "";
});

el("btn-exemplo").addEventListener("click", async () => {
  try {
    const resposta = await fetch(EXEMPLO);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    carregar(await resposta.json(), null);
  } catch (erro) {
    alert(`Não foi possível carregar o exemplo (o quadro precisa ser aberto por um servidor local): ${erro.message}`);
  }
});

el("btn-salvar").addEventListener("click", async () => {
  const p = pendencias(mapa);
  if (p.length && !confirm(`O arquivo ainda não vale no contrato do modelo de dados:\n\n- ${p.join("\n- ")}\n\nSalvar mesmo assim como rascunho?`)) return;
  const conteudo = JSON.stringify(mapa, null, 2) + "\n";
  try {
    if (window.showSaveFilePicker) {
      if (!arquivoAberto?.createWritable) {
        arquivoAberto = await window.showSaveFilePicker({ suggestedName: "mapa.json", types: [{ description: "Mapa JSON", accept: { "application/json": [".json"] } }] });
      }
      const escrita = await arquivoAberto.createWritable();
      await escrita.write(conteudo);
      await escrita.close();
    } else {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
      link.download = "mapa.json";
      link.click();
      URL.revokeObjectURL(link.href);
    }
    status.textContent = "Mapa salvo.";
  } catch (erro) {
    if (erro.name !== "AbortError") alert(`Não foi possível salvar: ${erro.message}`);
  }
});

campoAutor.addEventListener("change", () => gravarArmazenado(CHAVE_AUTOR, campoAutor.value.trim()));

for (const aba of ABAS) {
  el(`aba-${aba}`).addEventListener("click", () => mudarAba(aba));
}
el("abas").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const passo = e.key === "ArrowRight" ? 1 : -1;
  mudarAba(ABAS[(ABAS.indexOf(abaAtiva) + passo + ABAS.length) % ABAS.length]);
  el(`aba-${abaAtiva}`).focus();
});

// ---------- motor do agente (Bolt 4) ----------
// O quadro grava o pedido pelo servidor local; uma sessão do Claude Code
// roda /visao-sistemica e grava a resposta; o quadro consulta até chegar.

const API = (recorte, recurso) => `/api/sessoes/${encodeURIComponent(recorte)}/${recurso}`;

function carregarVisoes() {
  return lerArmazenado(CHAVE_VISOES + mapa.recorte, (t) => JSON.parse(t)) || [];
}
function gravarVisoes() {
  gravarArmazenado(CHAVE_VISOES + mapa.recorte, JSON.stringify(visoes));
}

function renderVisoes() {
  const digitando = painelVisoes.contains(document.activeElement) && document.activeElement.matches("textarea, input[type=text]");
  if (digitando) return;
  const entrevistaHtml = htmlEntrevista(entrevista, rascunhosEntrevista, { aguardando: estadoMotor.motor === "aguardando", ultimasMudancas });
  painelVisoes.innerHTML = htmlVisoes(mapa, visoes, estadoMotor, estacionamento, entrevistaHtml);
  const campo = el("nova-ideia");
  if (campo) campo.value = rascunhoIdeia;
  for (const [nome, valor] of Object.entries(rascunhoProposta)) {
    const c = painelVisoes.querySelector(`[data-proposta="${nome}"]`);
    if (c) c.value = valor;
  }
}

// O servidor do Bolt 4 responde JSON nas rotas /api; um servidor estático
// qualquer responde HTML 404. É assim que o quadro sabe se pode pedir visão.
async function verificarServidor() {
  try {
    const r = await fetch(API(mapa.recorte, "pedido"));
    const ehApi = (r.headers.get("content-type") || "").includes("application/json");
    if (!ehApi) estadoMotor = { motor: "sem_servidor" };
  } catch {
    estadoMotor = { motor: "sem_servidor" };
  }
  const pendente = lerArmazenado(CHAVE_PENDENTE, (t) => JSON.parse(t));
  if (estadoMotor.motor !== "sem_servidor" && pendente?.recorte === mapa.recorte) aguardar(pendente);
  if (estadoMotor.motor !== "sem_servidor") {
    await sincronizarEstacionamento();
    await sincronizarEntrevista();
  }
  render();
}

async function pedirVisao(gatilho = "pedido") {
  const pedido = montarPedido(mapa, validacao, visoes, { estacionamento, gatilho, entrevista: entrevistaParaPedido(entrevista) });
  try {
    const r = await fetch(API(mapa.recorte, "pedido"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedido),
    });
    const corpo = await r.json();
    if (!r.ok) throw new Error(corpo.erro || `HTTP ${r.status}`);
    const pendente = { recorte: mapa.recorte, pedido: corpo.pedido, comando: corpo.comando };
    gravarArmazenado(CHAVE_PENDENTE, JSON.stringify(pendente));
    aguardar(pendente);
  } catch (erro) {
    estadoMotor = { motor: "erro", erro: `Não foi possível enviar o pedido: ${erro.message}` };
  }
  render();
}

function aguardar(pendente) {
  clearInterval(espera);
  estadoMotor = { motor: "aguardando", pedido: pendente.pedido, comando: pendente.comando };
  espera = setInterval(() => consultarResposta(pendente), 3000);
}

function pararEspera(novoEstado = { motor: "pronto" }) {
  clearInterval(espera);
  espera = null;
  try { localStorage.removeItem(CHAVE_PENDENTE); } catch { /* sem armazenamento */ }
  estadoMotor = novoEstado;
}

async function consultarResposta(pendente) {
  try {
    const r = await fetch(API(pendente.recorte, "resposta"));
    if (r.status !== 200) return; // 202: ainda aguardando
    const resposta = await r.json();
    if (resposta.pedido !== pendente.pedido) return;
    if (pendente.recorte === mapa.recorte) {
      visoes = mesclarVisoes(visoes, resposta);
      gravarVisoes();
      if (resposta.entrevista || resposta.proposta_contexto) {
        registrarRodada(entrevista, resposta);
        rascunhosEntrevista = {};
        rascunhoProposta = {};
        ultimasMudancas = [];
        gravarEntrevista();
      }
    }
    pararEspera({ motor: "pronto", informacaoInsuficiente: !!resposta.informacao_insuficiente });
    abaAtiva = "visoes";
    render();
  } catch {
    /* servidor caiu ou rede instável: tenta de novo no próximo ciclo */
  }
}

painelVisoes.addEventListener("click", async (e) => {
  const botao = e.target.closest("button");
  if (!botao) return;
  if (botao.id === "btn-pedir-visao") {
    botao.disabled = true;
    await pedirVisao();
  } else if (botao.id === "btn-cancelar-pedido") {
    pararEspera();
    render();
  } else if (botao.id === "btn-copiar") {
    try {
      await navigator.clipboard.writeText(estadoMotor.comando);
      botao.textContent = "Copiado";
    } catch {
      botao.textContent = "Selecione e copie";
    }
  } else if (botao.dataset.ref) {
    irParaElemento(botao.dataset.ref);
  } else if (botao.dataset.visaoAcao) {
    agirSobreVisao(botao.dataset.visaoAcao, botao.dataset.chave);
  } else if (botao.id === "btn-estacionar") {
    estacionarIdeia(el("nova-ideia").value, el("nova-ideia-etapa").value);
  } else if (botao.dataset.ideia) {
    mudarStatusIdeia(estacionamento, botao.dataset.ideia, botao.dataset.ideiaStatus);
    gravarEstacionamento();
    render();
  } else if (botao.id === "btn-usar-proposta") {
    usarProposta();
  } else if (botao.id === "btn-outra-rodada") {
    delete entrevista.proposta;
    gravarEntrevista();
    await pedirVisao("entrevista");
  } else if (botao.id === "btn-pular-entrevista") {
    entrevista.encerrada = true;
    gravarEntrevista();
    render();
  }
});

painelVisoes.addEventListener("submit", async (e) => {
  if (e.target.id !== "form-entrevista") return;
  e.preventDefault();
  await enviarRespostas();
});

painelVisoes.addEventListener("input", (e) => {
  if (e.target.id === "nova-ideia") rascunhoIdeia = e.target.value;
  else if (e.target.dataset.proposta) rascunhoProposta[e.target.dataset.proposta] = e.target.value;
  else if (e.target.closest("#form-entrevista")) lerRascunhoEntrevista();
});
painelVisoes.addEventListener("change", (e) => {
  if (e.target.closest("#form-entrevista")) lerRascunhoEntrevista();
});
painelVisoes.addEventListener("focusout", (e) => {
  // Ao sair do campo da ideia, o painel volta a se atualizar normalmente,
  // mas não se o foco foi para um botão do próprio painel (o redesenho
  // engoliria o clique em "Estacionar").
  if (e.target.matches("textarea, input[type=text]") && !painelVisoes.contains(e.relatedTarget)) setTimeout(renderVisoes, 0);
});

// Decisões do squad sobre cada visão (Bolt 5).
function agirSobreVisao(acao, chave) {
  const visao = visoes.find((v) => v.chave === chave);
  if (!visao) return;
  if (acao === "recusada") {
    estadoMotor = { ...estadoMotor, recusando: chave };
    render();
    el("motivo-recusa")?.focus();
  } else if (acao === "cancelar_recusa") {
    estadoMotor = { ...estadoMotor, recusando: null };
    render();
  } else if (acao === "confirmar_recusa") {
    const motivo = el("motivo-recusa")?.value.trim();
    estadoMotor = { ...estadoMotor, recusando: null };
    fecharVisao(chave, "recusada", motivo);
  } else if (acao === "respondida" || acao === "aberta") {
    fecharVisao(chave, acao);
  } else if (acao === "aceitar_seta") {
    try {
      const seta = operar(() => aceitarConexao(mapa, visao.proposta_seta));
      fecharVisao(chave, "aceita");
      selecionado = seta.id; // destaca a seta nova sem sair da aba Visões
      render();
    } catch (erro) {
      historico.pop();
      alert(erro.message);
    }
  } else if (acao === "aceitar_variavel") {
    const variavel = operar(() => aceitarVariavel(mapa, visao.proposta_variavel, posicaoPerto(visao.refs)));
    fecharVisao(chave, "aceita");
    selecionado = variavel.id;
    render();
    centralizarNoQuadro(variavel.id);
  } else if (acao === "estacionar") {
    try {
      estacionar(estacionamento, { texto: visao.texto_estacionado, autor: autor(), agora: dataHoraLocal() });
      gravarEstacionamento();
      fecharVisao(chave, "aceita");
    } catch (erro) {
      alert(erro.message);
    }
  }
}

function fecharVisao(chave, status, motivo) {
  visoes = mudarStatus(visoes, chave, status, motivo);
  gravarVisoes();
  render();
}

// Variável nova aparece perto da primeira variável citada pela visão, ou no
// meio da área visível.
function posicaoPerto(refs) {
  const vizinha = refs.map(varPorId).find(Boolean);
  if (vizinha) return { x: vizinha.posicao.x + 40, y: vizinha.posicao.y + 110 };
  const rolagem = el("rolagem");
  return { x: rolagem.scrollLeft + rolagem.clientWidth / 2 - 60, y: rolagem.scrollTop + rolagem.clientHeight / 2 - 20 };
}

// Clique numa seta fantasma: abre a aba Visões no cartão da sugestão.
function mostrarVisao(chave) {
  abaAtiva = "visoes";
  render();
  const cartao = [...painelVisoes.querySelectorAll("[data-cartao]")].find((c) => c.dataset.cartao === chave);
  if (!cartao) return;
  cartao.scrollIntoView({ block: "center", behavior: "smooth" });
  cartao.classList.add("piscando");
  setTimeout(() => cartao.classList.remove("piscando"), 1600);
}

function estacionarIdeia(texto, retomar_em) {
  try {
    estacionar(estacionamento, { texto, retomar_em, autor: autor(), agora: dataHoraLocal() });
    rascunhoIdeia = "";
    gravarEstacionamento();
    document.activeElement?.blur();
    render();
  } catch (erro) {
    el("ideia-erro").textContent = erro.message;
  }
}

// ---------- estacionamento: local + servidor ----------

function carregarEstacionamento() {
  return lerArmazenado(CHAVE_ESTACIONAMENTO + mapa.recorte, (t) => JSON.parse(t)) || novoEstacionamento();
}

function gravarEstacionamento() {
  gravarArmazenado(CHAVE_ESTACIONAMENTO + mapa.recorte, JSON.stringify(estacionamento));
  if (estadoMotor.motor === "sem_servidor") return;
  fetch(API(mapa.recorte, "estacionamento"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(estacionamento),
  }).catch(() => { /* fica no navegador; sobe na próxima gravação */ });
}

// O arquivo do servidor é o estado oficial; se ainda não existe, o rascunho
// do navegador sobe para ele.
async function sincronizarEstacionamento() {
  try {
    const r = await fetch(API(mapa.recorte, "estacionamento"));
    if (!r.ok) return;
    const doServidor = await r.json();
    if (doServidor.itens?.length) {
      estacionamento = doServidor;
      gravarArmazenado(CHAVE_ESTACIONAMENTO + mapa.recorte, JSON.stringify(estacionamento));
    } else if (estacionamento.itens.length) {
      gravarEstacionamento();
    }
  } catch {
    /* sem servidor: segue com o rascunho local */
  }
}


function irParaElemento(id) {
  if (!existe(id)) return;
  loopAberto = null;
  selecionar(id);
  centralizarNoQuadro(id);
}


// Para inspeção nos testes manuais.
window.hackos = {
  obterMapa: () => structuredClone(mapa),
  obterValidacao: () => structuredClone({ loops: validacao.loops, problemas: validacao.problemas }),
  obterVisoes: () => structuredClone(visoes),
};

render();
verificarServidor();

// ---------- entrevista em rodadas (Bolt 7) ----------

function carregarEntrevista() {
  return lerArmazenado(CHAVE_ENTREVISTA + mapa.recorte, (t) => JSON.parse(t)) || novaEntrevista();
}

function gravarEntrevista() {
  gravarArmazenado(CHAVE_ENTREVISTA + mapa.recorte, JSON.stringify(entrevista));
  if (estadoMotor.motor === "sem_servidor") return;
  fetch(API(mapa.recorte, "entrevista"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrevista),
  }).catch(() => { /* fica no navegador; sobe na próxima gravação */ });
}

async function sincronizarEntrevista() {
  try {
    const r = await fetch(API(mapa.recorte, "entrevista"));
    if (!r.ok) return;
    const doServidor = await r.json();
    if (doServidor.rodadas?.length >= entrevista.rodadas.length && doServidor.rodadas?.length) {
      entrevista = doServidor;
      gravarArmazenado(CHAVE_ENTREVISTA + mapa.recorte, JSON.stringify(entrevista));
    } else if (entrevista.rodadas.length) {
      gravarEntrevista();
    }
  } catch {
    /* sem servidor: segue com o rascunho local */
  }
}

// Lê o formulário para não perder respostas quando o painel se redesenha.
function lerRascunhoEntrevista() {
  const rodada = rodadaAberta(entrevista);
  if (!rodada) return;
  for (const p of rodada.perguntas) {
    const marcadas = [...painelVisoes.querySelectorAll(`input[name="ent-${CSS.escape(p.id)}"]:checked`)].map((x) => x.value);
    const livre = painelVisoes.querySelector(`[data-livre="${CSS.escape(p.id)}"]`)?.value || "";
    const pulada = !!painelVisoes.querySelector(`[data-pular="${CSS.escape(p.id)}"]`)?.checked;
    rascunhosEntrevista[p.id] = { opcoes: marcadas, texto: livre, pulada };
  }
}

async function enviarRespostas() {
  lerRascunhoEntrevista();
  const rodada = rodadaAberta(entrevista);
  if (!rodada) return;
  const respostas = rodada.perguntas.map((p) => {
    const r = rascunhosEntrevista[p.id] || {};
    const resposta = { pergunta: p.id };
    if (r.pulada) resposta.pulada = true;
    if (r.opcoes?.length) resposta.opcoes = r.opcoes;
    if (r.texto?.trim()) resposta.texto = r.texto.trim();
    return resposta;
  });
  try {
    responderRodada(entrevista, respostas);
  } catch (erro) {
    el("entrevista-erro").textContent = erro.message;
    return;
  }
  ultimasMudancas = operar(() => aplicarRespostas(mapa, rodada));
  rascunhosEntrevista = {};
  gravarEntrevista();
  await pedirVisao("entrevista");
}

function usarProposta() {
  const campos = {};
  for (const c of painelVisoes.querySelectorAll("[data-proposta]")) campos[c.dataset.proposta] = c.value;
  if (!(campos.pergunta_problema || "").trim()) return;
  operar(() => aceitarProposta(mapa, entrevista, campos));
  rascunhoProposta = {};
  ultimasMudancas = [];
  gravarEntrevista();
  render();
}
