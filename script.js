// Defina a URL da API (ajuste para o domínio da sua aplicação no Vercel)
const API_URL = "https://api-monitoramento.vercel.app"; // Substitua pelo seu domínio no Vercel

// Alternar abas
function showTab(tabId, evt) {
  document.querySelectorAll("section.tab").forEach(el => el.style.display = "none");
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  document.getElementById(tabId).style.display = "block";
  evt.target.classList.add("active");

  if (tabId === "status") carregarStatus();
  if (tabId === "config") carregarConfig();
}

// 🏠 STATUS
async function carregarStatus() {
  try {
    const resp = await fetch(`${API_URL}/api/status`);
    if (!resp.ok) throw new Error("Falha ao carregar status");

    const dados = await resp.json();
    const tbody = document.getElementById("tbodyStatus");
    tbody.innerHTML = ""; // Limpar a tabela antes de popular

    // Ordenar os dados por nome da filial
    const sortedFiliais = dados.sort((a, b) => {
      const nomeA = a.filial.toUpperCase();
      const nomeB = b.filial.toUpperCase();
      if (nomeA < nomeB) return -1; // Ordenar de forma crescente
      if (nomeA > nomeB) return 1;
      return 0;
    });

    // Agora, preencher a tabela com os dados ordenados
    sortedFiliais.forEach(l => {
      const tr = document.createElement("tr");

      // Substituindo as quebras de linha no 'detalhe' para exibir corretamente no HTML
      const detalheFormatado = (l.detalhe || '').replace(/\n/g, '<br>'); // Substitui quebras de linha

      tr.innerHTML = `
        <td>${l.ultima_execucao || '-'}</td>
        <td>${l.filial}</td>
        <td>${l.terminal}</td>
        <td>${l.status}</td>
        <td class="detalhe">${detalheFormatado}</td> <!-- Exibindo o detalhe com as quebras de linha -->
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error("Erro ao carregar status:", e);
    alert("Erro ao carregar o status das filiais.");
  }
}

function filtrarFiliais() {
  const termo = document.getElementById("pesquisa").value.toLowerCase();
  document.querySelectorAll("#tbodyStatus tr").forEach(tr => {
    tr.style.display = tr.innerText.toLowerCase().includes(termo) ? "" : "none";
  });
}

// 🧾 LOGS
async function buscarLogs() {
  const filial = document.getElementById("filialLogs").value.trim();
  if (!filial) return alert("Digite o código da filial!");

  const area = document.getElementById("saidaLogs");
  try {
    const resp = await fetch(`${API_URL}/api/logs/${filial}`);
    if (resp.ok) {
      const logs = await resp.json();
      area.textContent = logs.map(l => `[${l.data_execucao}] ${l.status} - ${l.detalhe}`).join('\n');
    } else {
      area.textContent = "Nenhum log encontrado.";
    }
  } catch (e) {
    area.textContent = "Erro ao buscar logs.";
  }
}

// ⚙️ CONFIG
async function carregarConfig() {
  const resp = await fetch(`${API_URL}/api/config`);
  if (!resp.ok) return alert("Erro ao carregar configuração.");

  const cfg = await resp.json();
  document.getElementById('configArea').value = JSON.stringify(cfg, null, 2);
}

async function salvarConfig() {
  try {
    const novoCfg = JSON.parse(document.getElementById('configArea').value);
    const resp = await fetch(`${API_URL}/api/config`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(novoCfg)
    });
    const res = await resp.json();
    alert(res.msg || "Configuração salva!");
  } catch (e) {
    alert("Erro ao salvar configuração: " + e);
  }
}

// 🕹️ COMANDOS
async function enviarComando() {
  const filial = document.getElementById('filialCmd').value.trim();
  if (!filial) return alert("Informe a filial!");
  const resp = await fetch(`${API_URL}/api/comando/${filial}`, {method:'POST'});
  const res = await resp.json();
  document.getElementById('saidaCmd').textContent = JSON.stringify(res, null, 2);
}

carregarStatus(); // Carregar status ao inicializar
