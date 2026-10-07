// Bolt 1 do Agente de Panorama: fatos + classificação CSD, por cenário.
// Mecânico, sem LLM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  novoPanorama, normalizarPanorama, adicionarCenario, atualizarCenario, removerCenario,
  adicionarFato, removerFato, atualizarFato, fatosDoCenario, pendencias, avisos, paraContrato,
  htmlPanorama, EXPLICACAO_CSD, CLASSIFICACOES_CSD,
  clustersDoCenario, adicionarCluster, atualizarCluster, removerCluster,
  adicionarElementoCluster, removerElementoCluster, nosDoCenario,
  problemasDoCenario, adicionarProblema, atualizarProblema, removerProblema, alternarFonteProblema,
  adicionarCriterio, atualizarCriterio, removerCriterio, definirNota, totalPonderado,
  apoioAderenciaTime, ehCriterioDeTime, CRITERIOS_SUGERIDOS,
  montarFinalista, recorteDoFinalista, escolherFinalista, pedidoVisaoDoFinalista,
} from "../panorama.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = JSON.parse(readFileSync(path.resolve(aqui, "../../../modelo-dados/hackos.schema.json"), "utf-8"));
const AGORA = "2026-10-06T10:00:00-03:00";

test("novoPanorama começa vazio, com todas as listas do contrato", () => {
  const pan = novoPanorama();
  assert.equal(pan.versao, 1);
  for (const chave of ["cenarios", "fatos", "clusters", "problemas_candidatos", "criterios_ranqueamento", "ranqueamento"]) {
    assert.deepEqual(pan[chave], []);
  }
});

test("normalizarPanorama preenche listas ausentes de um documento antigo/parcial", () => {
  const pan = normalizarPanorama({ versao: 1, cenarios: [{ id: "cen_1", nome: "X" }] });
  assert.equal(pan.cenarios.length, 1);
  assert.deepEqual(pan.fatos, []);
  assert.deepEqual(pan.ranqueamento, []);
});

test("adicionarCenario exige nome e gera ids sequenciais com o padrão do contrato", () => {
  const pan = novoPanorama();
  assert.throws(() => adicionarCenario(pan, { nome: "  " }), /nome/);
  const c1 = adicionarCenario(pan, { nome: "Green Tech & Agtech" });
  const c2 = adicionarCenario(pan, { nome: "Saúde" });
  assert.equal(c1.id, "cen_1");
  assert.equal(c2.id, "cen_2");
  assert.match(c1.id, new RegExp(SCHEMA.$defs.id.pattern));
  assert.deepEqual(c1.atores, []);
});

test("atualizarCenario muda nome/descrição; removerCenario some com o cenário e seus fatos (cascata)", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "Green Tech & Agtech" });
  atualizarCenario(pan, c.id, { descricao: "Zona rural" });
  assert.equal(c.descricao, "Zona rural");
  adicionarFato(pan, c.id, { autor: "mem_ana", agora: AGORA });
  adicionarFato(pan, c.id, { autor: "mem_ana", agora: AGORA });
  assert.equal(pan.fatos.length, 2);
  removerCenario(pan, c.id);
  assert.equal(pan.cenarios.length, 0);
  assert.equal(pan.fatos.length, 0, "fatos do cenário removido não deveriam sobrar órfãos");
  assert.throws(() => removerCenario(pan, "cen_inexistente"), /inexistente/);
});

test("adicionarFato cria com evidência default 'estimativa' e CSD 'suposicao', recusa cenário inexistente", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "Green Tech & Agtech" });
  assert.throws(() => adicionarFato(pan, "cen_inexistente", {}), /inexistente/);
  const f = adicionarFato(pan, c.id, { autor: "mem_ana", agora: AGORA });
  assert.equal(f.cenario, c.id);
  assert.equal(f.evidencia.tipo, "estimativa");
  assert.equal(f.evidencia.contem_dado_pessoal, false);
  assert.equal(f.classificacao_csd, "suposicao");
  assert.equal(f.criado_em, AGORA);
  assert.match(f.id, new RegExp(SCHEMA.$defs.id.pattern));
});

