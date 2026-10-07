// Bolt 9: ritual do fundo do U (dispositivo mecânico, sem LLM).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { normalizar, novoCsd } from "../estado.js";
import {
  pareceSolucao, abrirRitual, enviarReflexao, encerrarReflexoes, ligarAoMapa,
  registrarDivergencia, enviarReflexaoParaCsd, ritualParaPedido, textoCronometro, htmlRitual,
} from "../ritual.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const lastmile = () => normalizar(JSON.parse(readFileSync(path.resolve(aqui, "../../../modelo-dados/exemplos/lastmile/mapa.json"), "utf-8")));
const SCHEMA = JSON.parse(readFileSync(path.resolve(aqui, "../../../modelo-dados/hackos.schema.json"), "utf-8"));

const AGORA = "2026-10-05T10:00:00-03:00";

test("pareceSolucao pega frases típicas de proposta de produto", () => {
  assert.equal(pareceSolucao("Notei que ninguém mede a capacidade por praça."), false);
  assert.equal(pareceSolucao("Por que a operação realoca tanto?"), false);
  assert.equal(pareceSolucao("Deveríamos criar um app para isso."), true);
  assert.equal(pareceSolucao("Construir uma ferramenta de priorização resolveria."), true);
  assert.equal(pareceSolucao("Uma boa solução seria automatizar a fila."), true);
});

test("abrirRitual exige pergunta generativa, duração entre 3 e 15, e nunca 'qual é a solução'", () => {
  const mapa = lastmile();
  assert.throws(() => abrirRitual(mapa, { pergunta_generativa: "", duracao_min: 5, agora: AGORA }), /pergunta generativa/);
  assert.throws(() => abrirRitual(mapa, { pergunta_generativa: "O que surpreendeu?", duracao_min: 20, agora: AGORA }), /3 e 15/);
  assert.throws(() => abrirRitual(mapa, { pergunta_generativa: "Qual é a solução?", duracao_min: 5, agora: AGORA }), /solução/);
  const rit = abrirRitual(mapa, { pergunta_generativa: "O que te surpreendeu?", duracao_min: 5, agora: AGORA });
  assert.equal(rit.recorte, mapa.recorte);
  assert.equal(rit.reflexoes.length, 0);
  assert.equal(rit.aberto_em, AGORA);
  assert.match(rit.id, new RegExp(SCHEMA.$defs.id.pattern));
});

function novoRitualAberto() {
  return abrirRitual(lastmile(), { pergunta_generativa: "O que te surpreendeu?", duracao_min: 5, agora: AGORA });
}

test("enviarReflexao recusa texto vazio, solução de produto, e reflexão depois de encerrado", () => {
  const rit = novoRitualAberto();
  assert.throws(() => enviarReflexao(rit, { autor: "mem_ana", tipo: "percepcao", texto: "   ", agora: AGORA }), /antes de enviar/);
  assert.throws(() => enviarReflexao(rit, { autor: "mem_ana", tipo: "percepcao", texto: "Deveríamos criar um app.", agora: AGORA }), /proposta de solução/);
  const r1 = enviarReflexao(rit, { autor: "mem_ana", tipo: "percepcao", texto: "A urgência parece dominar tudo.", agora: AGORA });
  assert.equal(r1.id, "ref_01");
  const r2 = enviarReflexao(rit, { autor: "mem_bruno", tipo: "pergunta", texto: "Quem decide o que é prioritário?", agora: AGORA });
  assert.equal(r2.id, "ref_02");
  assert.equal(rit.reflexoes.length, 2);
  encerrarReflexoes(rit, { agora: AGORA });
  assert.throws(() => enviarReflexao(rit, { autor: "mem_carla", tipo: "percepcao", texto: "Mais uma.", agora: AGORA }), /encerrada/);
});

test("encerrarReflexoes exige ao menos 1 reflexão, não duplica, e guarda quem seguiu sem responder", () => {
  const rit = novoRitualAberto();
  assert.throws(() => encerrarReflexoes(rit, { agora: AGORA }), /Ninguém enviou/);
  enviarReflexao(rit, { autor: "mem_ana", tipo: "percepcao", texto: "x", agora: AGORA });
  encerrarReflexoes(rit, { seguiuSem: ["mem_bruno", " mem_carla ", ""], agora: "2026-10-05T10:06:00-03:00" });
  assert.equal(rit.encerrado_em, "2026-10-05T10:06:00-03:00");
  assert.deepEqual(rit.seguiu_sem, ["mem_bruno", "mem_carla"]);
  assert.throws(() => encerrarReflexoes(rit, { agora: AGORA }), /já foi encerrada/);
});

