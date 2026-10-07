// Bolt 7b: rascunho de CLD proposto pelo agente, aceito/recusado item a item.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { normalizar, aceitarSetaRascunho, ehIdTemporario, setaJaExiste } from "../estado.js";
import { situacaoSetaRascunho, atualizarRascunho, mesclarVisoes, montarPedido, htmlVisoes } from "../visoes.js";
import { validarMapa } from "../validador.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const lastmile = () =>
  normalizar(JSON.parse(readFileSync(path.resolve(aqui, "../../../modelo-dados/exemplos/lastmile/mapa.json"), "utf-8")));

// Uma variável liga a outra existente (var_satisfacao), a segunda só liga
// entre as duas variáveis do próprio rascunho.
const RASCUNHO = {
  variaveis: [
    { id_temp: "tmp_a", nome: "Reputação do app nas lojas de aplicativo", tipo: "resultado" },
    { id_temp: "tmp_b", nome: "Candidatos a entregador", tipo: "neutra" },
  ],
  setas: [
    { de: "var_satisfacao", para: "tmp_a", polaridade: "+", atraso: false, mecanismo: "Lojistas satisfeitos deixam avaliações melhores." },
    { de: "tmp_a", para: "tmp_b", polaridade: "+", atraso: true, mecanismo: "Reputação melhor atrai candidatos a entregador." },
  ],
};

function visaoRascunho(overrides = {}) {
  return {
    chave: "ped_1:vis_r", status: "aberta", tipo: "rascunho_mapa",
    texto: "t", pergunta: "p?", refs: [], fonte_teorica: { referencia: "x", suplementar: false },
    proposta_rascunho: RASCUNHO, mapaTemp: {}, decisoesSetas: [null, null],
    ...overrides,
  };
}

test("ehIdTemporario distingue tmp_ de ids reais", () => {
  assert.equal(ehIdTemporario("tmp_a"), true);
  assert.equal(ehIdTemporario("var_01"), false);
});

test("situação da seta do rascunho: falta variável, pode aceitar, já existe", () => {
  const m = lastmile();
  assert.equal(situacaoSetaRascunho(m, RASCUNHO.setas[0], {}), "falta_variavel", "tmp_a ainda não foi adicionado");
  // seta_12 do exemplo já liga var_satisfacao -> var_contratos (+); fingir que
  // tmp_a virou var_contratos reproduz essa seta.
  assert.equal(situacaoSetaRascunho(m, RASCUNHO.setas[0], { tmp_a: "var_contratos" }), "ja_existe");
  assert.equal(situacaoSetaRascunho(m, RASCUNHO.setas[0], { tmp_a: "var_cancelamentos" }), "pode_aceitar");
});

test("aceitar seta do rascunho: recusa sem as variáveis resolvidas, aceita depois de resolver", () => {
  const m = lastmile();
  assert.throws(() => aceitarSetaRascunho(m, RASCUNHO.setas[0], {}), /Adicione as variáveis/);
  const seta = aceitarSetaRascunho(m, RASCUNHO.setas[0], { tmp_a: "var_cancelamentos" });
  assert.equal(seta.de, "var_satisfacao");
  assert.equal(seta.para, "var_cancelamentos");
  assert.equal(seta.autor, "agente");
  assert.equal(seta.status, "aceita");
  assert.equal(seta.classificacao, "suposicao");
  assert.equal(setaJaExiste(m, seta), true);
});

test("aceitar a mesma seta duas vezes (já resolvida) é recusado por aceitarConexao", () => {
  const m = lastmile();
  const mapaTemp = { tmp_a: "var_cancelamentos" };
  aceitarSetaRascunho(m, RASCUNHO.setas[0], mapaTemp);
  assert.throws(() => aceitarSetaRascunho(m, RASCUNHO.setas[0], mapaTemp), /já está no mapa/);
});

test("mesclarVisoes inicializa mapaTemp vazio e uma decisão nula por seta do rascunho", () => {
  const visoes = mesclarVisoes([], {
    pedido: "ped_1",
    visoes: [{
      id: "vis_r", tipo: "rascunho_mapa", texto: "t", pergunta: "p?", refs: [],
      fonte_teorica: { referencia: "x", suplementar: false }, status: "aberta",
      proposta_rascunho: RASCUNHO,
    }],
  });
  assert.deepEqual(visoes[0].mapaTemp, {});
  assert.deepEqual(visoes[0].decisoesSetas, [null, null]);
});

test("atualizarRascunho substitui só a visão da chave indicada", () => {
  const visoes = [visaoRascunho({ chave: "a" }), visaoRascunho({ chave: "b" })];
  const atualizadas = atualizarRascunho(visoes, "a", { mapaTemp: { tmp_a: "var_01" } });
  assert.deepEqual(atualizadas[0].mapaTemp, { tmp_a: "var_01" });
  assert.deepEqual(atualizadas[1].mapaTemp, {});
});

test("montarPedido não vaza mapaTemp nem decisoesSetas nas visões abertas (contrato não conhece o rascunho do quadro)", () => {
  const m = lastmile();
  const v = validarMapa(m);
  const pedido = montarPedido(m, v, [visaoRascunho({ mapaTemp: { tmp_a: "var_cancelamentos" }, decisoesSetas: ["aceita", null] })]);
  const [aberta] = pedido.visoes_abertas;
  assert.equal("mapaTemp" in aberta, false);
  assert.equal("decisoesSetas" in aberta, false);
  assert.ok(aberta.proposta_rascunho, "o rascunho em si continua no contrato");
});

test("cartão do rascunho: botão Adicionar por variável pendente, aviso por seta sem as pontas, Aceitar quando dá", () => {
  const m = lastmile();
  const html1 = htmlVisoes(m, [visaoRascunho()], { motor: "pronto" });
  assert.match(html1, /Rascunho de mapa/);
  assert.match(html1, /Adicionar<\/button>/); // as duas variáveis ainda pendentes
  assert.match(html1, /Adicione as variáveis desta seta primeiro/);
  assert.doesNotMatch(html1, /Aceitar esta seta/);

  const comUmaVariavelAdicionada = visaoRascunho({ mapaTemp: { tmp_a: "var_cancelamentos" } });
  const html2 = htmlVisoes(m, [comUmaVariavelAdicionada], { motor: "pronto" });
  assert.match(html2, /Aceitar esta seta/, "a seta var_satisfacao → tmp_a já pode ser aceita");
  assert.match(html2, /Adicione as variáveis desta seta primeiro/, "tmp_a → tmp_b ainda falta tmp_b");

  const comDecisao = visaoRascunho({ mapaTemp: { tmp_a: "var_cancelamentos" }, decisoesSetas: ["aceita", "recusada"] });
  const html3 = htmlVisoes(m, [comDecisao], { motor: "pronto" });
  assert.match(html3, /· aceita/);
  assert.match(html3, /· recusada/);
  assert.doesNotMatch(html3, /Aceitar esta seta/);
});

test("fechar o cartão de rascunho usa o rótulo 'Terminei de revisar o rascunho'", () => {
  const m = lastmile();
  const html = htmlVisoes(m, [visaoRascunho()], { motor: "pronto" });
  assert.match(html, /Terminei de revisar o rascunho/);
});