test("atualizarFato edita texto, evidência (merge) e classificação CSD; recusa classificação fora do enum", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "Green Tech & Agtech" });
  const f = adicionarFato(pan, c.id, {});
  atualizarFato(pan, f.id, { texto: "Conectividade rural é instável." });
  atualizarFato(pan, f.id, { evidencia: { tipo: "fonte_publica", descricao: "IBGE" } });
  assert.equal(f.texto, "Conectividade rural é instável.");
  assert.equal(f.evidencia.tipo, "fonte_publica");
  assert.equal(f.evidencia.descricao, "IBGE");
  assert.equal(f.evidencia.contem_dado_pessoal, false, "merge não deveria apagar contem_dado_pessoal");
  atualizarFato(pan, f.id, { classificacao_csd: "certeza" });
  assert.equal(f.classificacao_csd, "certeza");
  assert.throws(() => atualizarFato(pan, f.id, { classificacao_csd: "meio_certo" }), /inválida/);
  assert.throws(() => atualizarFato(pan, "fat_inexistente", { texto: "x" }), /inexistente/);
});

test("removerFato remove o fato certo e preserva os demais", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "X" });
  const f1 = adicionarFato(pan, c.id, {});
  const f2 = adicionarFato(pan, c.id, {});
  removerFato(pan, f1.id);
  assert.deepEqual(pan.fatos.map((f) => f.id), [f2.id]);
  assert.throws(() => removerFato(pan, f1.id), /inexistente/);
});

test("fatosDoCenario filtra só os fatos daquele cenário", () => {
  const pan = novoPanorama();
  const c1 = adicionarCenario(pan, { nome: "A" });
  const c2 = adicionarCenario(pan, { nome: "B" });
  const f1 = adicionarFato(pan, c1.id, {});
  adicionarFato(pan, c2.id, {});
  assert.deepEqual(fatosDoCenario(pan, c1.id).map((f) => f.id), [f1.id]);
});

test("pendencias: sem cenário, ou cenário sem nenhum fato com texto", () => {
  const pan = novoPanorama();
  assert.deepEqual(pendencias(pan), ["crie ao menos 1 cenário"]);
  const c = adicionarCenario(pan, { nome: "X" });
  assert.deepEqual(pendencias(pan), ["registre ao menos 1 fato com texto"]);
  const f = adicionarFato(pan, c.id, {});
  atualizarFato(pan, f.id, { texto: "  " });
  assert.deepEqual(pendencias(pan), ["registre ao menos 1 fato com texto"]);
  atualizarFato(pan, f.id, { texto: "Tem fato." });
  assert.deepEqual(pendencias(pan), []);
});

test("avisos aponta fato sem texto e fato sem descrição de evidência (os dois que paraContrato descartaria)", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "X" });
  const semTexto = adicionarFato(pan, c.id, {});
  const semEvidencia = adicionarFato(pan, c.id, {});
  atualizarFato(pan, semEvidencia.id, { texto: "Fato com texto mas sem evidência descrita." });
  const completo = adicionarFato(pan, c.id, {});
  atualizarFato(pan, completo.id, { texto: "Fato completo.", evidencia: { descricao: "Fonte X" } });

  const lista = avisos(pan);
  assert.equal(lista.length, 2);
  assert.ok(lista.some((a) => a.fatoId === semTexto.id && /sem texto/.test(a.mensagem)));
  assert.ok(lista.some((a) => a.fatoId === semEvidencia.id && /evidência/.test(a.mensagem)));
  assert.ok(!lista.some((a) => a.fatoId === completo.id));
});

test("paraContrato descarta cenário sem nome, fato sem texto/evidência, e tira espaços; preserva as demais listas", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "  Green Tech & Agtech  " });
  const fatoBom = adicionarFato(pan, c.id, { autor: "mem_ana", agora: AGORA });
  atualizarFato(pan, fatoBom.id, {
    texto: "  Conectividade rural é instável.  ",
    classificacao_csd: "suposicao",
    evidencia: { tipo: "estimativa", descricao: "  conta aberta do squad  ", referencia: "  ", data: "" },
  });
  const fatoRuim = adicionarFato(pan, c.id, {});
  pan.cenarios.push({ id: "cen_vazio", nome: "   " }); // simula cenário sem nome, como se tivesse vindo de um rascunho sujo

  const contrato = paraContrato(pan);
  assert.equal(contrato.cenarios.length, 1);
  assert.equal(contrato.cenarios[0].nome, "Green Tech & Agtech");
  assert.equal(contrato.fatos.length, 1, "fato sem texto/evidência (fatoRuim) deveria ser descartado");
  assert.equal(contrato.fatos[0].texto, "Conectividade rural é instável.");
  assert.equal(contrato.fatos[0].evidencia.descricao, "conta aberta do squad");
  assert.ok(!("referencia" in contrato.fatos[0].evidencia), "referencia vazia não deveria sobrar no contrato");
  assert.ok(!("data" in contrato.fatos[0].evidencia), "data vazia não deveria sobrar no contrato");
  assert.deepEqual(contrato.clusters, []);
  assert.deepEqual(contrato.ranqueamento, []);
  assert.ok(!("finalista" in contrato), "sem finalista escolhido, o campo não deveria aparecer");
  void fatoRuim;
});

