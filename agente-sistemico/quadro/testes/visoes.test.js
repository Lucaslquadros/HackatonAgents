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

test("montarPedido: csd só vai no pedido quando tem item; nunca vazia", () => {
  const mapa = normalizar(ler("mapa.json"));
  const semCsd = montarPedido(mapa, validarMapa(mapa), [], { csd: { itens: [] } });
  assert.equal("csd" in semCsd, false);
  const comCsd = montarPedido(mapa, validarMapa(mapa), [], { csd: { itens: [{ id: "csd_01" }] } });
  assert.deepEqual(comCsd.csd, { itens: [{ id: "csd_01" }] });
});

test("montarPedido: ritual só vai no pedido depois de encerrado (Bolt 9)", () => {
  const mapa = normalizar(ler("mapa.json"));
  const aberto = { id: "rit_01", recorte: mapa.recorte, pergunta_generativa: "O que te surpreendeu?", duracao_min: 5, aberto_em: "2026-10-05T10:00:00-03:00", reflexoes: [] };
  const semRitual = montarPedido(mapa, validarMapa(mapa), [], { ritual: aberto });
  assert.equal("ritual" in semRitual, false);
  const encerrado = { ...aberto, encerrado_em: "2026-10-05T10:06:00-03:00" };
  const comRitual = montarPedido(mapa, validarMapa(mapa), [], { ritual: encerrado });
  assert.deepEqual(comRitual.ritual, encerrado);
});

test("htmlVisoes: hipótese com proposta_csd mostra o texto proposto e o botão de aceitar para a CSD", () => {
  const mapa = normalizar(ler("mapa.json"));
  const visoes = mesclarVisoes([], {
    pedido: "ped_1",
    visoes: [{
      id: "vis_h", tipo: "hipotese", texto: "A capacidade real nunca foi medida.",
      pergunta: "Qual a capacidade real de entrega por praça?", refs: ["var_carga"],
      fonte_teorica: { referencia: "Matriz CSD", suplementar: false }, status: "aberta",
      proposta_csd: {
        id: "csd_01", tipo: "suposicao", texto: "Capacidade real desconhecida", autor: "agente",
        criado_em: "2026-10-05T10:00:00-03:00", status: "proposto",
        origem: { etapa: "mapa_sistemico" }, evidencias: [], pergunta_pesquisa: "Qual é a capacidade real?",
      },
    }],
  });
  const html = htmlVisoes(mapa, visoes, { motor: "pronto" });
  assert.match(html, /Item proposto para a CSD: Capacidade real desconhecida/);
  assert.match(html, /data-visao-acao="aceitar_item_csd" data-chave="ped_1:vis_h"/);
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
