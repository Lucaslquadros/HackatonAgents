// Validador instantâneo do CLD (Bolt 1).
//
// Recebe um `mapa` (modelo-dados/hackos.schema.json) e devolve o objeto
// `validacao` do contrato `pedido_visao`: { loops, problemas }.
// Roda no navegador (quadro) e no Node (testes), sem dependências.
//
// A classificação R/B é por contagem de setas negativas, nunca por leitura
// do LLM: "a intuição erra em loops de 5 ou mais setas; a contagem, nunca"
// (aula de pensamento sistêmico, 17/08).

export const LIMITE_VARIAVEIS = 12;
export const LIMITE_LOOPS = 1000;

const VERBOS_QUE_SAO_SUBSTANTIVOS = new Set([
  "ar", "lar", "mar", "bar", "par", "lugar", "colher", "mulher", "poder",
  "prazer", "dever", "lazer", "açúcar", "celular", "militar", "familiar",
  "escolar", "radar", "hangar", "polar", "jantar", "almoçar", "bem-estar",
]);

const PALAVRAS_DE_DIRECAO = [
  "aumento", "aumentar", "queda", "redução", "reducao", "diminuição",
  "diminuicao", "crescimento", "melhora", "melhoria", "piora", "perda",
  "falta", "excesso", "mais", "menos", "maior", "menor", "melhor", "pior",
];

function ativo(item, incluirFantasmas) {
  if (item.status === "aceita") return true;
  return incluirFantasmas && item.status === "fantasma";
}

// Ciclos simples num multigrafo dirigido. Cada ciclo é encontrado uma vez,
// começando pela variável de menor índice que ele contém. Setas paralelas
// entre o mesmo par de variáveis geram ciclos diferentes (são mecanismos
// diferentes). Auto-laços (A → A) são ignorados.
export function encontrarCiclos(variaveis, setas) {
  const indice = new Map(variaveis.map((v, i) => [v.id, i]));
  const saidas = new Map(variaveis.map((v) => [v.id, []]));
  for (const s of setas) {
    if (s.de === s.para) continue;
    if (indice.has(s.de) && indice.has(s.para)) saidas.get(s.de).push(s);
  }

  const ciclos = [];
  let truncado = false;

  for (const inicio of variaveis) {
    const iInicio = indice.get(inicio.id);
    const caminho = [];
    const noCaminho = new Set([inicio.id]);

    const visitar = (atual) => {
      for (const seta of saidas.get(atual)) {
        if (ciclos.length >= LIMITE_LOOPS) {
          truncado = true;
          return;
        }
        if (seta.para === inicio.id) {
          ciclos.push([...caminho, seta]);
          continue;
        }
        if (indice.get(seta.para) < iInicio || noCaminho.has(seta.para)) continue;
        caminho.push(seta);
        noCaminho.add(seta.para);
        visitar(seta.para);
        caminho.pop();
        noCaminho.delete(seta.para);
      }
    };
    visitar(inicio.id);
  }
  return { ciclos, truncado };
}

function chave(idsDeSetas) {
  return [...idsDeSetas].sort().join("|");
}

// Checklist da aula para nomes de variável: substantivo, neutro em direção.
// Heurística: pode errar; por isso a mensagem é uma pergunta, não um veredito.
export function problemaDeNome(nome) {
  const palavras = nome
    .toLowerCase()
    .split(/[\s,.;:()/]+/)
    .filter(Boolean);
  if (palavras.length === 0) return null;
  const primeira = palavras[0];

  if (/(ar|er|ir)$/.test(primeira) && !VERBOS_QUE_SAO_SUBSTANTIVOS.has(primeira)) {
    return `"${nome}" parece começar com um verbo ("${primeira}"). Variável é algo que sobe ou desce: dá para escrever como substantivo (ex.: "volume de…", "taxa de…")?`;
  }
  if (/(ando|endo|indo)$/.test(primeira)) {
    return `"${nome}" parece descrever uma ação em andamento ("${primeira}"). Qual é a quantidade que sobe ou desce aqui?`;
  }
  const direcao = palavras.find((p) => PALAVRAS_DE_DIRECAO.includes(p));
  if (direcao) {
    return `"${nome}" traz a direção no nome ("${direcao}"). A polaridade da seta já diz se sobe ou desce: qual é o nome neutro da variável?`;
  }
  return null;
}