test("EXPLICACAO_CSD cobre as 3 classificações do schema com rótulo e explicação", () => {
  assert.deepEqual(CLASSIFICACOES_CSD, SCHEMA.$defs.classificacao_csd.enum);
  for (const c of CLASSIFICACOES_CSD) {
    assert.ok(EXPLICACAO_CSD[c].rotulo);
    assert.ok(EXPLICACAO_CSD[c].explicacao.length > 10);
  }
});

// ---------- Bolt 2: clusters ----------

test("adicionarCluster exige cenário existente e gera ids sequenciais do contrato", () => {
  const pan = novoPanorama();
  assert.throws(() => adicionarCluster(pan, "cen_inexistente", { nome: "X" }), /cenário inexistente/);
  const c = adicionarCenario(pan, { nome: "Green Tech & Agtech" });
  const clu1 = adicionarCluster(pan, c.id, { nome: "Conectividade" });
  const clu2 = adicionarCluster(pan, c.id, { nome: "" });
  assert.equal(clu1.id, "clu_1");
  assert.equal(clu2.id, "clu_2");
  assert.match(clu1.id, new RegExp(SCHEMA.$defs.id.pattern));
  assert.deepEqual(clustersDoCenario(pan, c.id).map((x) => x.id), ["clu_1", "clu_2"]);
});

test("atualizarCluster muda o nome; removerCluster tira o cluster mas não os elementos (fatos) referenciados", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "X" });
  const f = adicionarFato(pan, c.id, {});
  const clu = adicionarCluster(pan, c.id, { nome: "Rascunho" });
  adicionarElementoCluster(pan, clu.id, f.id);
  atualizarCluster(pan, clu.id, { nome: "Conectividade e acesso" });
  assert.equal(pan.clusters[0].nome, "Conectividade e acesso");

  removerCluster(pan, clu.id);
  assert.equal(clustersDoCenario(pan, c.id).length, 0);
  assert.equal(fatosDoCenario(pan, c.id).length, 1, "remover cluster não deveria apagar o fato");
  assert.throws(() => removerCluster(pan, clu.id), /cluster inexistente/);
});

test("adicionarElementoCluster não duplica o mesmo elemento e exige um id", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "X" });
  const f = adicionarFato(pan, c.id, {});
  const clu = adicionarCluster(pan, c.id, { nome: "A" });
  assert.throws(() => adicionarElementoCluster(pan, clu.id, ""), /elemento/);
  adicionarElementoCluster(pan, clu.id, f.id);
  adicionarElementoCluster(pan, clu.id, f.id);
  assert.deepEqual(pan.clusters[0].elementos, [f.id]);
  removerElementoCluster(pan, clu.id, f.id);
  assert.deepEqual(pan.clusters[0].elementos, []);
});

test("nosDoCenario detecta elemento presente em mais de um cluster, só dentro do mesmo cenário", () => {
  const pan = novoPanorama();
  const c1 = adicionarCenario(pan, { nome: "Green Tech & Agtech" });
  const c2 = adicionarCenario(pan, { nome: "Saúde" });
  const f1 = adicionarFato(pan, c1.id, {});
  const f2 = adicionarFato(pan, c1.id, {});
  const fOutroCenario = adicionarFato(pan, c2.id, {});

  const cluA = adicionarCluster(pan, c1.id, { nome: "A" });
  const cluB = adicionarCluster(pan, c1.id, { nome: "B" });
  adicionarElementoCluster(pan, cluA.id, f1.id);
  adicionarElementoCluster(pan, cluA.id, f2.id);
  adicionarElementoCluster(pan, cluB.id, f1.id); // f1 está em A e B: é um nó

  const nos = nosDoCenario(pan, c1.id);
  assert.equal(nos.length, 1);
  assert.equal(nos[0].elementoId, f1.id);
  assert.deepEqual(nos[0].clusterIds.sort(), [cluA.id, cluB.id].sort());
  assert.deepEqual(nosDoCenario(pan, c2.id), [], "fato de outro cenário não deveria contar");
  void fOutroCenario;
});

