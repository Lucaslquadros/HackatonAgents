// Construtor de HTML puro (sem DOM) para a aba "Visão da equipe", mesmo
// padrão de agente-sistemico/quadro/painel.js: funções testáveis sem
// precisar montar a página.

const ROTULO_FRENTE = {
  dominio_negocio: "Domínio de negócio",
  construcao: "Construção",
  experiencia_ux: "Experiência/UX",
  dados_evidencias: "Dados/evidências",
  narrativa: "Narrativa",
};

const ROTULO_NIVEL = {
  experiencia: "Experiência",
  interesse: "Interesse",
  nenhum: "Nenhum",
};

function escapeHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function htmlMembro(membro) {
  const badgeStatus = membro.completo
    ? `<span class="selo selo-ok">Completo</span>`
    : `<span class="selo selo-pendente">Incompleto</span>`;

  const frentes = membro.frentes.length
    ? membro.frentes.map((f) => `<span class="selo">${escapeHtml(ROTULO_FRENTE[f] || f)}</span>`).join("")
    : `<span class="texto-suave">nenhuma frente marcada</span>`;

  const areas = membro.areas_afinidade.filter((a) => (a.area || "").trim()).length
    ? membro.areas_afinidade
        .filter((a) => (a.area || "").trim())
        .map(
          (a) =>
            `<span class="selo">${escapeHtml(a.area)} — ${escapeHtml(ROTULO_NIVEL[a.nivel] || a.nivel)}</span>`
        )
        .join("")
    : `<span class="texto-suave">nenhuma área de afinidade</span>`;

  const motivos = membro.motivos.length
    ? `<p class="texto-suave motivos">Falta: ${membro.motivos.map(escapeHtml).join("; ")}.</p>`
    : "";

  return `
    <div class="cartao membro-resumo">
      <div class="membro-resumo-cabecalho">
        <strong>${escapeHtml(membro.nome)}</strong>
        ${badgeStatus}
      </div>
      <div class="campo">
        <label>Frentes</label>
        <div class="selos">${frentes}</div>
      </div>
      <div class="campo">
        <label>Áreas de afinidade</label>
        <div class="selos">${areas}</div>
      </div>
      ${motivos}
    </div>`;
}

export function htmlVisaoEquipe(resumo) {
  if (!resumo.hackathon && resumo.membros.length === 0) {
    return `<p class="dica">Nenhum cadastro ainda — preencha a aba Cadastro primeiro.</p>`;
  }

  const topo = resumo.tudoCompleto
    ? `<div class="banner banner-ok">Squad pronto — todos os integrantes estão com cadastro completo.</div>`
    : `<div class="banner banner-pendente">Squad ainda não está pronto — confira quem falta completar abaixo.</div>`;

  const semHackathon = resumo.hackathon
    ? ""
    : `<p class="aviso-linha">Falta o nome do hackathon.</p>`;

  const membros = resumo.membros.length
    ? resumo.membros.map(htmlMembro).join("")
    : `<p class="dica">Nenhum integrante cadastrado ainda.</p>`;

  return `${topo}${semHackathon}<div class="lista-resumo">${membros}</div>`;
}
