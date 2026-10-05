import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { normalizar } from "../estado.js";
import { validarMapa } from "../validador.js";
import { montarPedido, mesclarVisoes, mudarStatus, htmlVisoes, dataHoraLocal, idPedido } from "../visoes.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const exemplos = path.resolve(aqui, "../../../modelo-dados/exemplos/lastmile");
const ler = (nome) => JSON.parse(readFileSync(path.join(exemplos, nome), "utf-8"));
const SCHEMA = JSON.parse(readFileSync(path.resolve(aqui, "../../../modelo-dados/hackos.schema.json"), "utf-8"));

test("id do pedido e data com fuso seguem o contrato", () => {
  const agora = new Date(2026, 9, 5, 9, 7, 3);
  assert.match(idPedido(agora), new RegExp(SCHEMA.$defs.id.pattern));
  assert.equal(idPedido(agora), "ped_20261005-090703");
  assert.match(dataHoraLocal(agora), /^2026-10-05T09:07:03[+-]\d{2}:\d{2}$/);
});

test("montarPedido: só visões abertas vão ao agente, sem os campos internos do quadro", () => {
  const mapa = normalizar(ler("mapa.json"));
  const resposta = ler("resposta-visao.json");
  let visoes = mesclarVisoes([], resposta);
  visoes = mudarStatus(visoes, visoes[0].chave, "respondida");
  const pedido = montarPedido(mapa, validarMapa(mapa), visoes);
  assert.equal(pedido.visoes_abertas.length, 2);
  for (const v of pedido.visoes_abertas) {
    assert.equal("chave" in v, false);
    assert.equal("pedido" in v, false);
  }
  assert.equal("truncado" in pedido.validacao, false);
  assert.equal(pedido.limite_visoes, 3);
  assert.deepEqual(Object.keys(pedido).sort(), Object.keys(SCHEMA.$defs.pedido_visao.properties).filter((k) => !["csd", "ritual", "cynefin", "seta_selecionada", "estacionamento", "entrevista"].includes(k)).sort());
});

test("mesclarVisoes: ids repetidos em pedidos diferentes não se sobrescrevem; o mesmo pedido não duplica", () => {
  const r1 = { pedido: "ped_1", visoes: [{ id: "vis_01", status: "aberta" }] };
  const r2 = { pedido: "ped_2", visoes: [{ id: "vis_01", status: "aberta" }] };
  let v = mesclarVisoes([], r1);
  v = mesclarVisoes(v, r2);
  v = mesclarVisoes(v, r1);
  assert.deepEqual(v.map((x) => x.chave), ["ped_1:vis_01", "ped_2:vis_01"]);
});

test("mudarStatus: dispensar guarda o motivo; reabrir apaga", () => {
  let v = mesclarVisoes([], { pedido: "ped_1", visoes: [{ id: "vis_01", status: "aberta" }] });
  v = mudarStatus(v, "ped_1:vis_01", "recusada", "Já discutimos isso no ritual");
  assert.equal(v[0].motivo_recusa, "Já discutimos isso no ritual");
  v = mudarStatus(v, "ped_1:vis_01", "aberta");
  assert.equal("motivo_recusa" in v[0], false);
});

test("htmlVisoes: cada estado do motor tem sua mensagem e o texto do agente é escapado", () => {
  const mapa = normalizar(ler("mapa.json"));
  const visoes = mesclarVisoes([], {
    pedido: "ped_1",
    visoes: [{ id: "vis_x", tipo: "visao_ausente", texto: "<img src=x onerror=alert(1)>", pergunta: "E agora?", refs: ["var_tempo"], fonte_teorica: { referencia: "Iceberg", suplementar: false }, status: "aberta" }],
  });
  assert.match(htmlVisoes(mapa, [], { motor: "sem_servidor" }), /python servidor\.py/);
  assert.match(htmlVisoes(mapa, [], { motor: "aguardando", comando: "/visao-sistemica rec_lastmile" }), /\/visao-sistemica rec_lastmile/);
  assert.match(htmlVisoes(mapa, [], { motor: "pronto" }), /Pedir visão ao agente/);
  const html = htmlVisoes(mapa, visoes, { motor: "pronto" });
  assert.ok(!html.includes("<img"));
  assert.match(html, /Tempo médio de entrega/, "a ref aparece pelo nome da variável");
});