test("ligarAoMapa marca presente_no_mapa e aceita 'ausente' (lista vazia)", () => {
  const rit = novoRitualAberto();
  const r1 = enviarReflexao(rit, { autor: "mem_ana", tipo: "percepcao", texto: "x", agora: AGORA });
  assert.throws(() => ligarAoMapa(rit, "ref_99", ["var_tempo"]), /não encontrada/);
  const c1 = ligarAoMapa(rit, r1.id, ["var_tempo", "var_tempo"]); // duplicado some
  assert.deepEqual(c1, { reflexao: "ref_01", presente_no_mapa: true, elementos: ["var_tempo"] });
  const c2 = ligarAoMapa(rit, r1.id, []);
  assert.deepEqual(c2, { reflexao: "ref_01", presente_no_mapa: false });
  assert.equal(rit.integracao.cobertura.length, 1); // atualiza no lugar, não duplica
});

test("registrarDivergencia exige 2+ reflexões existentes e descrição", () => {
  const rit = novoRitualAberto();
  const r1 = enviarReflexao(rit, { autor: "mem_ana", tipo: "percepcao", texto: "x", agora: AGORA });
  const r2 = enviarReflexao(rit, { autor: "mem_bruno", tipo: "percepcao", texto: "y", agora: AGORA });
  assert.throws(() => registrarDivergencia(rit, [r1.id], "só uma"), /pelo menos 2/);
  assert.throws(() => registrarDivergencia(rit, [r1.id, "ref_99"], "desc"), /não encontrada/);
  assert.throws(() => registrarDivergencia(rit, [r1.id, r2.id], "  "), /Descreva/);
  const d = registrarDivergencia(rit, [r1.id, r2.id], "Discordam sobre o que é urgente.");
  assert.deepEqual(d, { reflexoes: ["ref_01", "ref_02"], descricao: "Discordam sobre o que é urgente." });
});

test("enviarReflexaoParaCsd só aceita reflexão tipo pergunta, não duplica, e registra em csd.itens", () => {
  const mapa = lastmile();
  const rit = abrirRitual(mapa, { pergunta_generativa: "O que te surpreendeu?", duracao_min: 5, agora: AGORA });
  const percepcao = enviarReflexao(rit, { autor: "mem_ana", tipo: "percepcao", texto: "x", agora: AGORA });
  const pergunta = enviarReflexao(rit, { autor: "mem_bruno", tipo: "pergunta", texto: "Quem decide o que é prioritário?", agora: AGORA });
  const csd = novoCsd();
  assert.throws(
    () => enviarReflexaoParaCsd(rit, mapa, csd, percepcao.id, { tipo: "duvida", tarefa_discovery: "t", autor: "mem_bruno", agora: AGORA }),
    /Só perguntas/,
  );
  const item = enviarReflexaoParaCsd(rit, mapa, csd, pergunta.id, { tipo: "duvida", tarefa_discovery: "Mapear quem decide.", autor: "mem_bruno", agora: AGORA });
  assert.equal(item.tipo, "duvida");
  assert.equal(item.origem.etapa, "ritual_u");
  assert.equal(item.origem.ref, pergunta.id);
  assert.equal(csd.itens.length, 1);
  assert.deepEqual(rit.enviadasCsd, [pergunta.id]);
  assert.throws(
    () => enviarReflexaoParaCsd(rit, mapa, csd, pergunta.id, { tipo: "duvida", tarefa_discovery: "de novo", autor: "mem_bruno", agora: AGORA }),
    /já foi enviada/,
  );
});

