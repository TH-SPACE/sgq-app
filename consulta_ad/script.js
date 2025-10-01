document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formBusca");
  const buscaInput = document.getElementById("buscaUsuario");
  const resultsDiv = document.getElementById("results");
  const loadingDiv = document.getElementById("loading");

  form.addEventListener("submit", (event) => {
    event.preventDefault(); // Impede o envio tradicional do formulário
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

    // Como o controller agora sempre retorna um array, pegamos o primeiro (e único) usuário
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

    // Itera sobre as chaves do objeto do usuário para criar as linhas da tabela
    for (const key in user) {
      if (Object.prototype.hasOwnProperty.call(user, key)) {
        const value = user[key];

        // Filtra para não exibir valores que não sejam strings ou números simples
        if (typeof value === "string" || typeof value === "number") {
          const tr = document.createElement("tr");
          tr.innerHTML = `
                        <td><strong>${key}</strong></td>
                        <td>${value}</td>
                    `;
          tbody.appendChild(tr);
        }
      }
    }

    table.appendChild(tbody);
    resultsDiv.appendChild(table);
  }
});
