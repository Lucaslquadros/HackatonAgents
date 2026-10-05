import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { validarMapa, validacaoParaPedido, problemaDeNome, LIMITE_VARIAVEIS } from "../validador.js";
import { mapaDe, idsDe, exercicio2, suporte, lojaAlfa, nexaPay } from "./gabaritos.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const modelo = path.resolve(aqui, "../../../modelo-dados");
const lerJson = (p) => JSON.parse(readFileSync(p, "utf-8"));
const SCHEMA = lerJson(path.join(modelo, "hackos.schema.json"));

const chave = (ids) => [...ids].sort().join("|");
const acharLoop = (resultado, numeros) =>
  resultado.loops.find((l) => chave(l.setas) === chave(idsDe(numeros)));
const codigos = (resultado) => resultado.problemas.map((p) => p.codigo);

// Toda saída precisa caber no contrato `pedido_visao.validacao`.
function conformeAoContrato(resultado) {
  const codigosValidos = SCHEMA.$defs.problema_validacao.properties.codigo.enum;
  const camposLoop = Object.keys(SCHEMA.$defs.loop_calculado.properties);
  for (const loop of resultado.loops) {
    for (const campo of Object.keys(loop)) assert.ok(camposLoop.includes(campo), `campo ${campo} fora do contrato`);
    assert.ok(loop.setas.length >= 2);
  }
  for (const p of resultado.problemas) assert.ok(codigosValidos.includes(p.codigo), `código ${p.codigo} fora do contrato`);
}

test("exercício 2: classificação R/B por contagem de negativas", async (t) => {
  for (const caso of exercicio2) {
    await t.test(`item ${caso.item}`, () => {
      const r = validarMapa(mapaDe(caso.setas));
      conformeAoContrato(r);
      assert.equal(r.loops.length, 1);
      assert.equal(r.loops[0].tipo, caso.tipo);
      assert.equal(r.loops[0].negativas, caso.negativas);
    });
  }
});

for (const [nome, gabarito] of [["exercício 3 · suporte", suporte], ["exercício 7 · Loja Alfa", lojaAlfa], ["exercício 8 · Nexa Pay", nexaPay]]) {
  test(`${nome}: encontra os loops do gabarito com o tipo certo`, () => {
    const r = validarMapa(mapaDe(gabarito.setas));
    conformeAoContrato(r);
    assert.equal(r.loops.length, gabarito.total, "total de ciclos simples");
    for (const esperado of gabarito.loops) {
      const loop = acharLoop(r, esperado.setas);
      assert.ok(loop, `${esperado.nome} não foi encontrado`);
      assert.equal(loop.tipo, esperado.tipo, esperado.nome);
    }
  });
}

test("suporte: R1 tem atraso entre resposta incompleta e retorno do cliente", () => {
  const r = validarMapa(mapaDe(suporte.setas));
  assert.equal(acharLoop(r, [1, 2, 5, 6, 7]).tem_atraso, true);
  assert.equal(acharLoop(r, [1, 2, 3, 4]).tem_atraso, false);
});

test("Loja Alfa: os dois ciclos compostos são reais e a contagem os classifica", () => {
  const r = validarMapa(mapaDe(lojaAlfa.setas));
  for (const composto of lojaAlfa.compostos) {
    const loop = acharLoop(r, composto.setas);
    assert.ok(loop);
    assert.equal(loop.tipo, composto.tipo);
    assert.equal(loop.negativas, composto.negativas);
  }
});

test("Nexa Pay: R3 (8 setas) é reforçador mesmo com duas negativas", () => {
  const r = validarMapa(mapaDe(nexaPay.setas));
  const r3 = acharLoop(r, [1, 2, 3, 4, 12, 13, 6, 7]);
  assert.equal(r3.negativas, 2);
  assert.equal(r3.tipo, "R");
});

test("last-mile: o validador reproduz a validação escrita à mão no Bolt 0", () => {
  const pedido = lerJson(path.join(modelo, "exemplos/lastmile/pedido-visao.json"));
  const r = validarMapa(pedido.mapa);
  conformeAoContrato(r);
  assert.deepEqual(validacaoParaPedido(r), pedido.validacao);
});

test("nenhum_loop: setas que não voltam ao início são uma lista de causas", () => {
  const r = validarMapa(mapaDe([["A", "+", "B"], ["B", "+", "C"]]));
  assert.deepEqual(r.loops, []);
  assert.ok(codigos(r).includes("nenhum_loop"));
});

