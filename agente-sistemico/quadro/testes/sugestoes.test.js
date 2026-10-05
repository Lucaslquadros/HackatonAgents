// Bolt 5: aceitar ou recusar sugestões do agente e estacionar ideias.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { normalizar, aceitarConexao, aceitarVariavel, novoEstacionamento, estacionar, mudarStatusIdeia, remover } from "../estado.js";
import { validarMapa } from "../validador.js";
import { situacaoConexao, preverConexao, montarPedido, mesclarVisoes, htmlVisoes } from "../visoes.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const lastmile = () =>
  normalizar(JSON.parse(readFileSync(path.resolve(aqui, "../../../modelo-dados/exemplos/lastmile/mapa.json"), "utf-8")));

// A mesma conexão que o teste de ponta a ponta do Bolt 4 sugeriu.
const PRESSAO_PARA_PRIORITARIAS = {
  de: "var_pressao", para: "var_prioritarias", polaridade: "+", atraso: false,
  mecanismo: "Sob cobrança, a operação marca mais rotas como prioritárias.",
};

test("prévia: aceitar Pressão → Rotas prioritárias fecharia um loop R novo", () => {
  const loops = preverConexao(lastmile(), PRESSAO_PARA_PRIORITARIAS);
  assert.equal(loops.length, 1);
  assert.equal(loops[0].tipo, "R");
  assert.deepEqual(loops[0].caminho, [
    "Pressão sobre a operação", "Rotas classificadas como prioritárias", "Realocações de entregadores",
    "Tempo médio de entrega", "Pressão sobre a operação",
  ]);
});

test("prévia não altera o mapa", () => {
  const m = lastmile();
  const antes = JSON.stringify(m);
  preverConexao(m, PRESSAO_PARA_PRIORITARIAS);
  assert.equal(JSON.stringify(m), antes);
});

test("aceitar conexão: a seta entra como suposição, com o mecanismo do agente e autor 'agente'", () => {
  const m = lastmile();
  const seta = aceitarConexao(m, PRESSAO_PARA_PRIORITARIAS);
  assert.equal(seta.id, "seta_13");
  assert.equal(seta.autor, "agente");
  assert.equal(seta.status, "aceita");
  assert.equal(seta.classificacao, "suposicao");
  assert.equal(seta.mecanismo, PRESSAO_PARA_PRIORITARIAS.mecanismo);
  assert.equal(validarMapa(m).loops.length, 4, "o loop novo passa a existir");
  assert.throws(() => aceitarConexao(m, PRESSAO_PARA_PRIORITARIAS), /já está no mapa/);
});

test("situação da conexão acompanha o mapa: pode aceitar, já existe, variável saiu", () => {
  const m = lastmile();
  assert.equal(situacaoConexao(m, PRESSAO_PARA_PRIORITARIAS), "pode_aceitar");
  aceitarConexao(m, PRESSAO_PARA_PRIORITARIAS);
  assert.equal(situacaoConexao(m, PRESSAO_PARA_PRIORITARIAS), "ja_existe");
  remover(m, "var_prioritarias");
  assert.equal(situacaoConexao(m, PRESSAO_PARA_PRIORITARIAS), "variavel_saiu");
});

test("aceitar variável proposta pelo agente", () => {
  const m = lastmile();
  const v = aceitarVariavel(m, { nome: "Meta de entregas por dia", tipo: "neutra" }, { x: 100, y: 700 });
  assert.equal(v.autor, "agente");
  assert.deepEqual(v.posicao, { x: 100, y: 700 });
});

test("estacionamento: ids em sequência, sem duplicar a mesma ideia, status muda", () => {
  const est = novoEstacionamento();
  const a = estacionar(est, { texto: "  App de roteirização  ", autor: "mem_bruno", agora: "2026-10-05T10:00:00-03:00" });
  assert.equal(a.id, "est_01");
  assert.equal(a.texto, "App de roteirização");
  assert.equal(a.retomar_em, "ideacao");
  assert.throws(() => estacionar(est, { texto: "app de ROTEIRIZAÇÃO", autor: "mem_ana", agora: "x" }), /já está/);
  assert.throws(() => estacionar(est, { texto: "   ", autor: "mem_ana", agora: "x" }), /Escreva/);
  mudarStatusIdeia(est, "est_01", "descartada");
  assert.equal(est.itens[0].status, "descartada");
  assert.equal(estacionar(est, { texto: "Outra", autor: "mem_ana", agora: "x" }).id, "est_02");
});

test("pedido leva o estacionamento só quando há ideias", () => {
  const m = lastmile();
  const v = validarMapa(m);
  assert.equal("estacionamento" in montarPedido(m, v, []), false);
  const est = novoEstacionamento();
  estacionar(est, { texto: "App de roteirização", autor: "mem_bruno", agora: "2026-10-05T10:00:00-03:00" });
  assert.equal(montarPedido(m, v, [], { estacionamento: est }).estacionamento.itens.length, 1);
});

test("cartões: cada tipo de visão tem os botões certos", () => {
  const m = lastmile();
  const base = { refs: [], fonte_teorica: { referencia: "x", suplementar: false }, status: "aberta", texto: "t", pergunta: "p?" };
  const visoes = mesclarVisoes([], {
    pedido: "ped_1",
    visoes: [
      { ...base, id: "vis_c", tipo: "conexao_sugerida", proposta_seta: PRESSAO_PARA_PRIORITARIAS },
      { ...base, id: "vis_e", tipo: "estacionar", texto_estacionado: "App de roteirização" },
      { ...base, id: "vis_a", tipo: "visao_ausente", proposta_variavel: { nome: "Meta por praça", tipo: "neutra" } },
    ],
  });
  const html = htmlVisoes(m, visoes, { motor: "pronto" });
  assert.match(html, /Aceitar a seta/);
  assert.match(html, /Aceitar fecharia 1 loop/);
  assert.match(html, /Estacionar a ideia/);
  assert.match(html, /Adicionar "Meta por praça"/);
  assert.match(html, /Estacionamento/);
});
