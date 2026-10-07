import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { normalizar, anotarLoop, removerAnotacao, atualizarAnalise, adicionarAlavanca, removerAlavanca, remover, pendencias, chaveLoop } from "../estado.js";
import { validarMapa } from "../validador.js";
import { organizarLoops, htmlPainel } from "../painel.js";
import { mapaDe, lojaAlfa, exercicio2 } from "./gabaritos.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const lastmile = () =>
  normalizar(JSON.parse(readFileSync(path.resolve(aqui, "../../../modelo-dados/exemplos/lastmile/mapa.json"), "utf-8")));

test("last-mile: os 3 loops anotados aparecem em destaque, com o caminho legível", () => {
  const m = lastmile();
  const { nomeados, semNome, orfas } = organizarLoops(m, validarMapa(m));
  assert.deepEqual(nomeados.map((l) => l.rotulo), ["R1 · Espiral da urgência", "B1 · Correr mais", "B2 · Limite do crescimento"]);
  assert.equal(semNome.length, 0);
  assert.equal(orfas.length, 0);
  assert.deepEqual(nomeados[0].caminho, [
    "Tempo médio de entrega", "Rotas classificadas como prioritárias", "Realocações de entregadores", "Tempo médio de entrega",
  ]);
});

test("Loja Alfa sem anotações: os 6 loops ficam sem nome, do mais curto ao mais longo", () => {
  const m = mapaDe(lojaAlfa.setas);
  const { nomeados, semNome } = organizarLoops(m, validarMapa(m));
  assert.equal(nomeados.length, 0);
  assert.deepEqual(semNome.map((l) => l.setas.length), [3, 4, 5, 5, 6, 7]);
  assert.equal(semNome[0].rotulo, "B sem nome 1");
});

test("anotar loop B com meta tira o problema b_sem_meta; tirar o nome devolve", () => {
  const m = mapaDe(exercicio2[1].setas);
  const setas = validarMapa(m).loops[0].setas;
  anotarLoop(m, setas, { nome: "B · Fila", meta: "Fila zero", lacuna: "" });
  assert.equal(m.loops_anotados[0].lacuna, undefined, "campo vazio sai do objeto");
  assert.ok(!validarMapa(m).problemas.some((p) => p.codigo === "b_sem_meta"));
  anotarLoop(m, [...setas].reverse(), { historia: "A fila puxa a pressão." });
  assert.equal(m.loops_anotados.length, 1, "mesma chave, mesma anotação");
  removerAnotacao(m, setas);
  assert.ok(validarMapa(m).problemas.some((p) => p.codigo === "b_sem_meta"));
});

test("anotação órfã: se o mapa muda e o loop se desfaz, o painel avisa", () => {
  const m = lastmile();
  m.setas.find((s) => s.id === "seta_09").polaridade = "+";
  remover(m, "seta_08");
  const { orfas } = organizarLoops(m, validarMapa(m));
  assert.deepEqual(orfas.map((o) => o.nome), [], "remover a seta já apaga a anotação do loop");
  m.loops_anotados.push({ setas: ["seta_07", "seta_99"], nome: "Antigo" });
  assert.deepEqual(organizarLoops(m, validarMapa(m)).orfas.map((o) => o.nome), ["Antigo"]);
});

test("análise: campos vazios saem; Cynefin sem justificativa vira pendência", () => {
  const m = lastmile();
  atualizarAnalise(m, { delay_identificado: "" });
  assert.equal("delay_identificado" in m.analise, false);
  atualizarAnalise(m, { cynefin: { dominio: "complicado", justificativa: "" } });
  assert.ok(pendencias(m).some((p) => p.includes("Cynefin")));
  atualizarAnalise(m, { cynefin: { justificativa: "Um especialista resolveria com os dados." } });
  assert.equal(m.analise.cynefin.dominio, "complicado");
  assert.deepEqual(pendencias(m), []);
  atualizarAnalise(m, { cynefin: { dominio: "" } });
  assert.equal("cynefin" in m.analise, false);
  atualizarAnalise(m, { loop_principal: [] });
  assert.equal("loop_principal" in m.analise, false);
});

