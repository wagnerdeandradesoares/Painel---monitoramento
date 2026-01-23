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
  corpo.innerHTML = "";  // Limpar a tabela antes de renderizar novamente

  // Agrupar os dados por filial
  const agrupado = {};
  dados.forEach(item => {
    const filial = item.filial || item.branch || "SEM_FILIAL";
    if (!agrupado[filial]) agrupado[filial] = [];
    agrupado[filial].push(formatItem(item));
  });

  // Criar as linhas da tabela para cada filial
  Object.keys(agrupado).forEach(filial => {
  const terminais = agrupado[filial];

  const total = terminais.length;
  const qtdOk = terminais.filter(t => t.status === "OK").length;
  const qtdErro = terminais.filter(t => t.status === "ERRO").length;

  let statusFilial = "ERRO";
  let statusClass = "status-erro";

  if (total >= 3) {
    if (qtdOk >= 2 && qtdErro > 0) {
      statusFilial = "OK";
      statusClass = "status-aviso"; // amarelo
    } else if (qtdOk >= 2) {
      statusFilial = "OK";
      statusClass = "status-ok"; // verde
    }
  } else {
    // Regra antiga para menos de 3 terminais
    if (qtdErro === 0) {
      statusFilial = "OK";
      statusClass = "status-ok";
    }
  }

  // Pega o último terminal para exibir a última execução
  const ultima = terminais.sort(
    (a, b) => new Date(b.ultima_execucao || 0) - new Date(a.ultima_execucao || 0)
  )[0];

  const tr = document.createElement("tr");
  tr.classList.add(statusClass);

  tr.innerHTML = `
    <td>${escapeHtml(filial)}</td>
    <td>${escapeHtml(ultima.ultima_execucao || "-")}</td>
    <td class="${statusClass}">${escapeHtml(statusFilial)}</td>
  `;

    // Quando clicar na linha da filial, abrir o modal com os terminais dessa filial
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

  // Preencher o título do modal com o nome da filial
  modalFilial.textContent = `Detalhes da Filial: ${filial}`;

  // Criar as linhas para a tabela de terminais dentro do modal
  const rows = terminais.map(t => {
    // Garantir que o status seja tratado corretamente (OK, ERRO ou desconhecido)
    const status = t.status ? t.status.toUpperCase() : "DESCONHECIDO";
    
    // Atribuir a classe de cor para o status
    const statusClass = status === "OK" ? "status-OK" : (status === "ERRO" ? "status-ERRO" : "status-desconhecido");

    return `
      <tr>
        <td>${escapeHtml(t.terminal || "-")}</td>
        <td class="${statusClass}">${escapeHtml(status)}</td>
        <td><pre style="white-space:pre-wrap;margin:0">${escapeHtml(t.detalhe || "")}</pre></td>
      </tr>
    `;
  }).join("");  // Juntar todas as linhas criadas em uma string única

  // Inserir as linhas de terminais no corpo da tabela
  terminaisBody.innerHTML = rows;

  // Exibir o modal (alterando o display para block)
  modal.style.display = "block";

  // Adicionar o evento de fechamento ao botão de fechar do modal
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
