import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  novoMapa, normalizar, proximoId, adicionarVariavel, adicionarSeta, adicionarAtor,
  moverVariavel, atualizar, remover, pendencias,
} from "../estado.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const lastmile = () =>
  JSON.parse(readFileSync(path.resolve(aqui, "../../../modelo-dados/exemplos/lastmile/mapa.json"), "utf-8"));

function mapaComTres() {
  const m = novoMapa();
  const a = adicionarVariavel(m, { nome: "Fila", posicao: { x: 0, y: 0 }, autor: "mem_a" });
  const b = adicionarVariavel(m, { nome: "Pressão", posicao: { x: 10.4, y: 20.6 }, autor: "mem_a" });
  const c = adicionarVariavel(m, { nome: "Velocidade", posicao: { x: 0, y: 0 }, autor: "mem_a" });
  return { m, a, b, c };
}

test("ids novos não colidem com ids nomeados nem numerados", () => {
  const m = normalizar(lastmile());
  assert.equal(proximoId(m, "var"), "var_1");
  assert.equal(proximoId(m, "seta", 2), "seta_13");
  assert.equal(proximoId(m, "alv"), "alv_3");
});

test("variável nova tem os campos obrigatórios e posição inteira", () => {
  const { b } = mapaComTres();
  assert.deepEqual(Object.keys(b).sort(), ["atores", "autor", "id", "nome", "posicao", "status", "tipo"]);
  assert.deepEqual(b.posicao, { x: 10, y: 21 });
});

test("seta: recusa auto-laço e variável inexistente", () => {
  const { m, a } = mapaComTres();
  assert.throws(() => adicionarSeta(m, { de: a.id, para: a.id, autor: "mem_a" }));
  assert.throws(() => adicionarSeta(m, { de: a.id, para: "var_99", autor: "mem_a" }));
});

test("seta nova começa como suposição e sem mecanismo (pendência)", () => {
  const { m, a, b } = mapaComTres();
  m.contexto = { tema: "t", pergunta_problema: "p" };
  const s = adicionarSeta(m, { de: a.id, para: b.id, autor: "mem_a" });
  assert.equal(s.classificacao, "suposicao");
  assert.equal(s.id, "seta_01");
  assert.equal(pendencias(m).length, 1);
  atualizar(m, s.id, { mecanismo: "Mais fila, mais cobrança." });
  assert.deepEqual(pendencias(m), []);
});

test("atualizar: certeza exige fonte; voltar a suposição apaga a fonte; atraso falso apaga a descrição", () => {
  const { m, a, b } = mapaComTres();
  m.contexto = { tema: "t", pergunta_problema: "p" };
  const s = adicionarSeta(m, { de: a.id, para: b.id, autor: "mem_a" });
  atualizar(m, s.id, { mecanismo: "x", classificacao: "certeza" });
  assert.match(pendencias(m)[0], /sem fonte/);
  atualizar(m, s.id, { fonte: "Relatório X" });
  assert.deepEqual(pendencias(m), []);
  atualizar(m, s.id, { classificacao: "suposicao" });
  assert.equal("fonte" in s, false);
  atualizar(m, s.id, { atraso: true, atraso_descricao: "semanas" });
  atualizar(m, s.id, { atraso: false });
  assert.equal("atraso_descricao" in s, false);
});

test("remover variável leva junto as setas, loops anotados e alavancas que dependiam dela", () => {
  const m = normalizar(lastmile());
  remover(m, "var_realocacoes");
  assert.ok(!m.setas.some((s) => s.id === "seta_05" || s.id === "seta_06"));
  assert.ok(!m.loops_anotados.some((l) => l.nome.startsWith("R1")));
  assert.ok(!m.alavancas.some((a) => a.id === "alv_02"), "alv_02 apontava só para o loop R1");
  assert.equal(m.analise.loop_principal, undefined, "o loop principal era o R1");
  assert.ok(m.alavancas.some((a) => a.id === "alv_01"), "alv_01 não dependia de R1");
});

test("remover ator tira o ator das variáveis", () => {
  const { m, a } = mapaComTres();
  const ator = adicionarAtor(m, { nome: "Operação", papeis: [] });
  assert.deepEqual(ator.papeis, ["outro"]);
  atualizar(m, a.id, { atores: [ator.id] });
  remover(m, ator.id);
  assert.deepEqual(m.variaveis[0].atores, []);
});

test("mover arredonda a posição", () => {
  const { m, a } = mapaComTres();
  moverVariavel(m, a.id, { x: 1.6, y: 2.2 });
  assert.deepEqual(m.variaveis[0].posicao, { x: 2, y: 2 });
});

test("normalizar completa arquivo incompleto sem perder dados", () => {
  const m = normalizar({ variaveis: [{ id: "var_1", nome: "A" }], contexto: { tema: "T" } });
  assert.equal(m.contexto.tema, "T");
  assert.equal(m.contexto.pergunta_problema, "");
  assert.deepEqual(m.setas, []);
  assert.equal(m.variaveis.length, 1);
});