test("b_sem_meta: loop B sem meta anotada é apontado; com meta, não", () => {
  const setas = exercicio2[1].setas;
  assert.ok(codigos(validarMapa(mapaDe(setas))).includes("b_sem_meta"));
  const comMeta = mapaDe(setas, { loopsAnotados: [{ setas: [1, 2, 3], meta: "Fila zero" }] });
  assert.ok(!codigos(validarMapa(comMeta)).includes("b_sem_meta"));
  const semMeta = mapaDe(setas, { loopsAnotados: [{ setas: [1, 2, 3] }] });
  assert.ok(codigos(validarMapa(semMeta)).includes("b_sem_meta"));
});

test("b_sem_meta não se aplica a loop R", () => {
  assert.ok(!codigos(validarMapa(mapaDe(exercicio2[0].setas))).includes("b_sem_meta"));
});

test("variavel_fora_de_loop: variável pendurada no sistema", () => {
  const r = validarMapa(mapaDe([...suporte.setas, ["Orçamento do suporte", "+", "Pressão"]]));
  const p = r.problemas.find((x) => x.codigo === "variavel_fora_de_loop");
  assert.ok(p);
  assert.match(p.mensagem, /Orçamento do suporte/);
});

test("excesso_variaveis: mais de 12 vira descrição, não modelo", () => {
  const nomes = Array.from({ length: LIMITE_VARIAVEIS + 1 }, (_, i) => `Variável ${i + 1}`);
  const setas = nomes.map((n, i) => [n, "+", nomes[(i + 1) % nomes.length]]);
  assert.ok(codigos(validarMapa(mapaDe(setas))).includes("excesso_variaveis"));
  assert.ok(!codigos(validarMapa(mapaDe(setas.slice(0, 3).concat([["Variável 4", "+", "Variável 1"]])))).includes("excesso_variaveis"));
});

test("nomes: exemplos ruins da aula são apontados", () => {
  for (const ruim of ["Gerar alertas", "Contratar pessoas", "Queda na qualidade", "Aumento de vendas", "Falta de testes", "Mais incidentes"]) {
    assert.ok(problemaDeNome(ruim), `deveria apontar "${ruim}"`);
  }
});

test("nomes: exemplos bons da aula e todas as variáveis dos gabaritos passam", () => {
  const bons = ["Volume de alertas", "Tamanho do time", "Taxa de churn", "Lugar na fila", "Poder de compra"];
  const dosGabaritos = [...exercicio2.flatMap((c) => c.setas), ...suporte.setas, ...lojaAlfa.setas, ...nexaPay.setas]
    .flatMap(([de, , para]) => [de, para]);
  const lastmile = lerJson(path.join(modelo, "exemplos/lastmile/mapa.json")).variaveis.map((v) => v.nome);
  for (const nome of [...bons, ...dosGabaritos, ...lastmile]) {
    assert.equal(problemaDeNome(nome), null, `falso positivo em "${nome}"`);
  }
});

test("variavel_sem_ator: sem ator nomeado, a causa vira opinião", () => {
  const mapa = mapaDe(exercicio2[0].setas);
  mapa.variaveis[0].atores = [];
  const r = validarMapa(mapa);
  assert.deepEqual(r.problemas.filter((p) => p.codigo === "variavel_sem_ator").map((p) => p.refs), [["var_1"]]);
});

test("seta_sem_mecanismo", () => {
  const mapa = mapaDe(exercicio2[0].setas);
  mapa.setas[1].mecanismo = "  ";
  assert.ok(codigos(validarMapa(mapa)).includes("seta_sem_mecanismo"));
});

test("seta_orfa: seta ligada a variável recusada sai dos loops e é apontada", () => {
  const mapa = mapaDe(exercicio2[0].setas);
  mapa.variaveis[2].status = "recusada";
  const r = validarMapa(mapa);
  assert.deepEqual(r.loops, []);
  assert.ok(codigos(r).includes("seta_orfa"));
});

test("setas fantasma ficam fora por padrão e entram com incluirFantasmas", () => {
  const mapa = mapaDe(exercicio2[0].setas);
  mapa.setas[2].status = "fantasma";
  assert.equal(validarMapa(mapa).loops.length, 0);
  assert.equal(validarMapa(mapa, { incluirFantasmas: true }).loops.length, 1);
});

test("setas paralelas são mecanismos diferentes e geram loops diferentes", () => {
  const r = validarMapa(mapaDe([["A", "+", "B"], ["A", "-", "B"], ["B", "+", "A"]]));
  assert.deepEqual(r.loops.map((l) => l.tipo).sort(), ["B", "R"]);
});

test("auto-laço (A → A) é ignorado", () => {
  assert.equal(validarMapa(mapaDe([["A", "+", "A"]])).loops.length, 0);
});