test("avisos aponta cluster sem nome e cluster sem elementos, além dos avisos de fato já existentes", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "X" });
  const semNome = adicionarCluster(pan, c.id, { nome: "" });
  const semElementos = adicionarCluster(pan, c.id, { nome: "Vazio" });
  const f = adicionarFato(pan, c.id, {});
  const completo = adicionarCluster(pan, c.id, { nome: "Completo" });
  adicionarElementoCluster(pan, completo.id, f.id);

  const lista = avisos(pan);
  assert.ok(lista.some((a) => a.clusterId === semNome.id && /sem nome/.test(a.mensagem)));
  assert.ok(lista.some((a) => a.clusterId === semElementos.id && /sem nenhum elemento/.test(a.mensagem)));
  assert.ok(!lista.some((a) => a.clusterId === completo.id));
});

test("paraContrato descarta cluster sem nome/sem elementos, tira referências a fatos que não sobreviveram, e preserva cluster válido", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "Green Tech & Agtech" });
  const fatoBom = adicionarFato(pan, c.id, { autor: "mem_ana", agora: AGORA });
  atualizarFato(pan, fatoBom.id, { texto: "Fato válido.", evidencia: { descricao: "fonte" } });
  const fatoRuim = adicionarFato(pan, c.id, {}); // sem texto — será descartado por paraContrato

  const clusterValido = adicionarCluster(pan, c.id, { nome: "  Conectividade  " });
  adicionarElementoCluster(pan, clusterValido.id, fatoBom.id);
  adicionarElementoCluster(pan, clusterValido.id, fatoRuim.id); // referência a um fato que vai sumir do contrato

  adicionarCluster(pan, c.id, { nome: "" }); // sem nome
  const clusterSoComFatoRuim = adicionarCluster(pan, c.id, { nome: "Só tem o ruim" });
  adicionarElementoCluster(pan, clusterSoComFatoRuim.id, fatoRuim.id); // sobra vazio depois do filtro

  const contrato = paraContrato(pan);
  assert.equal(contrato.clusters.length, 1, "só o cluster com nome e ao menos 1 elemento sobrevivente deveria ficar");
  assert.equal(contrato.clusters[0].nome, "Conectividade");
  assert.deepEqual(contrato.clusters[0].elementos, [fatoBom.id], "referência ao fato descartado não deveria sobrar");
});

test("htmlPanorama renderiza sem cenário, com cenário vazio e com fatos, sem lançar exceção, e escapa texto do squad", () => {
  assert.doesNotThrow(() => htmlPanorama(novoPanorama()));
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "Green Tech & Agtech" });
  assert.doesNotThrow(() => htmlPanorama(pan, { cenarioAberto: c.id }));
  const f = adicionarFato(pan, c.id, {});
  atualizarFato(pan, f.id, { texto: '<script>alert(1)</script>' });
  const html = htmlPanorama(pan, { cenarioAberto: c.id });
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("Green Tech &amp; Agtech") || html.includes("Green Tech"));
});

test("htmlPanorama renderiza clusters e marca nó com o selo, sem lançar exceção", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "Green Tech & Agtech" });
  const f = adicionarFato(pan, c.id, {});
  atualizarFato(pan, f.id, { texto: "Conectividade instável no campo." });
  const cluA = adicionarCluster(pan, c.id, { nome: "A" });
  const cluB = adicionarCluster(pan, c.id, { nome: "B" });
  adicionarElementoCluster(pan, cluA.id, f.id);
  adicionarElementoCluster(pan, cluB.id, f.id);

  const html = htmlPanorama(pan, { cenarioAberto: c.id });
  assert.ok(html.includes("panorama-no-selo"), "elemento em 2 clusters deveria ganhar o selo de nó");
  assert.ok(html.includes("Conectividade instável"));
});

// ---------- Bolt 3 — problemas candidatos ----------

// Fato "completo" o bastante para sobreviver a `paraContrato` (precisa de
// texto E da descrição da evidência — ver teste de avisos do Bolt 1).
function cenarioComFato(texto = "Fato de teste") {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "Green Tech & Agtech" });
  const f = adicionarFato(pan, c.id, {});
  atualizarFato(pan, f.id, { texto, evidencia: { descricao: "Evidência de teste." } });
  return { pan, c, f };
}

test("adicionarProblema exige cenário existente e gera id com o padrão do contrato", () => {
  const { pan, c } = cenarioComFato();
  assert.throws(() => adicionarProblema(pan, "cen_inexistente"), /cenário inexistente/);
  const p = adicionarProblema(pan, c.id);
  assert.match(p.id, new RegExp(SCHEMA.$defs.id.pattern));
  assert.equal(p.cenario, c.id);
  assert.deepEqual(problemasDoCenario(pan, c.id), [p]);
});

