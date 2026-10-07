// Integração DOM/rede do Cadastro do Time. Lógica pura mora em estado.js.
import {
  novoSquad, normalizar, adicionarMembro, removerMembro, atualizarMembro,
  alternarFrente, adicionarAreaAfinidade, removerAreaAfinidade, atualizarAreaAfinidade,
  paraContrato, pendencias, avisos, resumoEquipe, FRENTES,
} from "./estado.js";
import { htmlVisaoEquipe } from "./visao.js";

let squad = novoSquad();

const elHackathon = document.getElementById("hackathon");
const elMembros = document.getElementById("membros");
const elPendencias = document.getElementById("pendencias");
const elPendenciasLista = elPendencias.querySelector("ul");
const elAvisos = document.getElementById("avisos");
const elAvisosLista = elAvisos.querySelector("ul");
const elStatus = document.getElementById("status");
const elPainelVisao = document.getElementById("painel-visao");
const elContador = document.getElementById("contador-membros");
const tplMembro = document.getElementById("tpl-membro");
const tplArea = document.getElementById("tpl-area");

// Preenchido por render() a cada chamada; focarMembroId() consulta depois
// que os nós já estão no DOM (ver comentário em adicionar-integrante).
const nosPorMembro = new Map();

function render() {
  elHackathon.value = squad.hackathon;
  elMembros.innerHTML = "";
  nosPorMembro.clear();
  squad.membros.forEach((membro, indice) => {
    const no = renderMembro(membro, indice);
    nosPorMembro.set(membro.id, no);
    elMembros.appendChild(no);
  });
  const n = squad.membros.length;
  elContador.textContent = n === 0 ? "Nenhum integrante cadastrado ainda." : `${n} integrante${n > 1 ? "s" : ""} cadastrado${n > 1 ? "s" : ""}.`;
  renderAvisos();
  elPainelVisao.innerHTML = htmlVisaoEquipe(resumoEquipe(squad));
}

// Rola até o cartão e foca o campo "nome" — é o feedback de que o toque em
// "+ Integrante" funcionou. Sem isso, um cartão novo pode nascer fora da
// área visível (ex.: squad com vários integrantes, tela de celular curta)
// e o squad, sem ver nada mudar, toca de novo — foi exatamente o que
// gerou o relato de "apareceu duplicado" (ver BOLTS.md, Bolt 2.1).
function focarMembro(id) {
  const no = nosPorMembro.get(id);
  if (!no) return;
  no.scrollIntoView({ behavior: "smooth", block: "center" });
  no.querySelector('[data-campo="nome"]').focus();
}

function renderAvisos() {
  const lista = avisos(squad);
  elAvisosLista.innerHTML = lista.map((a) => `<li>${escapeHtml(a.mensagem)}</li>`).join("");
  elAvisos.hidden = lista.length === 0;
}

function renderMembro(membro, indice) {
  const no = tplMembro.content.firstElementChild.cloneNode(true);
  no.dataset.id = membro.id;
  const elNumero = no.querySelector("[data-numero]");
  const atualizarNumero = () => {
    const nome = (membro.nome || "").trim();
    elNumero.textContent = `Integrante ${indice + 1}${nome ? " — " + nome : ""}`;
  };
  atualizarNumero();
  no.querySelector('[data-campo="nome"]').value = membro.nome;

  for (const caixa of no.querySelectorAll("[data-frente]")) {
    caixa.checked = membro.frentes.includes(caixa.dataset.frente);
    caixa.addEventListener("change", () => {
      alternarFrente(squad, membro.id, caixa.dataset.frente, caixa.checked);
    });
  }

  no.querySelector('[data-campo="nome"]').addEventListener("input", (ev) => {
    atualizarMembro(squad, membro.id, { nome: ev.target.value });
    atualizarNumero(); // cabeçalho do cartão acompanha o nome sem precisar de render() — digitar não pode perder o foco
    renderAvisos(); // tira o aviso de "sem nome" assim que o squad começa a digitar, sem esperar o próximo render
  });

  no.querySelector('[data-acao="remover-membro"]').addEventListener("click", () => {
    removerMembro(squad, membro.id);
    render();
  });

  const areasEl = no.querySelector("[data-areas]");
  membro.areas_afinidade.forEach((area, indice) => {
    areasEl.appendChild(renderArea(membro.id, indice, area));
  });

  no.querySelector('[data-acao="adicionar-area"]').addEventListener("click", () => {
    adicionarAreaAfinidade(squad, membro.id, {});
    render();
  });

  return no;
}

