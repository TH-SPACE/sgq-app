const ad = require('../ad/ad');

exports.searchUsers = (req, res) => {
    const term = req.query.term;
    if (!term) {
        return res.status(400).json({ error: 'O termo de busca é obrigatório' });
    }

    ad.findUser(term, (err, user) => {
        if (err) {
            console.error('Erro na busca no AD:', err);
            // A biblioteca pode retornar um erro quando o usuário não é encontrado, então retornamos um array vazio.
            return res.json([]);
        }

        if (!user) {
            return res.json([]);
        }

        // A interface espera um array, então envolvemos o objeto de usuário único em um array.
        res.json([user]);
    });
};