test("atualizarProblema edita pergunta/magnitude/cluster_origem; cluster_origem vazio remove o campo", () => {
  const { pan, c } = cenarioComFato();
  const p = adicionarProblema(pan, c.id);
  atualizarProblema(pan, p.id, { pergunta_problema: "Por que X apesar de Y?", magnitude: "Estimativa aberta: 3 em 5 casos." });
  assert.equal(p.pergunta_problema, "Por que X apesar de Y?");
  atualizarProblema(pan, p.id, { cluster_origem: "clu_1" });
  assert.equal(p.cluster_origem, "clu_1");
  atualizarProblema(pan, p.id, { cluster_origem: "" });
  assert.ok(!("cluster_origem" in p));
  assert.throws(() => atualizarProblema(pan, "prob_inexistente", {}), /inexistente/);
});

test("alternarFonteProblema só aceita fato do mesmo cenário do problema", () => {
  const { pan, c, f } = cenarioComFato();
  const outroCenario = adicionarCenario(pan, { nome: "Saúde" });
  const fatoDeOutro = adicionarFato(pan, outroCenario.id, {});
  atualizarFato(pan, fatoDeOutro.id, { texto: "Fato de outro cenário" });
  const p = adicionarProblema(pan, c.id);

  alternarFonteProblema(pan, p.id, f.id, true);
  assert.deepEqual(p.fontes, [f.id]);
  alternarFonteProblema(pan, p.id, f.id, false);
  assert.deepEqual(p.fontes, []);
  assert.throws(() => alternarFonteProblema(pan, p.id, fatoDeOutro.id, true), /não pertence ao cenário/);
});

test("removerFato tira a referência de qualquer problema que o usava como fonte", () => {
  const { pan, c, f } = cenarioComFato();
  const p = adicionarProblema(pan, c.id);
  alternarFonteProblema(pan, p.id, f.id, true);
  assert.deepEqual(p.fontes, [f.id]);
  removerFato(pan, f.id);
  assert.deepEqual(p.fontes, []);
});

test("removerCluster desliga cluster_origem de qualquer problema que apontava pra ele, sem apagar o problema", () => {
  const { pan, c } = cenarioComFato();
  const clu = adicionarCluster(pan, c.id, { nome: "X" });
  const p = adicionarProblema(pan, c.id);
  atualizarProblema(pan, p.id, { cluster_origem: clu.id });
  removerCluster(pan, clu.id);
  assert.ok(!("cluster_origem" in p));
  assert.equal(problemasDoCenario(pan, c.id).length, 1);
});

test("removerCenario remove em cascata fatos, clusters e problemas candidatos dele", () => {
  const { pan, c, f } = cenarioComFato();
  const clu = adicionarCluster(pan, c.id, { nome: "X" });
  adicionarElementoCluster(pan, clu.id, f.id);
  adicionarProblema(pan, c.id);
  removerCenario(pan, c.id);
  assert.deepEqual(pan.fatos, []);
  assert.deepEqual(pan.clusters, []);
  assert.deepEqual(pan.problemas_candidatos, []);
});

test("removerProblema tira da lista; id inexistente lança erro", () => {
  const { pan, c } = cenarioComFato();
  const p = adicionarProblema(pan, c.id);
  removerProblema(pan, p.id);
  assert.deepEqual(problemasDoCenario(pan, c.id), []);
  assert.throws(() => removerProblema(pan, p.id), /inexistente/);
});

test("avisos aponta problema sem pergunta/magnitude/fontes; paraContrato descarta até ter os 3", () => {
  const { pan, c, f } = cenarioComFato();
  const p = adicionarProblema(pan, c.id);

  let a = avisos(pan);
  assert.ok(a.some((x) => x.problemaId === p.id), "problema vazio deveria gerar aviso");
  assert.equal(paraContrato(pan).problemas_candidatos.length, 0);

  atualizarProblema(pan, p.id, { pergunta_problema: "Por que X?" });
  assert.equal(paraContrato(pan).problemas_candidatos.length, 0, "ainda falta magnitude e fonte");

  atualizarProblema(pan, p.id, { magnitude: "Estimativa aberta." });
  alternarFonteProblema(pan, p.id, f.id, true);

  a = avisos(pan);
  assert.ok(!a.some((x) => x.problemaId === p.id), "problema completo não deveria gerar aviso");
  const contrato = paraContrato(pan);
  assert.equal(contrato.problemas_candidatos.length, 1);
  assert.deepEqual(contrato.problemas_candidatos[0].fontes, [f.id]);
});