function renderArea(membroId, indice, area) {
  const no = tplArea.content.firstElementChild.cloneNode(true);
  no.querySelector('[data-campo="area"]').value = area.area;
  no.querySelector('[data-campo="nivel"]').value = area.nivel;
  no.querySelector('[data-campo="como_agrega"]').value = area.como_agrega;

  no.querySelector('[data-campo="area"]').addEventListener("input", (ev) => {
    atualizarAreaAfinidade(squad, membroId, indice, { area: ev.target.value });
  });
  no.querySelector('[data-campo="nivel"]').addEventListener("change", (ev) => {
    atualizarAreaAfinidade(squad, membroId, indice, { nivel: ev.target.value });
  });
  no.querySelector('[data-campo="como_agrega"]').addEventListener("input", (ev) => {
    atualizarAreaAfinidade(squad, membroId, indice, { como_agrega: ev.target.value });
  });
  no.querySelector('[data-acao="remover-area"]').addEventListener("click", () => {
    removerAreaAfinidade(squad, membroId, indice);
    render();
  });

  return no;
}

elHackathon.addEventListener("input", (ev) => {
  squad.hackathon = ev.target.value;
});

const btnMembro = document.getElementById("btn-membro");
btnMembro.addEventListener("click", () => {
  // Guarda contra toque duplo/fantasma (comum em touchscreen): sem isso,
  // um único toque físico às vezes dispara 2 cliques e cria 2 cartões em
  // branco de uma vez — foi o que o Lucas relatou como "apareceu
  // duplicado" e "não consegui salvar o segundo" (ver BOLTS.md, Bolt 2.1,
  // Correção pós-teste real). O botão some por um instante, visível, em
  // vez de só desabilitar sem explicação.
  if (btnMembro.disabled) return;
  btnMembro.disabled = true;
  const membro = adicionarMembro(squad, {});
  render();
  focarMembro(membro.id); // feedback imediato: o squad vê o cartão novo e o teclado abre
  setTimeout(() => { btnMembro.disabled = false; }, 400);
});

async function salvar() {
  const motivos = pendencias(squad);
  elPendenciasLista.innerHTML = motivos.map((m) => `<li>${escapeHtml(m)}</li>`).join("");
  elPendencias.hidden = motivos.length === 0;
  if (motivos.length) {
    elStatus.textContent = "Corrija as pendências antes de salvar.";
    elStatus.className = "status erro";
    return;
  }
  const contrato = paraContrato(squad);
  elStatus.textContent = "Salvando…";
  elStatus.className = "status";
  try {
    const resposta = await fetch("/api/squad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contrato),
    });
    const corpo = await resposta.json();
    if (!resposta.ok) {
      elStatus.textContent = `Não salvou: ${corpo.erro}${corpo.detalhes ? " — " + corpo.detalhes.join("; ") : ""}`;
      elStatus.className = "status erro";
      return;
    }
    elStatus.textContent = `Salvo — ${corpo.membros} integrante(s).`;
    elStatus.className = "status ok";
  } catch (erro) {
    elStatus.textContent = `Não salvou: ${erro.message}`;
    elStatus.className = "status erro";
  }
}

document.getElementById("btn-salvar").addEventListener("click", salvar);
document.getElementById("btn-salvar-rodape").addEventListener("click", salvar);

function escapeHtml(texto) {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const abas = [
  { botao: document.getElementById("aba-cadastro"), painel: document.getElementById("painel-cadastro") },
  { botao: document.getElementById("aba-visao"), painel: document.getElementById("painel-visao") },
];
for (const atual of abas) {
  atual.botao.addEventListener("click", () => {
    for (const outra of abas) {
      const ativa = outra === atual;
      outra.painel.hidden = !ativa;
      outra.botao.setAttribute("aria-selected", String(ativa));
    }
  });
}

async function carregar() {
  try {
    const resposta = await fetch("/api/squad");
    if (resposta.ok) {
      squad = normalizar(await resposta.json());
    }
  } catch {
    // Sem servidor (aberto como arquivo): segue com squad vazio.
  }
  render();
}

carregar();