test("alavanca: exige onde, nível, impacto e teste de sanidade; não tem campo de solução", () => {
  const m = lastmile();
  assert.throws(() => adicionarAlavanca(m, { alvo: { tipo: "variavel", refs: ["var_pressao"] }, autor: "mem_ana" }), /nível de Meadows/);
  const alv = adicionarAlavanca(m, {
    alvo: { tipo: "variavel", refs: ["var_pressao"] },
    nivel_meadows: "fluxo_informacao",
    impacto_esperado: "A operação vê a carga real por praça.",
    teste_sanidade: "Se aumentarmos a visibilidade da carga, a pressão cai?",
    autor: "mem_ana",
  });
  assert.equal(alv.id, "alv_03");
  assert.deepEqual(Object.keys(alv).sort(), ["alvo", "autor", "id", "impacto_esperado", "nivel_meadows", "teste_sanidade"]);
  removerAlavanca(m, alv.id);
  assert.equal(m.alavancas.length, 2);
});

test("htmlPainel monta os 4 blocos e escapa texto do usuário", () => {
  const m = lastmile();
  m.loops_anotados[0].nome = "<script>alert(1)</script>";
  const html = htmlPainel(m, validarMapa(m), { loopAberto: chaveLoop(m.loops_anotados[0].setas) });
  for (const bloco of ["Bloco 1", "Bloco 2", "Bloco 3", "Bloco 4"]) assert.ok(html.includes(bloco));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

// ---------- Matriz CSD (Bolt 8) ----------

test("htmlPainel sem csd não quebra e mostra a Matriz CSD vazia", () => {
  const m = lastmile();
  const html = htmlPainel(m, validarMapa(m), {});
  assert.ok(html.includes("Matriz CSD"));
  assert.ok(html.includes("Nenhum item ainda"));
});

test("htmlPainel lista os itens da CSD recebida, com status e origem pelo nome", () => {
  const m = lastmile();
  const csd = {
    itens: [
      { id: "csd_01", tipo: "suposicao", texto: "<b>x</b>", status: "proposto", pergunta_pesquisa: "Aumenta?", origem: { etapa: "mapa_sistemico", ref: "seta_03" } },
      { id: "csd_02", tipo: "duvida", texto: "y", status: "confirmado", tarefa_discovery: "Medir" },
    ],
  };
  const html = htmlPainel(m, validarMapa(m), { csd });
  assert.ok(html.includes("Matriz CSD <span class=\"contagem\">2</span>"));
  assert.ok(!html.includes("<b>x</b>"), "texto do item é escapado");
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"));
  assert.ok(html.includes("Carga por entregador") || html.includes("Tempo médio de entrega"), "origem aparece pelo nome da variável, não pelo id");
  assert.ok(html.includes("data-csd-status=\"confirmado\" data-csd-id=\"csd_01\""));
  assert.ok(!html.includes("data-csd-status=\"confirmado\" data-csd-id=\"csd_02\""), "item já confirmado não tem botão para confirmar de novo");
});

test("htmlPainel: alavanca com suposições mostra a contagem de confirmadas", () => {
  const m = lastmile();
  const csd = { itens: [{ id: "csd_01", tipo: "suposicao", status: "confirmado" }, { id: "csd_02", tipo: "suposicao", status: "proposto" }] };
  adicionarAlavanca(m, {
    alvo: { tipo: "variavel", refs: ["var_pressao"] }, nivel_meadows: "regra",
    impacto_esperado: "x", teste_sanidade: "y", autor: "mem_ana", suposicoes: ["csd_01", "csd_02"],
  }, csd.itens);
  const html = htmlPainel(m, validarMapa(m), { csd });
  assert.match(html, /Depende de 2 suposições da CSD\s*\(1 confirmada, 1 ainda não\)/);
});

test("htmlPainel: formulário de nova alavanca só oferece suposições do tipo certo", () => {
  const m = lastmile();
  const csd = { itens: [{ id: "csd_01", tipo: "suposicao", texto: "Capacidade real" }, { id: "csd_02", tipo: "duvida", texto: "Não é suposição" }] };
  const html = htmlPainel(m, validarMapa(m), { csd });
  assert.ok(html.includes("<option value=\"csd_01\">Capacidade real</option>"));
  assert.ok(!html.includes("<option value=\"csd_02\">"), "dúvida não é suposição, não entra nas opções da alavanca");
});