test("paraContrato tira referência a fonte cujo fato não sobreviveu, e a cluster_origem que não sobreviveu", () => {
  const { pan, c } = cenarioComFato();
  const fatoRuim = adicionarFato(pan, c.id, {}); // sem texto, será descartado
  const clusterSemElemento = adicionarCluster(pan, c.id, { nome: "Vazio depois do filtro" });
  adicionarElementoCluster(pan, clusterSemElemento.id, fatoRuim.id); // some junto com o fato

  const p = adicionarProblema(pan, c.id);
  atualizarProblema(pan, p.id, {
    pergunta_problema: "Por que X?",
    magnitude: "Estimativa aberta.",
    cluster_origem: clusterSemElemento.id,
  });
  // fonte válida (fato "bom" do cenarioComFato) + fonte que vai sumir
  const fatoBom = fatosDoCenario(pan, c.id)[0];
  alternarFonteProblema(pan, p.id, fatoBom.id, true);
  p.fontes.push(fatoRuim.id); // injeta direto, sem passar pela validação de alternarFonteProblema

  const contrato = paraContrato(pan);
  assert.equal(contrato.problemas_candidatos.length, 1);
  assert.deepEqual(contrato.problemas_candidatos[0].fontes, [fatoBom.id], "fonte cujo fato não sobreviveu deveria sumir");
  assert.ok(!("cluster_origem" in contrato.problemas_candidatos[0]), "cluster que não sobreviveu não deveria aparecer");
});

test("htmlPanorama renderiza a seção de problemas candidatos sem lançar exceção, e escapa texto do squad", () => {
  const { pan, c, f } = cenarioComFato("Produtores com conectividade instável.");
  const p = adicionarProblema(pan, c.id);
  atualizarProblema(pan, p.id, { pergunta_problema: '<script>alert(2)</script>' });
  alternarFonteProblema(pan, p.id, f.id, true);

  const html = htmlPanorama(pan, { cenarioAberto: c.id });
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("Problemas candidatos"));
  assert.ok(html.includes("Produtores com conectividade instável"));
});

// ---------- Bolt 4 — ranqueamento ----------

function panoramaComProblema() {
  const { pan, c, f } = cenarioComFato("Pequeno produtor sem conectividade estável.");
  const p = adicionarProblema(pan, c.id);
  atualizarProblema(pan, p.id, { pergunta_problema: "Por que X?", magnitude: "Estimativa aberta." });
  alternarFonteProblema(pan, p.id, f.id, true);
  return { pan, c, f, p };
}

test("adicionarCriterio exige nome, aceita peso, e sugere os 6 critérios do ROADMAP", () => {
  const pan = novoPanorama();
  assert.throws(() => adicionarCriterio(pan, { nome: " " }), /nome/);
  const c = adicionarCriterio(pan, { nome: "Magnitude do problema", peso: 2 });
  assert.match(c.id, new RegExp(SCHEMA.$defs.id.pattern));
  assert.equal(c.peso, 2);
  assert.equal(CRITERIOS_SUGERIDOS.length, 6);
  assert.ok(CRITERIOS_SUGERIDOS.includes("Aderência ao time"));
});

test("atualizarCriterio troca nome/peso; peso negativo ou não-numérico vira 0, não quebra", () => {
  const pan = novoPanorama();
  const c = adicionarCriterio(pan, { nome: "X", peso: 1 });
  atualizarCriterio(pan, c.id, { peso: 3 });
  assert.equal(c.peso, 3);
  atualizarCriterio(pan, c.id, { peso: "abacate" });
  assert.equal(c.peso, 0);
  atualizarCriterio(pan, c.id, { peso: -5 });
  assert.equal(c.peso, 0);
});

test("removerCriterio tira em cascata as notas que citavam ele", () => {
  const { pan, p } = panoramaComProblema();
  const c1 = adicionarCriterio(pan, { nome: "A", peso: 1 });
  const c2 = adicionarCriterio(pan, { nome: "B", peso: 1 });
  definirNota(pan, p.id, c1.id, { nota: 5 });
  definirNota(pan, p.id, c2.id, { nota: 7 });
  removerCriterio(pan, c1.id);
  assert.equal(pan.ranqueamento.length, 1);
  assert.equal(pan.ranqueamento[0].criterio, c2.id);
});

