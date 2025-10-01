
const ad = require('../ad/ad');

exports.searchUsers = (req, res) => {
    const term = req.query.term;
    if (!term) {
        return res.status(400).json({ error: 'O termo de busca é obrigatório' });
    }

    // Query para buscar usuários cujo nome de exibição (displayName) ou login (sAMAccountName) comece com o termo de busca.
    // O asterisco (*) é um curinga para correspondências parciais.
    // A query também filtra apenas por contas de usuário ativas.
    const query = `(&(objectCategory=person)(objectClass=user)(!userAccountControl:1.2.840.113556.1.4.803:=2)(|(displayName=${term}*)(sAMAccountName=${term}*)))`;

    ad.find(query, (err, results) => {
        if (err) {
            console.error('Erro na busca no AD:', err);
            return res.status(500).json({ error: 'Erro ao buscar no Active Directory' });
        }

        if (!results || !results.users || results.users.length === 0) {
            return res.json([]);
        }

        // Retorna apenas o array de usuários
        res.json(results.users);
    });
};
