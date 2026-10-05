// Bolt 7: entrevista em rodadas.
import { test } from "node:test";
import assert from "node:assert/strict";

import { novoMapa } from "../estado.js";
import { validarMapa } from "../validador.js";
import { montarPedido } from "../visoes.js";
import {
  novaEntrevista, registrarRodada, rodadaAberta, responderRodada, aplicarRespostas,
  aceitarProposta, entrevistaParaPedido, htmlEntrevista, valorDaResposta,
} from "../entrevista.js";

const RODADA_1 = {
  pedido: "ped_1",
  entrevista: {
    rodada: 1,
    objetivo: "Sair do tema para uma situação concreta.",
    perguntas: [
      { id: "ent_situacao", pergunta: "Que situação com bicicleta mais incomoda?", opcoes: ["Pouca gente pedala", "Acidentes"], campo: "situacao" },
      { id: "ent_afetados", pergunta: "Quem sofre com isso?", opcoes: ["Ciclistas", "Quem queria pedalar"], multipla: true, campo: "afetados" },
      { id: "ent_horizonte", pergunta: "Desde quando isso piorou?", campo: "horizonte_tempo" },
      { id: "ent_decide", pergunta: "Quem decide sobre as ciclovias?", campo: "decisores" },
    ],
  },
  visoes: [],
};

function entrevistaComRodada() {
  const ent = novaEntrevista();
  registrarRodada(ent, RODADA_1);
  return ent;
}

test("registra a rodada uma vez por pedido e ela fica aberta até ser respondida", () => {
  const ent = entrevistaComRodada();
  registrarRodada(ent, RODADA_1);
  assert.equal(ent.rodadas.length, 1);
  assert.equal(rodadaAberta(ent).rodada, 1);
});

test("responder exige uma resposta ou 'ainda não sabemos' em cada pergunta", () => {
  const ent = entrevistaComRodada();
  assert.throws(() => responderRodada(ent, [{ pergunta: "ent_situacao", opcoes: ["Pouca gente pedala"] }]), /Responda ou marque/);
  responderRodada(ent, [
    { pergunta: "ent_situacao", opcoes: ["Pouca gente pedala"], texto: "principalmente para ir ao trabalho" },
    { pergunta: "ent_afetados", opcoes: ["Ciclistas", "Quem queria pedalar"] },
    { pergunta: "ent_horizonte", texto: "Últimos 5 anos" },
    { pergunta: "ent_decide", pulada: true },
  ]);
  assert.equal(rodadaAberta(ent), null);
});

test("as respostas entram no mapa: contexto, atores e descrição", () => {
  const ent = entrevistaComRodada();
  const mapa = novoMapa();
  mapa.atores.push({ id: "ator_1", nome: "ciclistas", papeis: ["opera"] });
  const rodada = responderRodada(ent, [
    { pergunta: "ent_situacao", opcoes: ["Pouca gente pedala"], texto: "principalmente para ir ao trabalho" },
    { pergunta: "ent_afetados", opcoes: ["Ciclistas", "Quem queria pedalar"] },
    { pergunta: "ent_horizonte", texto: "Últimos 5 anos" },
    { pergunta: "ent_decide", texto: "Prefeitura; CET" },
  ]);
  const mudancas = aplicarRespostas(mapa, rodada);
  assert.equal(mapa.contexto.horizonte_tempo, "Últimos 5 anos");
  assert.match(mapa.contexto.descricao, /^Situação: Pouca gente pedala; principalmente para ir ao trabalho$/);
  assert.deepEqual(mapa.atores.map((a) => `${a.nome}:${a.papeis.join("+")}`), [
    "ciclistas:opera+sofre", "Quem queria pedalar:sofre", "Prefeitura:decide", "CET:decide",
  ]);
  assert.equal(mudancas.length, 6);
  aplicarRespostas(mapa, rodada);
  assert.equal(mapa.contexto.descricao.split("\n").length, 1, "aplicar de novo não duplica a linha");
});

test("resposta pulada não mexe no mapa", () => {
  assert.equal(valorDaResposta({ pergunta: "x", pulada: true, texto: "algo" }), "");
});

test("proposta aceita (editada) entra no contexto e encerra a entrevista", () => {
  const ent = entrevistaComRodada();
  registrarRodada(ent, { pedido: "ped_2", visoes: [], proposta_contexto: { pergunta_problema: "Por que poucos pedalam?" } });
  const mapa = novoMapa();
  aceitarProposta(mapa, ent, { pergunta_problema: "Por que poucos pedalam para trabalhar, apesar das ciclovias?", fronteira: "", horizonte_tempo: "5 anos" });
  assert.equal(mapa.contexto.pergunta_problema, "Por que poucos pedalam para trabalhar, apesar das ciclovias?");
  assert.equal(mapa.contexto.horizonte_tempo, "5 anos");
  assert.equal("fronteira" in mapa.contexto, false, "campo vazio não entra");
  assert.equal(ent.encerrada, true);
  assert.equal(htmlEntrevista(ent), "");
});

test("pedido leva o histórico da entrevista no formato do contrato", () => {
  const ent = entrevistaComRodada();
  ent.proposta = { pergunta_problema: "x?" };
  const mapa = novoMapa();
  const pedido = montarPedido(mapa, validarMapa(mapa), [], { gatilho: "entrevista", entrevista: entrevistaParaPedido(ent) });
  assert.equal(pedido.gatilho, "entrevista");
  assert.deepEqual(Object.keys(pedido.entrevista.rodadas[0]).sort(), ["objetivo", "pedido", "perguntas", "rodada"]);
  assert.equal("proposta" in pedido.entrevista, false);
  assert.equal(entrevistaParaPedido(novaEntrevista()), null);
});

test("pedido não leva campos de texto vazios do contexto (mapa ainda sem pergunta-problema)", () => {
  const mapa = novoMapa();
  mapa.contexto.tema = "Bicicleta em SP";
  const pedido = montarPedido(mapa, validarMapa(mapa), []);
  assert.deepEqual(pedido.mapa.contexto, { tema: "Bicicleta em SP" });
  assert.equal(mapa.contexto.pergunta_problema, "", "o mapa do quadro não muda");
});

test("formulário: rodada aberta vira perguntas com opções; aguardando esconde o formulário", () => {
  const ent = entrevistaComRodada();
  const html = htmlEntrevista(ent, { ent_situacao: { opcoes: ["Acidentes"] } });
  assert.match(html, /rodada 1/);
  assert.match(html, /type="checkbox" name="ent-ent_afetados"/, "pergunta múltipla vira checkbox");
  assert.match(html, /value="Acidentes" checked/, "rascunho é preservado");
  assert.match(html, /Ainda não sabemos/);
  assert.doesNotMatch(htmlEntrevista(ent, {}, { aguardando: true }), /form-entrevista/);
});