test("definirNota valida problema/critério existentes e a faixa 0-10; nota vazia remove a entrada", () => {
  const { pan, p } = panoramaComProblema();
  const c = adicionarCriterio(pan, { nome: "A", peso: 1 });
  assert.throws(() => definirNota(pan, "prob_x", c.id, { nota: 5 }), /problema candidato inexistente/);
  assert.throws(() => definirNota(pan, p.id, "crit_x", { nota: 5 }), /critério inexistente/);
  assert.throws(() => definirNota(pan, p.id, c.id, { nota: 11 }), /0 a 10/);
  assert.throws(() => definirNota(pan, p.id, c.id, { nota: -1 }), /0 a 10/);

  const item = definirNota(pan, p.id, c.id, { nota: 7, justificativa: "porque sim" });
  assert.equal(item.nota, 7);
  assert.equal(pan.ranqueamento.length, 1);

  definirNota(pan, p.id, c.id, { nota: 9 });
  assert.equal(pan.ranqueamento.length, 1, "upsert não deveria duplicar");
  assert.equal(pan.ranqueamento[0].nota, 9);

  definirNota(pan, p.id, c.id, { nota: "" });
  assert.equal(pan.ranqueamento.length, 0, "nota vazia remove a entrada");
});

test("totalPonderado é média ponderada só dos critérios já avaliados — não pune avaliação parcial", () => {
  const { pan, p } = panoramaComProblema();
  assert.equal(totalPonderado(pan, p.id), null, "sem nenhuma nota ainda");

  const c1 = adicionarCriterio(pan, { nome: "A", peso: 3 });
  const c2 = adicionarCriterio(pan, { nome: "B", peso: 1 });
  definirNota(pan, p.id, c1.id, { nota: 8 });
  // só c1 avaliado: média ponderada é a própria nota de c1, não penalizada por c2 faltar.
  let total = totalPonderado(pan, p.id);
  assert.equal(total.total, 8);
  assert.equal(total.avaliados, 1);
  assert.equal(total.deCriterios, 2);

  definirNota(pan, p.id, c2.id, { nota: 4 });
  total = totalPonderado(pan, p.id);
  assert.equal(total.total, (8 * 3 + 4 * 1) / 4);
  assert.equal(total.avaliados, 2);
});

test("apoioAderenciaTime cruza o nome do cenário com areas_afinidade por substring, ignorando maiúsculas/acentos", () => {
  const squad = {
    membros: [
      { nome: "Ana", areas_afinidade: [{ area: "Green Tech & Agtech", nivel: "experiencia", como_agrega: "Agro" }] },
      { nome: "Bruno", areas_afinidade: [{ area: "Saúde", nivel: "interesse" }] },
    ],
  };
  const apoios = apoioAderenciaTime(squad, "green tech & agtech (campus mobile)");
  assert.equal(apoios.length, 1);
  assert.equal(apoios[0].membro, "Ana");
  assert.deepEqual(apoioAderenciaTime(squad, "Tecnologias Urbanas"), []);
  assert.deepEqual(apoioAderenciaTime(null, "qualquer"), [], "squad ausente não deveria quebrar");
});

test("ehCriterioDeTime detecta pelo nome, sem distinguir maiúsculas", () => {
  assert.ok(ehCriterioDeTime({ nome: "Aderência ao time" }));
  assert.ok(ehCriterioDeTime({ nome: "TIME" }));
  assert.ok(!ehCriterioDeTime({ nome: "Magnitude" }));
});

test("paraContrato descarta critério sem nome e nota cujo problema/critério não sobreviveu", () => {
  const { pan, p } = panoramaComProblema();
  const c = adicionarCriterio(pan, { nome: "A", peso: 1 });
  definirNota(pan, p.id, c.id, { nota: 6 });
  pan.criterios_ranqueamento.push({ id: "crit_vazio", nome: "  ", peso: 1 }); // injeta direto: nome vazio deve ser descartado

  const contrato = paraContrato(pan);
  assert.equal(contrato.criterios_ranqueamento.length, 1);
  assert.equal(contrato.ranqueamento.length, 1);

  removerProblema(pan, p.id);
  const contrato2 = paraContrato(pan);
  assert.equal(contrato2.ranqueamento.length, 0, "nota do problema removido não deveria sobreviver");
});

test("htmlPanorama renderiza a seção de ranqueamento com a matriz e o apoio de aderência ao time, sem lançar exceção", () => {
  const { pan, c, p } = panoramaComProblema();
  const crit = adicionarCriterio(pan, { nome: "Aderência ao time", peso: 1 });
  definirNota(pan, p.id, crit.id, { nota: 6 });
  const squad = { membros: [{ nome: "Ana", areas_afinidade: [{ area: c.nome, nivel: "experiencia" }] }] };

  const html = htmlPanorama(pan, { cenarioAberto: c.id, squad });
  assert.ok(html.includes("Ranqueamento"));
  assert.ok(html.includes("Total ponderado"));
  assert.ok(html.includes("apoio do time"));
  assert.ok(html.includes("Ana"));
});

