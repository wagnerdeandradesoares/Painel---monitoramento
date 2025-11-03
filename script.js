// script.js — Painel principal (substitua o arquivo antigo)

// Ajuste aqui para apontar para o seu backend (Vercel / localhost)
const API_URL = "https://api-monitoramento.vercel.app"; // deixar vazio usa caminho relativo ("/api/...") — útil quando front e api estão no mesmo host

function api(path) {
  // retorna URL completa apropriada
  if (API_URL && API_URL.trim() !== "") {
    return API_URL.replace(/\/+$/, "") + path;
  }
  return path; // caminho relativo (ex.: "/api/status")
}

async function carregarFiliais() {
  const tabela = document.getElementById("filiais-body");
  tabela.innerHTML = `<tr><td colspan="3">Carregando...</td></tr>`;

  try {
    const url = api("/api/status");
    console.log("→ Requisição GET", url);

    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status} ${resp.statusText} ${txt}`);
    }

    const dados = await resp.json();
    console.log("📦 Dados recebidos da API:", dados);

    if (!Array.isArray(dados) || dados.length === 0) {
      tabela.innerHTML = `<tr><td colspan="3">Nenhuma filial encontrada.</td></tr>`;
      return;
    }

    renderizarTabela(dados);
  } catch (err) {
    console.error("❌ Erro ao carregar filiais:", err);
    tabela.innerHTML = `<tr><td colspan="3">Erro ao carregar dados: ${escapeHtml(String(err.message || err))}</td></tr>`;
    // tenta recarregar depois de 10s — útil em ambiente de deploy / CORS
    setTimeout(carregarFiliais, 10000);
  }
}

// ===============================
// Renderiza tabela de filiais
// ===============================
function renderizarTabela(dados) {
  const corpo = document.getElementById("filiais-body");
  corpo.innerHTML = "";

  // Agrupar por filial
  const agrupado = {};
  dados.forEach(item => {
    const filial = item.filial || item.branch || "SEM_FILIAL";
    if (!agrupado[filial]) agrupado[filial] = [];
    agrupado[filial].push(formatItem(item));
  });

  // Criar linhas da tabela
  Object.keys(agrupado).forEach(filial => {
    const ultima = agrupado[filial].sort(
      (a, b) => new Date(b.ultima_execucao || 0) - new Date(a.ultima_execucao || 0)
    )[0];

    const tr = document.createElement("tr");
    const status = ultima.status || "DESCONHECIDO";  // Garantir que se o status não existir, será "DESCONHECIDO"
    
    // Definir classe de status corretamente
    const statusClass = status.toUpperCase() === "OK" ? "status-OK" : (status.toUpperCase() === "ERRO" ? "status-ERRO" : "status-desconhecido");

    tr.innerHTML = `
      <td>${escapeHtml(filial)}</td>
      <td>${escapeHtml(ultima.ultima_execucao || "-")}</td>
      <td class="${statusClass}">${escapeHtml(status)}</td>
    `;
    tr.onclick = () => abrirModal(filial, agrupado[filial]);
    corpo.appendChild(tr);
  });
}


function formatItem(item) {
  return {
    filial: item.filial || item.branch || "",
    terminal: item.terminal || item.device || "",
    status: (item.status || "").toUpperCase(),
    detalhe: item.detalhe || item.detail || "",
    ultima_execucao: item.ultima_execucao || item.last_run || "",
    versao: item.versao || ""
  };
}

// ===============================
// Modal de detalhes por filial
// ===============================
function abrirModal(filial, terminais) {
  const modal = document.getElementById("modal-detalhes");
  const modalFilial = document.getElementById("modal-filial");
  const terminaisBody = document.getElementById("terminais-body");

  // Preencher o título do modal
  modalFilial.textContent = `Detalhes da Filial: ${filial}`;

  // Criar linhas para a tabela de terminais
  const rows = terminais.map(t => {
    // Garantir que o status seja tratado corretamente (OK, ERRO, ou desconhecido)
    const status = t.status ? t.status.toUpperCase() : "DESCONHECIDO";
    const statusClass = status === "OK" ? "status-OK" : (status === "ERRO" ? "status-ERRO" : "status-desconhecido");

    return `
      <tr>
        <td>${escapeHtml(t.terminal || "-")}</td>
        <td class="${statusClass}">${escapeHtml(status)}</td>
        <td><pre style="white-space:pre-wrap;margin:0">${escapeHtml(t.detalhe || "")}</pre></td>
      </tr>
    `;
  }).join("");

  terminaisBody.innerHTML = rows;

  // Exibir o modal
  modal.style.display = "block";

  // Adicionar o evento de fechar no botão
  const btnFechar = document.querySelector(".fechar");
  btnFechar.onclick = fecharModal;
}


function fecharModal() {
  const modal = document.getElementById("modal-detalhes");
  modal.style.display = "none";
}

// Fecha o modal ao clicar fora
window.onclick = function (event) {
  const modal = document.getElementById("modal-detalhes");
  if (event.target == modal) {
    modal.style.display = "none";
  }
};


// pequena função para escapar HTML nas strings de log/UI
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Carregar ao iniciar
document.addEventListener("DOMContentLoaded", carregarFiliais);