export function validarMapa(mapa, { incluirFantasmas = false } = {}) {
  const variaveis = mapa.variaveis.filter((v) => ativo(v, incluirFantasmas));
  const idsVariaveis = new Set(variaveis.map((v) => v.id));
  const todasSetasAtivas = mapa.setas.filter((s) => ativo(s, incluirFantasmas));
  const problemas = [];

  // Setas cujas pontas não estão (ou não estão mais) no mapa.
  const setas = [];
  for (const s of todasSetasAtivas) {
    const faltando = [s.de, s.para].filter((id) => !idsVariaveis.has(id));
    if (faltando.length) {
      problemas.push({
        codigo: "seta_orfa",
        mensagem: `A seta ${s.id} liga uma variável que não está no mapa (${faltando.join(", ")}).`,
        refs: [s.id],
      });
    } else {
      setas.push(s);
    }
  }

  // Loops e classificação R/B por contagem.
  const { ciclos, truncado } = encontrarCiclos(variaveis, setas);
  const loops = ciclos
    .map((ciclo) => {
      const negativas = ciclo.filter((s) => s.polaridade === "-").length;
      return {
        setas: ciclo.map((s) => s.id),
        negativas,
        tipo: negativas % 2 === 0 ? "R" : "B",
        tem_atraso: ciclo.some((s) => s.atraso),
      };
    })
    .sort((a, b) => a.setas.length - b.setas.length || chave(a.setas).localeCompare(chave(b.setas)));

  if (setas.length > 0 && loops.length === 0) {
    problemas.push({
      codigo: "nenhum_loop",
      mensagem: "Há setas, mas nenhuma volta ao ponto de partida. Isto é um sistema ou uma lista de causas? Onde fecha o loop?",
      refs: [],
    });
  }

  const anotados = new Map((mapa.loops_anotados || []).map((l) => [chave(l.setas), l]));
  for (const loop of loops) {
    if (loop.tipo !== "B") continue;
    const anotacao = anotados.get(chave(loop.setas));
    if (!anotacao || !anotacao.meta) {
      problemas.push({
        codigo: "b_sem_meta",
        mensagem: "Este loop é balanceador: ele busca alguma meta. Qual é a meta, e qual é a lacuna entre ela e a situação atual?",
        refs: loop.setas,
      });
    }
  }

  const emAlgumLoop = new Set();
  for (const loop of loops) {
    for (const id of loop.setas) {
      const s = setas.find((x) => x.id === id);
      emAlgumLoop.add(s.de);
      emAlgumLoop.add(s.para);
    }
  }
  if (loops.length > 0) {
    for (const v of variaveis) {
      if (!emAlgumLoop.has(v.id)) {
        problemas.push({
          codigo: "variavel_fora_de_loop",
          mensagem: `"${v.nome}" não participa de nenhum loop. Ela é um fator externo ao sistema, ou falta uma seta que a conecte de volta?`,
          refs: [v.id],
        });
      }
    }
  }

  if (variaveis.length > LIMITE_VARIAVEIS) {
    problemas.push({
      codigo: "excesso_variaveis",
      mensagem: `O mapa tem ${variaveis.length} variáveis. Um bom CLD tem de 6 a ${LIMITE_VARIAVEIS}: com mais que isso vira descrição, não modelo. Quais podem ser agrupadas ou saem da fronteira?`,
      refs: [],
    });
  }

  for (const v of variaveis) {
    const msg = problemaDeNome(v.nome);
    if (msg) problemas.push({ codigo: "nome_com_verbo_ou_direcao", mensagem: msg, refs: [v.id] });
    if (!v.atores || v.atores.length === 0) {
      problemas.push({
        codigo: "variavel_sem_ator",
        mensagem: `"${v.nome}" não está ligada a nenhum ator. Quem sofre, decide, paga ou opera isso? Sem ator nomeado, a causa vira opinião genérica.`,
        refs: [v.id],
      });
    }
  }

  for (const s of setas) {
    if (!s.mecanismo || !s.mecanismo.trim()) {
      problemas.push({
        codigo: "seta_sem_mecanismo",
        mensagem: `A seta ${s.id} não diz por que uma variável move a outra. Qual é o mecanismo?`,
        refs: [s.id],
      });
    }
  }

  return { loops, problemas, truncado };
}

// Formato exato do contrato `pedido_visao.validacao` (sem campos internos).
export function validacaoParaPedido(resultado) {
  return { loops: resultado.loops, problemas: resultado.problemas };
}
