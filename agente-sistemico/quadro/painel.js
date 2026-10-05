// Painel "Análise" do quadro (Bolt 3): os 4 blocos do template da aula
// "Pensamento Sistêmico + Cynefin", alimentados pelo validador ao vivo.
// Só monta HTML; os eventos ficam em app.js.

import { chaveLoop } from "./estado.js";

export const NIVEIS_MEADOWS = [
  ["parametro", "1 · Parâmetro (números, mais gente, mais verba)"],
  ["atraso_feedback", "2 · Atrasos e loops de feedback"],
  ["fluxo_informacao", "3 · Fluxo de informação (quem sabe o quê, quando)"],
  ["regra", "4 · Regra e incentivo"],
  ["meta", "5 · Meta do sistema"],
  ["modelo_mental", "6 · Modelo mental / paradigma"],
];

export const ARQUETIPOS = [
  ["solucoes_que_falham", "Soluções que falham"],
  ["transferencia_responsabilidade", "Transferência de responsabilidade"],
  ["limites_ao_crescimento", "Limites ao crescimento"],
  ["escalada", "Escalada"],
  ["tragedia_dos_comuns", "Tragédia dos comuns"],
  ["sucesso_para_bem_sucedidos", "Sucesso para os bem-sucedidos"],
];

const DOMINIOS = [
  ["claro", "Claro"], ["complicado", "Complicado"], ["complexo", "Complexo"],
  ["caotico", "Caótico"], ["confusao", "Confusão"],
];

