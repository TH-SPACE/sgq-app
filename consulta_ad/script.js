document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formBusca");
  const buscaInput = document.getElementById("buscaUsuario");
  const resultsDiv = document.getElementById("results");
  const loadingDiv = document.getElementById("loading");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const searchTerm = buscaInput.value.trim();

    if (searchTerm.length === 0) {
      resultsDiv.innerHTML =
        '<p class="text-warning">Por favor, digite um termo para a busca.</p>';
      return;
    }
    performSearch(searchTerm);
  });

  async function performSearch(term) {
    loadingDiv.style.display = "block";
    resultsDiv.innerHTML = "";

    try {
      const response = await fetch(
        `/consulta-ad/search?term=${encodeURIComponent(term)}`
      );
      if (!response.ok) {
        throw new Error("Falha na requisição ao servidor");
      }
      const users = await response.json();
      displayResults(users);
    } catch (error) {
      console.error("Erro na busca:", error);
      resultsDiv.innerHTML =
        '<p class="text-danger">Ocorreu um erro ao buscar os usuários.</p>';
    } finally {
      loadingDiv.style.display = "none";
    }
  }

  function displayResults(users) {
    if (users.length === 0) {
      resultsDiv.innerHTML =
        '<p class="text-muted">Nenhum usuário encontrado com o termo informado.</p>';
      return;
    }

    const user = users[0];
    const table = document.createElement("table");
    table.className = "table table-striped table-bordered mt-3";

    const thead = document.createElement("thead");
    thead.innerHTML = `
            <tr class="thead-dark">
                <th>Atributo</th>
                <th>Valor</th>
            </tr>
        `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    // ====================================================================
    // AQUI: Defina quais atributos do usuário você quer mostrar.
    // 'key' é o nome do atributo vindo do Active Directory.
    // 'label' é como ele aparecerá na tabela.
    // ====================================================================
    const atributosDesejados = [
      { key: "displayName", label: "Nome Completo" },
      { key: "sAMAccountName", label: "Matrícula" },
      { key: "mail", label: "Email" },
      { key: "title", label: "Cargo" },
      { key: "mobile", label: "Celular" },
      { key: "company", label: "Empresa" },
      { key: "physicalDeliveryOfficeName", label: "Localização" },
    ];

    // Itera sobre a lista de atributos desejados e os adiciona na tabela
    atributosDesejados.forEach((attr) => {
      if (user[attr.key]) {
        // Verifica se o atributo existe no objeto do usuário
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td><strong>${attr.label}</strong></td>
                    <td>${user[attr.key]}</td>
                `;
        tbody.appendChild(tr);
      }
    });

    // Tratamento especial para o objeto do gestor
    if (user.gestorDireto) {
      const gestor = user.gestorDireto;
      const headerRow = document.createElement("tr");
      headerRow.innerHTML =
        '<td colspan="2" class="bg-secondary text-white text-center"><strong>GESTOR DIRETO</strong></td>';
      tbody.appendChild(headerRow);

      // Adiciona as informações do gestor
      for (const managerKey in gestor) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td><strong>${managerKey}</strong></td>
                    <td>${gestor[managerKey]}</td>
                `;
        tbody.appendChild(tr);
      }
    }

    table.appendChild(tbody);
    resultsDiv.appendChild(table);
  }
});
