import { test } from "node:test";
import assert from "node:assert/strict";

import { resumoEquipe, novoSquad, adicionarMembro, alternarFrente, adicionarAreaAfinidade } from "../estado.js";
import { htmlVisaoEquipe } from "../visao.js";

test("htmlVisaoEquipe: squad vazio pede pra preencher o Cadastro primeiro", () => {
  const html = htmlVisaoEquipe(resumoEquipe(novoSquad()));
  assert.match(html, /preencha a aba Cadastro/);
});

test("htmlVisaoEquipe: banner muda entre pendente e ok conforme completude", () => {
  const s = novoSquad();
  s.hackathon = "Campus Mobile";
  const a = adicionarMembro(s, { nome: "Ana" });
  let html = htmlVisaoEquipe(resumoEquipe(s));
  assert.match(html, /banner-pendente/);
  assert.match(html, /Incompleto/);

  alternarFrente(s, a.id, "narrativa", true);
  adicionarAreaAfinidade(s, a.id, { area: "Green Tech", nivel: "experiencia" });
  html = htmlVisaoEquipe(resumoEquipe(s));
  assert.match(html, /banner-ok/);
  assert.match(html, /Completo/);
});

test("htmlVisaoEquipe escapa nome e área (sem HTML injetado)", () => {
  const s = novoSquad();
  s.hackathon = "X";
  const a = adicionarMembro(s, { nome: "<script>alert(1)</script>" });
  adicionarAreaAfinidade(s, a.id, { area: "<img>", nivel: "interesse" });
  const html = htmlVisaoEquipe(resumoEquipe(s));
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img>/);
  assert.match(html, /&lt;script&gt;/);
});

test("htmlVisaoEquipe mostra motivo de incompletude", () => {
  const s = novoSquad();
  s.hackathon = "X";
  adicionarMembro(s, { nome: "Bruno" });
  const html = htmlVisaoEquipe(resumoEquipe(s));
  assert.match(html, /Falta: sem nenhuma frente marcada; sem área de afinidade com interesse ou experiência\./);
});