test("ritualParaPedido tira os campos internos do quadro e omite blocos vazios", () => {
  const rit = novoRitualAberto();
  const r1 = enviarReflexao(rit, { autor: "mem_ana", tipo: "pergunta", texto: "Por quê?", agora: AGORA });
  rit.enviadasCsd = [r1.id];
  rit._painelReaberto = true;
  const doc = ritualParaPedido(rit);
  assert.equal("enviadasCsd" in doc, false);
  assert.equal("_painelReaberto" in doc, false);
  assert.equal("integracao" in doc, false); // sem cobertura nem divergência ainda
  assert.equal("encerrado_em" in doc, false);
  assert.deepEqual(doc.reflexoes, rit.reflexoes);

  encerrarReflexoes(rit, { agora: AGORA });
  ligarAoMapa(rit, r1.id, ["var_tempo"]);
  const doc2 = ritualParaPedido(rit);
  assert.equal(doc2.encerrado_em, AGORA);
  assert.deepEqual(doc2.integracao, { cobertura: [{ reflexao: r1.id, presente_no_mapa: true, elementos: ["var_tempo"] }] });

  assert.equal(ritualParaPedido(null), null);
});

test("um ritual encerrado e integrado passa no schema dentro de um pedido_visao", () => {
  const mapa = lastmile();
  const rit = abrirRitual(mapa, { pergunta_generativa: "O que te surpreendeu?", duracao_min: 5, agora: AGORA });
  const r1 = enviarReflexao(rit, { autor: "mem_ana", tipo: "percepcao", texto: "A espiral parece inevitável.", agora: AGORA });
  const r2 = enviarReflexao(rit, { autor: "mem_bruno", tipo: "pergunta", texto: "Quem decide o que é prioritário?", agora: AGORA });
  ligarAoMapa(rit, r1.id, ["seta_04", "seta_05", "seta_06"]);
  ligarAoMapa(rit, r2.id, []);
  registrarDivergencia(rit, [r1.id, r2.id], "Uma vê causa estrutural, a outra vê decisão individual.");
  encerrarReflexoes(rit, { seguiuSem: ["mem_carla"], agora: "2026-10-05T10:06:00-03:00" });

  // Sem lib de JSON Schema no lado JS deste projeto (a validação de schema
  // fica nos testes Python de modelo-dados/testes/) — checagem estrutural
  // equivalente, direto contra o schema carregado:
  // todo campo obrigatório de $defs/ritual está presente, e nada fora do
  // additionalProperties:false escapou de ritualParaPedido.
  const doc = ritualParaPedido(rit);
  const def = SCHEMA.$defs.ritual;
  for (const campo of def.required) assert.ok(campo in doc, `falta campo obrigatório '${campo}'`);
  for (const campo of Object.keys(doc)) assert.ok(campo in def.properties, `campo '${campo}' não existe no contrato`);
  for (const id of ["id", "recorte"]) assert.match(doc[id], new RegExp(SCHEMA.$defs.id.pattern));
});

test("htmlRitual renderiza as 5 telas sem lançar exceção e escapa texto do squad", () => {
  const mapa = lastmile();
  const csd = novoCsd();
  assert.doesNotThrow(() => htmlRitual(null, { rascunhoConfig: { pergunta_generativa: "", duracao_min: 5 } }));

  const rit = abrirRitual(mapa, { pergunta_generativa: "O que te surpreendeu?", duracao_min: 5, agora: AGORA });
  assert.doesNotThrow(() => htmlRitual(rit, { etapa: "entrada", mapa, csd }));
  assert.doesNotThrow(() => htmlRitual(rit, { etapa: "interludio", mapa, csd }));
  assert.doesNotThrow(() => htmlRitual(rit, { etapa: "confirmar-encerrar", mapa, csd }));

  const r1 = enviarReflexao(rit, { autor: "mem_ana", tipo: "percepcao", texto: '<script>alert(1)</script> & "aspas"', agora: AGORA });
  enviarReflexao(rit, { autor: "mem_bruno", tipo: "pergunta", texto: "Quem decide?", agora: AGORA });
  ligarAoMapa(rit, r1.id, ["var_tempo"]);
  encerrarReflexoes(rit, { agora: AGORA });
  const htmlRevelado = htmlRitual(rit, { mapa, csd });
  assert.doesNotThrow(() => htmlRitual(rit, { mapa, csd }));
  assert.ok(!htmlRevelado.includes("<script>alert"), "texto do squad precisa ser escapado no HTML");
  assert.ok(htmlRevelado.includes("&lt;script&gt;"));
});
