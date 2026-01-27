let dadosOriginais = [];

// ===============================
// Configuração da API
// ===============================
const API_URL = "https://api-monitoramento.vercel.app";

function api(path) {
  if (API_URL && API_URL.trim() !== "") {
    return API_URL.replace(/\/+$/, "") + path;
  }
  return path;
}

// ===============================
// Carregar dados da API
// ===============================
async function carregarFiliais() {
  const tabela = document.getElementById("filiais-body");
  tabela.innerHTML = `<tr><td colspan="3">Carregando...</td></tr>`;

  try {
    const resp = await fetch(api("/api/status"), { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const dados = await resp.json();
    if (!Array.isArray(dados) || dados.length === 0) {
      tabela.innerHTML = `<tr><td colspan="3">Nenhuma filial encontrada.</td></tr>`;
      return;
    }

    dadosOriginais = dados;
    aplicarFiltros();

  } catch (err) {
    console.error("Erro ao carregar dados:", err);
    tabela.innerHTML = `<tr><td colspan="3">Erro ao carregar dados</td></tr>`;
    setTimeout(carregarFiliais, 10000);
  }
}

// ===============================
// Aplicar busca + filtro de status
// ===============================
function aplicarFiltros() {
  const termo = document.getElementById("busca").value.toLowerCase();
  const statusFiltro = document.getElementById("filtroStatus").value;

  const filtrado = dadosOriginais.filter(item => {
    const filial = (item.filial || "").toLowerCase();
    const codigo = (item.branch || "").toLowerCase();
    return filial.includes(termo) || codigo.includes(termo);
  });

  renderizarTabela(filtrado, statusFiltro);
}

// ===============================
// Renderizar tabela (COM ORDENAÇÃO)
// ===============================
function renderizarTabela(dados, statusFiltro = "") {
  const corpo = document.getElementById("filiais-body");
  corpo.innerHTML = "";

  const agrupado = {};
  dados.forEach(item => {
    const filial = item.filial || item.branch || "SEM_FILIAL";
    if (!agrupado[filial]) agrupado[filial] = [];
    agrupado[filial].push(formatItem(item));
  });

  let filiais = Object.keys(agrupado).map(filial => {
    const terminais = agrupado[filial];

    const total = terminais.length;
    const qtdOk = terminais.filter(t => t.status === "OK").length;
    const qtdErro = terminais.filter(t => t.status === "ERRO").length;

    let statusFilial = "ERRO";
    let statusClass = "status-erro";

    if (total >= 3) {
      if (qtdOk >= 2 && qtdErro > 0) {
        statusFilial = "AVISO";
        statusClass = "status-aviso";
      } else if (qtdOk >= 2) {
        statusFilial = "OK";
        statusClass = "status-ok";
      }
    } else if (qtdErro === 0) {
      statusFilial = "OK";
      statusClass = "status-ok";
    }

    const ultima = terminais.sort(
      (a, b) => new Date(b.ultima_execucao || 0) - new Date(a.ultima_execucao || 0)
    )[0];

    return {
      filial,
      terminais,
      ultima_execucao: ultima.ultima_execucao || "-",
      statusFilial,
      statusClass
    };
  });

  // 🔹 FILTRO DE STATUS APLICADO AQUI (CORRETO)
  if (statusFiltro) {
    filiais = filiais.filter(f => f.statusFilial === statusFiltro);
  }

  filiais
    .sort((a, b) => prioridadeFilial(a) - prioridadeFilial(b))
    .forEach(f => {
      const tr = document.createElement("tr");
      tr.classList.add(f.statusClass);

      tr.innerHTML = `
        <td>${escapeHtml(f.filial)}</td>
        <td>${escapeHtml(f.ultima_execucao)}</td>
        <td class="${f.statusClass}">${escapeHtml(f.statusFilial)}</td>
      `;

      tr.onclick = () => abrirModal(f.filial, f.terminais);
      corpo.appendChild(tr);
    });
}

// ===============================
// Funções ORIGINAIS (preservadas)
// ===============================
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

function prioridadeFilial(filial) {
  if (filial.statusFilial === "ERRO") return 1;
  if (filial.statusFilial === "AVISO") return 2;
  return 3;
}

// ===============================
// MODAL — SEM ALTERAÇÃO
// ===============================
function abrirModal(filial, terminais) {
  const modal = document.getElementById("modal-detalhes");
  const modalFilial = document.getElementById("modal-filial");
  const terminaisBody = document.getElementById("terminais-body");

  modalFilial.textContent = `Detalhes da Filial: ${filial}`;

  const rows = terminais.map(t => {
    const status = t.status ? t.status.toUpperCase() : "DESCONHECIDO";
    const statusClass =
      status === "OK" ? "status-OK" :
      status === "ERRO" ? "status-ERRO" :
      "status-desconhecido";

    return `
      <tr>
        <td>${escapeHtml(t.terminal || "-")}</td>
        <td class="${statusClass}">${escapeHtml(status)}</td>
        <td><pre style="white-space:pre-wrap;margin:0">${escapeHtml(t.detalhe || "")}</pre></td>
      </tr>
    `;
  }).join("");

  terminaisBody.innerHTML = rows;
  modal.style.display = "block";

  const btnFechar = document.querySelector(".fechar");
  btnFechar.onclick = fecharModal;
}

function fecharModal() {
  const modal = document.getElementById("modal-detalhes");
  modal.style.display = "none";
}

window.onclick = function (event) {
  const modal = document.getElementById("modal-detalhes");
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

// ===============================
// Utils
// ===============================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ===============================
// Eventos
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  carregarFiliais();
  document.getElementById("busca").addEventListener("input", aplicarFiltros);
  document.getElementById("filtroStatus").addEventListener("change", aplicarFiltros);
});
