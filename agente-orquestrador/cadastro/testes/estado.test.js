import { test } from "node:test";
import assert from "node:assert/strict";

import {
  novoSquad, normalizar, adicionarMembro, removerMembro, atualizarMembro,
  alternarFrente, adicionarAreaAfinidade, removerAreaAfinidade, atualizarAreaAfinidade,
  paraContrato, pendencias, avisos, completudeMembro, resumoEquipe,
} from "../estado.js";

test("novoSquad começa vazio", () => {
  assert.deepEqual(novoSquad(), { hackathon: "", membros: [] });
});

test("normalizar preenche squad incompleto e ignora frente/nível desconhecidos", () => {
  const s = normalizar({ membros: [{ id: "mem_1", nome: "Ana", frentes: ["narrativa", "cavalo"] }] });
  assert.equal(s.hackathon, "");
  assert.deepEqual(s.membros[0].frentes, ["narrativa"]);
  assert.deepEqual(s.membros[0].areas_afinidade, []);
});

test("adicionarMembro gera ids sequenciais com prefixo mem_", () => {
  const s = novoSquad();
  const a = adicionarMembro(s, { nome: "Ana" });
  const b = adicionarMembro(s, { nome: "Bruno" });
  assert.equal(a.id, "mem_1");
  assert.equal(b.id, "mem_2");
  assert.equal(s.membros.length, 2);
});

test("adicionarMembro não colide id depois de remover o do meio", () => {
  const s = novoSquad();
  adicionarMembro(s, { nome: "Ana" });
  const b = adicionarMembro(s, { nome: "Bruno" });
  removerMembro(s, b.id);
  const c = adicionarMembro(s, { nome: "Carla" });
  assert.equal(c.id, "mem_2");
});

test("removerMembro em id inexistente lança erro", () => {
  const s = novoSquad();
  assert.throws(() => removerMembro(s, "mem_9"));
});

test("atualizarMembro muda o nome", () => {
  const s = novoSquad();
  const a = adicionarMembro(s, { nome: "Ana" });
  atualizarMembro(s, a.id, { nome: "Ana Paula" });
  assert.equal(s.membros[0].nome, "Ana Paula");
});

test("alternarFrente liga e desliga sem duplicar", () => {
  const s = novoSquad();
  const a = adicionarMembro(s, { nome: "Ana" });
  alternarFrente(s, a.id, "construcao", true);
  alternarFrente(s, a.id, "construcao", true);
  assert.deepEqual(s.membros[0].frentes, ["construcao"]);
  alternarFrente(s, a.id, "construcao", false);
  assert.deepEqual(s.membros[0].frentes, []);
});

test("alternarFrente recusa frente desconhecida", () => {
  const s = novoSquad();
  const a = adicionarMembro(s, { nome: "Ana" });
  assert.throws(() => alternarFrente(s, a.id, "voo_espacial", true));
});

test("área de afinidade: adicionar, atualizar e remover por índice", () => {
  const s = novoSquad();
  const a = adicionarMembro(s, { nome: "Ana" });
  adicionarAreaAfinidade(s, a.id, { area: "Green Tech", nivel: "interesse" });
  adicionarAreaAfinidade(s, a.id, { area: "Saúde", nivel: "nenhum" });
  atualizarAreaAfinidade(s, a.id, 0, { nivel: "experiencia", como_agrega: "2 anos de estágio" });
  assert.equal(s.membros[0].areas_afinidade[0].nivel, "experiencia");
  removerAreaAfinidade(s, a.id, 1);
  assert.equal(s.membros[0].areas_afinidade.length, 1);
});

test("área de afinidade recusa nível fora do enum", () => {
  const s = novoSquad();
  const a = adicionarMembro(s, { nome: "Ana" });
  assert.throws(() => adicionarAreaAfinidade(s, a.id, { area: "X", nivel: "domina_totalmente" }));
});

test("paraContrato tira membro sem nome, área sem nome e campos vazios", () => {
  const s = novoSquad();
  s.hackathon = "  Campus Mobile  ";
  const a = adicionarMembro(s, { nome: " Ana " });
  adicionarMembro(s, { nome: "   " }); // descartado
  adicionarAreaAfinidade(s, a.id, { area: "Green Tech", nivel: "interesse", como_agrega: "" });
  adicionarAreaAfinidade(s, a.id, { area: "   ", nivel: "nenhum" }); // descartado

  const contrato = paraContrato(s);
  assert.equal(contrato.hackathon, "Campus Mobile");
  assert.equal(contrato.membros.length, 1);
  assert.equal(contrato.membros[0].nome, "Ana");
  assert.equal(contrato.membros[0].areas_afinidade.length, 1);
  assert.equal("como_agrega" in contrato.membros[0].areas_afinidade[0], false);
  assert.equal("frentes" in contrato.membros[0], false);
});

test("paraContrato mantém como_agrega quando preenchido", () => {
  const s = novoSquad();
  s.hackathon = "X";
  const a = adicionarMembro(s, { nome: "Ana" });
  adicionarAreaAfinidade(s, a.id, { area: "Green Tech", nivel: "experiencia", como_agrega: "Sei programar sensores IoT" });
  const contrato = paraContrato(s);
  assert.equal(contrato.membros[0].areas_afinidade[0].como_agrega, "Sei programar sensores IoT");
});

