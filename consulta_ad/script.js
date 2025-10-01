document.addEventListener('DOMContentLoaded', () => {
    const buscaInput = document.getElementById('buscaUsuario');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    let debounceTimeout;

    buscaInput.addEventListener('keyup', () => {
        clearTimeout(debounceTimeout);
        const searchTerm = buscaInput.value.trim();

        if (searchTerm.length < 3) {
            resultsDiv.innerHTML = ''; // Limpa os resultados se a busca for muito curta
            return;
        }

        debounceTimeout = setTimeout(() => {
            performSearch(searchTerm);
        }, 500); // Aguarda 500ms após o usuário parar de digitar
    });

    async function performSearch(term) {
        loadingDiv.style.display = 'block';
        resultsDiv.innerHTML = '';

        try {
            const response = await fetch(`/consulta-ad/search?term=${encodeURIComponent(term)}`);
            if (!response.ok) {
                throw new Error('Falha na requisição ao servidor');
            }

            const users = await response.json();
            displayResults(users);

        } catch (error) {
            console.error('Erro na busca:', error);
            resultsDiv.innerHTML = '<p class="text-danger">Ocorreu um erro ao buscar os usuários.</p>';
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    function displayResults(users) {
        if (users.length === 0) {
            resultsDiv.innerHTML = '<p class="text-muted">Nenhum usuário encontrado.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'table table-striped table-bordered';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr class="thead-dark">
                <th>Atributo</th>
                <th>Valor</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        
        // Mostra os dados do primeiro usuário encontrado
        const user = users[0]; 
        for (const key in user) {
            if (Object.prototype.hasOwnProperty.call(user, key)) {
                const value = user[key];
                // Não exibe campos complexos ou desnecessários
                if (typeof value === 'string' || typeof value === 'number') {
                    const tr = document.createElement('tr');
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
