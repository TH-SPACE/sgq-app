const ad = require('../ad/ad');

// Função auxiliar para transformar o ad.findUser baseado em callback em uma Promise
function findUserPromise(term) {
    return new Promise((resolve, reject) => {
        ad.findUser(term, (err, user) => {
            if (err) {
                // A biblioteca pode retornar um erro quando o usuário não é encontrado.
                // Verificamos se é esse o caso para não tratar como um erro de servidor.
                if (err.name === 'UserNotFound' || (err.message && err.message.toLowerCase().includes('no such object'))) {
                    return resolve(null); // Resolve como nulo se não encontrar
                }
                return reject(err); // Rejeita para outros erros
            }
            resolve(user);
        });
    });
}

exports.searchUsers = async (req, res) => {
    const term = req.query.term;
    if (!term) {
        return res.status(400).json({ error: 'O termo de busca é obrigatório' });
    }

    try {
        const user = await findUserPromise(term);

        if (!user) {
            return res.json([]); // Retorna array vazio se o usuário não for encontrado
        }

        // Se o usuário for encontrado, verifica se ele tem um gestor
        if (user.manager) {
            const manager = await findUserPromise(user.manager);
            if (manager) {
                // Adiciona os detalhes do gestor ao objeto do usuário antes de enviar a resposta
                user.gestorDireto = {
                    Nome: manager.displayName,
                    Email: manager.mail,
                    Matricula: manager.sAMAccountName,
                    Cargo: manager.title
                };
            }
        }

        // Retorna o usuário (com ou sem dados do gestor) dentro de um array
        res.json([user]);

    } catch (error) {
        console.error('Erro na busca no AD:', error);
        res.status(500).json({ error: 'Erro interno ao buscar no Active Directory' });
    }
};