// Em que bloco do template cada problema do validador aparece.
const BLOCO_DO_PROBLEMA = {
  nome_com_verbo_ou_direcao: 1,
  variavel_sem_ator: 1,
  excesso_variaveis: 1,
  variavel_fora_de_loop: 1,
  nenhum_loop: 2,
  seta_sem_mecanismo: 2,
  seta_orfa: 2,
  b_sem_meta: 2,
};

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Loops que o squad nomeou ficam em destaque; os demais (inclusive os
// "combinados", que existem no grafo mas ninguém contou como história)
// ficam agrupados como "sem nome", do mais curto para o mais longo.
export function organizarLoops(mapa, validacao) {
  const anotacoes = new Map(mapa.loops_anotados.map((l) => [chaveLoop(l.setas), l]));
  const setas = new Map(mapa.setas.map((s) => [s.id, s]));
  const nomeVar = (id) => mapa.variaveis.find((v) => v.id === id)?.nome || id;

  const todos = validacao.loops.map((loop) => {
    const chave = chaveLoop(loop.setas);
    const primeira = setas.get(loop.setas[0]);
    const caminho = [nomeVar(primeira.de), ...loop.setas.map((id) => nomeVar(setas.get(id).para))];
    return { ...loop, chave, caminho, anotacao: anotacoes.get(chave) || null };
  });
  const nomeados = todos.filter((l) => l.anotacao?.nome?.trim());
  const semNome = todos.filter((l) => !l.anotacao?.nome?.trim());
  semNome.forEach((l, i) => { l.rotulo = `${l.tipo} sem nome ${i + 1}`; });
  nomeados.forEach((l) => { l.rotulo = l.anotacao.nome; });
  // Anotações cujo loop deixou de existir (o mapa mudou depois de anotar).
  const chavesAtuais = new Set(todos.map((l) => l.chave));
  const orfas = mapa.loops_anotados.filter((l) => !chavesAtuais.has(chaveLoop(l.setas)));
  return { nomeados, semNome, orfas };
}

function htmlProblemas(problemas, bloco) {
  const doBloco = problemas.filter((p) => BLOCO_DO_PROBLEMA[p.codigo] === bloco);
  if (!doBloco.length) return "";
  return `<ul class="perguntas">${doBloco.map((p) => `
    <li><button type="button" class="pergunta" data-ir="${esc(JSON.stringify({ codigo: p.codigo, refs: p.refs || [] }))}">${esc(p.mensagem)}</button></li>`).join("")}
  </ul>`;
}

function htmlItemLoop(l, loopAberto) {
  const aberto = loopAberto === l.chave;
  const semMeta = l.tipo === "B" && !l.anotacao?.meta;
  return `
    <li class="loop ${l.tipo === "R" ? "reforco" : "balanco"} ${aberto ? "aberto" : ""}">
      <button type="button" class="loop-cabeca" data-loop="${esc(l.chave)}" aria-expanded="${aberto}">
        <span class="selo ${l.tipo}">${l.tipo}</span>
        <span class="loop-nome">${esc(l.rotulo)}</span>
        <span class="loop-info">${l.setas.length} setas · ${l.negativas} neg.${l.tem_atraso ? " · ‖" : ""}${semMeta ? " · sem meta" : ""}</span>
      </button>
      ${aberto ? htmlFormLoop(l) : ""}
    </li>`;
}

function htmlFormLoop(l) {
  const a = l.anotacao || {};
  return `
    <div class="loop-corpo">
      <p class="caminho">${l.caminho.map(esc).join(" → ")}</p>
      <p class="dica">${l.negativas} seta(s) negativa(s): ${l.negativas % 2 === 0 ? "número par, reforçador (R)" : "número ímpar, balanceador (B)"}.</p>
      <label for="loop-nome">Nome e história</label>
      <input type="text" id="loop-nome" data-loop-campo="nome" placeholder="Ex.: R1 · Espiral da urgência" value="${esc(a.nome)}">
      <textarea data-loop-campo="historia" placeholder="Conte o loop em uma frase. Se a história não fecha, o loop não fecha.">${esc(a.historia)}</textarea>
      ${l.tipo === "B" ? `
        <label for="loop-meta">Meta e lacuna</label>
        <p class="dica">Todo loop B busca uma meta. Qual é, e qual a distância até ela?</p>
        <input type="text" id="loop-meta" data-loop-campo="meta" class="obrigatorio" placeholder="Meta que o loop persegue" value="${esc(a.meta)}">
        <input type="text" data-loop-campo="lacuna" placeholder="Lacuna entre a meta e a situação atual" value="${esc(a.lacuna)}">` : ""}
      ${l.anotacao ? `<div class="linha-acoes"><button type="button" class="perigo" data-remover-anotacao="${esc(l.chave)}">Tirar o nome deste loop</button></div>` : ""}
    </div>`;
}

export function htmlPainel(mapa, validacao, { loopAberto, cynefinDoProjeto } = {}) {
  const { nomeados, semNome, orfas } = organizarLoops(mapa, validacao);
  const todos = [...nomeados, ...semNome];
  const a = mapa.analise;
  const opcoesLoop = todos.map((l) => `<option value="${esc(l.chave)}" ${a.loop_principal && chaveLoop(a.loop_principal) === l.chave ? "selected" : ""}>${esc(l.rotulo)}</option>`).join("");
  const opcoesVar = mapa.variaveis.map((v) => `<option value="${v.id}" ${a.comportamento_no_tempo?.variavel === v.id ? "selected" : ""}>${esc(v.nome)}</option>`).join("");

  return `
    <h2>Análise sistêmica</h2>
    <p class="dica">Template da aula: variáveis → CLD → análise → intervenção. O painel atualiza a cada edição; as perguntas apontam para o quadro.</p>
    ${validacao.truncado ? `<p class="aviso">O mapa tem tantas ligações que paramos de contar loops em 1000. Vale reduzir a fronteira.</p>` : ""}

    <section class="bloco">
      <h3>Bloco 1 · Variáveis <span class="contagem">${mapa.variaveis.length}/12</span></h3>
      ${htmlProblemas(validacao.problemas, 1) || `<p class="ok">Nomes, atores e tamanho do mapa sem pendências.</p>`}
    </section>

    <section class="bloco">
      <h3>Bloco 2 · Loops <span class="contagem">${validacao.loops.length}</span></h3>
      ${htmlProblemas(validacao.problemas, 2)}
      ${nomeados.length ? `<ul class="loops">${nomeados.map((l) => htmlItemLoop(l, loopAberto)).join("")}</ul>` : ""}
      ${semNome.length ? `
        <details class="sem-nome" ${nomeados.length ? "" : "open"}>
          <summary>${nomeados.length ? `Loops sem nome e combinados (${semNome.length})` : `Loops encontrados (${semNome.length}). Dê nome aos que contam a história do sistema.`}</summary>
          <ul class="loops">${semNome.map((l) => htmlItemLoop(l, loopAberto)).join("")}</ul>
        </details>` : ""}
      ${orfas.length ? `<p class="aviso">${orfas.length} loop(s) com nome deixaram de existir porque o mapa mudou: ${orfas.map((o) => esc(o.nome || "sem nome")).join(", ")}.
        <button type="button" data-limpar-orfas>Remover esses nomes</button></p>` : ""}
    </section>

    <section class="bloco">
      <h3>Bloco 3 · Análise</h3>
      <label for="a-principal">Loop principal</label>
      <select id="a-principal" data-analise="loop_principal"><option value="">—</option>${opcoesLoop}</select>
      <label>Classificação Cynefin</label>
      ${cynefinDoProjeto ? `<p class="dica">A Triagem Cynefin classificou o desafio como ${esc(cynefinDoProjeto)}.</p>` : ""}
      <div class="opcoes">${DOMINIOS.map(([v, r]) => `<label><input type="radio" name="cynefin" value="${v}" ${a.cynefin?.dominio === v ? "checked" : ""}> ${r}</label>`).join("")}</div>
      ${a.cynefin ? `<textarea data-analise="cynefin.justificativa" class="obrigatorio" placeholder="Por que este domínio? Uma frase.">${esc(a.cynefin.justificativa)}</textarea>` : ""}
      <label for="a-delay">Delay identificado</label>
      <textarea id="a-delay" data-analise="delay_identificado" placeholder="Onde o efeito demora a aparecer, e o que isso esconde?">${esc(a.delay_identificado)}</textarea>
      <label for="a-ignorada">Variável ignorada (mas relevante)</label>
      <textarea id="a-ignorada" data-analise="variavel_ignorada" placeholder="O que ficou de fora do mapa e pode mudar a leitura?">${esc(a.variavel_ignorada)}</textarea>
      <label for="a-arquetipo">Arquétipo</label>
      <select id="a-arquetipo" data-analise="arquetipo"><option value="">— nenhum ou ainda não sabemos —</option>
        ${ARQUETIPOS.map(([v, r]) => `<option value="${v}" ${a.arquetipo === v ? "selected" : ""}>${r}</option>`).join("")}</select>
      <label for="a-cnt">Comportamento ao longo do tempo</label>
      <p class="dica">Escolha uma variável do loop principal e descreva a curva dela.</p>
      <select id="a-cnt" data-analise="comportamento_no_tempo.variavel"><option value="">—</option>${opcoesVar}</select>
      ${a.comportamento_no_tempo ? `<textarea data-analise="comportamento_no_tempo.descricao" class="obrigatorio" placeholder="Ex.: sobe devagar e acelera quando R1 passa a dominar.">${esc(a.comportamento_no_tempo.descricao)}</textarea>` : ""}
    </section>

    <section class="bloco">
      <h3>Bloco 4 · Intervenção</h3>
      <p class="dica">Onde intervir no sistema, não o que construir. Ideias de produto ficam para a ideação.</p>
      ${mapa.alavancas.length ? `<ul class="alavancas">${mapa.alavancas.map((alv) => htmlAlavanca(mapa, alv, organizarRotulos(todos))).join("")}</ul>` : ""}
      ${htmlFormAlavanca(mapa, todos)}
    </section>`;
}

function organizarRotulos(loops) {
  return new Map(loops.map((l) => [l.chave, l.rotulo]));
}

function descreverAlvo(mapa, alvo, rotulos) {
  if (alvo.tipo === "loop") return `loop ${rotulos.get(chaveLoop(alvo.refs)) || "(desfeito)"}`;
  if (alvo.tipo === "variavel") return alvo.refs.map((id) => mapa.variaveis.find((v) => v.id === id)?.nome || id).join(", ");
  return alvo.refs.map((id) => {
    const s = mapa.setas.find((x) => x.id === id);
    const n = (v) => mapa.variaveis.find((x) => x.id === v)?.nome || v;
    return s ? `${n(s.de)} → ${n(s.para)}` : id;
  }).join("; ");
}

function htmlAlavanca(mapa, alv, rotulos) {
  const nivel = NIVEIS_MEADOWS.find(([v]) => v === alv.nivel_meadows)?.[1] || alv.nivel_meadows;
  return `
    <li class="alavanca">
      <p><strong>${esc(descreverAlvo(mapa, alv.alvo, rotulos))}</strong></p>
      <p class="dica">${esc(nivel)}</p>
      <p>${esc(alv.impacto_esperado)}</p>
      <p class="dica">Teste de sanidade: ${esc(alv.teste_sanidade)}</p>
      <button type="button" class="perigo" data-remover-alavanca="${alv.id}">Remover</button>
    </li>`;
}

function htmlFormAlavanca(mapa, loops) {
  return `
    <details class="nova-alavanca">
      <summary>Nova alavanca</summary>
      <label for="alv-alvo">Onde intervir</label>
      <select id="alv-alvo">
        <optgroup label="Loops">${loops.map((l) => `<option value="loop:${esc(l.chave)}">${esc(l.rotulo)}</option>`).join("")}</optgroup>
        <optgroup label="Variáveis">${mapa.variaveis.map((v) => `<option value="variavel:${v.id}">${esc(v.nome)}</option>`).join("")}</optgroup>
        <optgroup label="Setas">${mapa.setas.map((s) => {
          const n = (id) => mapa.variaveis.find((v) => v.id === id)?.nome || id;
          return `<option value="seta:${s.id}">${esc(n(s.de))} → ${esc(n(s.para))}</option>`;
        }).join("")}</optgroup>
      </select>
      <label for="alv-nivel">Nível de alavancagem (Meadows)</label>
      <p class="dica">Do mais fraco ao mais forte. Mudar o que se mede costuma mudar o sistema inteiro.</p>
      <select id="alv-nivel"><option value="">—</option>${NIVEIS_MEADOWS.map(([v, r]) => `<option value="${v}">${r}</option>`).join("")}</select>
      <label for="alv-impacto">Impacto esperado</label>
      <textarea id="alv-impacto" placeholder="O que muda no comportamento dos loops?"></textarea>
      <label for="alv-sanidade">Teste de sanidade</label>
      <textarea id="alv-sanidade" placeholder="Se aumentarmos X, o sistema melhora ou piora?"></textarea>
      <p class="erro" id="alv-erro" role="alert"></p>
      <div class="linha-acoes"><button type="button" id="btn-alavanca">Adicionar alavanca</button></div>
    </details>`;
}