test("pendencias aponta hackathon e membro faltando", () => {
  const s = novoSquad();
  assert.deepEqual(pendencias(s), ["falta o nome do hackathon", "cadastre ao menos 1 integrante com nome"]);
  s.hackathon = "Campus Mobile";
  adicionarMembro(s, { nome: "Ana" });
  assert.deepEqual(pendencias(s), []);
});

test("avisos aponta área sem nome, não aponta área preenchida", () => {
  const s = novoSquad();
  const a = adicionarMembro(s, { nome: "Ana" });
  adicionarAreaAfinidade(s, a.id, { area: "", nivel: "interesse" });
  adicionarAreaAfinidade(s, a.id, { area: "Green Tech", nivel: "interesse" });
  const lista = avisos(s);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].membroId, a.id);
  assert.equal(lista[0].indice, 0);
  assert.match(lista[0].mensagem, /Ana/);
});

test("avisos aponta integrante sem nome pela posição", () => {
  const s = novoSquad();
  adicionarMembro(s, { nome: "Ana" });
  adicionarMembro(s, {}); // 2º integrante, sem nome — ex.: duplo toque em "+ Integrante"
  const lista = avisos(s);
  assert.equal(lista.length, 1);
  assert.match(lista[0].mensagem, /Integrante 2.*sem nome/);
});

// Reprodução do relato do Lucas (teste real no celular, 2026-10-05):
// "tentei cadastrar dois integrantes e não consegui salvar o segundo" +
// "ficou confuso ficar aparecendo duplicado". Confirma que NÃO é colisão
// de id (já coberto por "adicionarMembro gera ids sequenciais") — é
// puramente de interface: duas chamadas de adicionarMembro em sequência
// (o que um duplo toque real dispara) criam 2 cartões em branco
// distintos; se só um ganha nome antes de salvar, o outro desaparece em
// silêncio no paraContrato (antes deste bolt, avisos() não apontava
// isso). A correção de interface fica em app.js (guarda contra duplo
// toque + foco automático no cartão novo); aqui só provamos que o motivo
// do "sumiço" é o filtro de nome vazio, agora com aviso visível.
test("reprodução: duplo toque em '+ Integrante' cria 2 cartões em branco; paraContrato descarta o sem nome, avisos agora aponta", () => {
  const s = novoSquad();
  s.hackathon = "Campus Mobile 2026";
  const a = adicionarMembro(s, { nome: "Ana" });
  const b = adicionarMembro(s, {}); // duplo toque: 1º card em branco
  const c = adicionarMembro(s, {}); // duplo toque: 2º card em branco
  assert.equal(s.membros.length, 3);
  assert.notEqual(b.id, c.id); // sem colisão de id

  atualizarMembro(s, b.id, { nome: "Bruno" }); // usuário só percebeu/preencheu um dos dois

  const contrato = paraContrato(s);
  assert.equal(contrato.membros.length, 2); // Ana + Bruno; o cartão "c" sumiu em silêncio
  assert.equal(avisos(s).some((av) => av.membroId === c.id), true); // mas agora tem aviso antes de salvar
});

test("avisos fica vazio sem áreas sem nome", () => {
  const s = novoSquad();
  const a = adicionarMembro(s, { nome: "Ana" });
  adicionarAreaAfinidade(s, a.id, { area: "Green Tech", nivel: "interesse" });
  assert.deepEqual(avisos(s), []);
});

test("completudeMembro: sem nome, sem frente e sem área útil junta os 3 motivos", () => {
  const { completo, motivos } = completudeMembro({ nome: "", frentes: [], areas_afinidade: [] });
  assert.equal(completo, false);
  assert.equal(motivos.length, 3);
});

test("completudeMembro: área só com nível 'nenhum' não conta como área útil", () => {
  const membro = { nome: "Ana", frentes: ["narrativa"], areas_afinidade: [{ area: "Saúde", nivel: "nenhum" }] };
  const { completo, motivos } = completudeMembro(membro);
  assert.equal(completo, false);
  assert.deepEqual(motivos, ["sem área de afinidade com interesse ou experiência"]);
});

test("completudeMembro: nome + frente + área com interesse/experiência é completo", () => {
  const membro = { nome: "Ana", frentes: ["narrativa"], areas_afinidade: [{ area: "Green Tech", nivel: "interesse" }] };
  assert.deepEqual(completudeMembro(membro), { completo: true, motivos: [] });
});

test("resumoEquipe: squad vazio não está completo", () => {
  const r = resumoEquipe(novoSquad());
  assert.equal(r.tudoCompleto, false);
  assert.equal(r.membros.length, 0);
});

test("resumoEquipe: tudoCompleto só quando hackathon + todos os membros completos", () => {
  const s = novoSquad();
  s.hackathon = "Campus Mobile";
  const a = adicionarMembro(s, { nome: "Ana" });
  alternarFrente(s, a.id, "narrativa", true);
  adicionarAreaAfinidade(s, a.id, { area: "Green Tech", nivel: "experiencia" });
  const b = adicionarMembro(s, { nome: "Bruno" }); // sem frente, sem área
  let r = resumoEquipe(s);
  assert.equal(r.tudoCompleto, false);
  assert.equal(r.membros.find((m) => m.id === a.id).completo, true);
  assert.equal(r.membros.find((m) => m.id === b.id).completo, false);

  removerMembro(s, b.id);
  r = resumoEquipe(s);
  assert.equal(r.tudoCompleto, true);
});