test("htmlPanorama não mostra a seção de ranqueamento sem nenhum problema candidato", () => {
  const pan = novoPanorama();
  const c = adicionarCenario(pan, { nome: "X" });
  const html = htmlPanorama(pan, { cenarioAberto: c.id });
  assert.ok(!html.includes("panorama-ranqueamento"));
});

// ---------- Bolt 5: finalista + handoff pro Sistêmico ----------

test("montarFinalista exige pergunta-problema preenchida e usa o nome do cenário como tema", () => {
  const { pan, c, p } = panoramaComProblema();
  const finalista = montarFinalista(pan, p.id);
  assert.equal(finalista.problema, p.id);
  assert.equal(finalista.tema, c.nome);
  assert.equal(finalista.pergunta_problema, "Por que X?");
  assert.deepEqual(finalista.atores, []);

  atualizarProblema(pan, p.id, { pergunta_problema: "  " });
  assert.throws(() => montarFinalista(pan, p.id), /pergunta-problema/);
});

test("montarFinalista traz a fronteira do cluster de origem quando o problema aponta um", () => {
  const { pan, c, p } = panoramaComProblema();
  const clu = adicionarCluster(pan, c.id, { nome: "Conectividade no campo" });
  atualizarProblema(pan, p.id, { cluster_origem: clu.id });
  const finalista = montarFinalista(pan, p.id);
  assert.match(finalista.fronteira, /Conectividade no campo/);
});

test("montarFinalista carrega os atores do cenário", () => {
  const { pan, c, p } = panoramaComProblema();
  c.atores = [{ id: "ator_produtor", nome: "Pequeno produtor", papeis: ["sofre"] }];
  const finalista = montarFinalista(pan, p.id);
  assert.equal(finalista.atores.length, 1);
  assert.equal(finalista.atores[0].id, "ator_produtor");
});

test("recorteDoFinalista gera um id com o padrão do contrato a partir do tema", () => {
  const recorte = recorteDoFinalista({ tema: "Green Tech & Agtech" });
  assert.match(recorte, new RegExp(SCHEMA.$defs.id.pattern));
  assert.equal(recorte, "rec_green_tech_agtech");
});

test("recorteDoFinalista nunca fica vazio, mesmo com tema sem letras/números", () => {
  assert.equal(recorteDoFinalista({ tema: "???" }), "rec_tema");
});

test("escolherFinalista grava o finalista no panorama", () => {
  const { pan, p } = panoramaComProblema();
  assert.equal(pan.finalista, undefined);
  const finalista = escolherFinalista(pan, p.id);
  assert.equal(pan.finalista, finalista);
  assert.equal(pan.finalista.problema, p.id);
});

test("pedidoVisaoDoFinalista monta um pedido_visao mínimo mas completo (todos os campos do contrato de mapa presentes)", () => {
  const { pan, p } = panoramaComProblema();
  const finalista = montarFinalista(pan, p.id);
  const recorte = recorteDoFinalista(finalista);
  const pedido = pedidoVisaoDoFinalista(finalista, recorte, new Date(AGORA));

  assert.equal(pedido.mapa.recorte, recorte);
  assert.equal(pedido.mapa.contexto.tema, finalista.tema);
  assert.equal(pedido.mapa.contexto.pergunta_problema, finalista.pergunta_problema);
  for (const chave of ["variaveis", "setas", "loops_anotados", "alavancas"]) {
    assert.deepEqual(pedido.mapa[chave], []);
  }
  assert.deepEqual(pedido.mapa.analise, {});
  assert.deepEqual(pedido.validacao, { loops: [], problemas: [] });
  assert.deepEqual(pedido.visoes_abertas, []);
  assert.match(pedido.id, new RegExp(SCHEMA.$defs.id.pattern));
  assert.equal(pedido.gatilho, "pedido");
  assert.ok(SCHEMA.$defs.pedido_visao.properties.gatilho.enum.includes(pedido.gatilho));
});

test("pedidoVisaoDoFinalista não inclui fronteira quando o finalista não tem uma", () => {
  const { pan, p } = panoramaComProblema();
  const finalista = montarFinalista(pan, p.id);
  assert.ok(!("fronteira" in finalista));
  const pedido = pedidoVisaoDoFinalista(finalista, "rec_teste", new Date(AGORA));
  assert.ok(!("fronteira" in pedido.mapa.contexto));
});
