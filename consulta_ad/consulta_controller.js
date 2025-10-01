const ad = require("../ad/ad");

// Função auxiliar para transformar o ad.findUser baseado em callback em uma Promise
function findUserPromise(term) {
  return new Promise((resolve, reject) => {
    ad.findUser(term, (err, user) => {
      if (err) {
        // A biblioteca pode retornar um erro quando o usuário não é encontrado.
        // Verificamos se é esse o caso para não tratar como um erro de servidor.
        if (
          err.name === "UserNotFound" ||
          (err.message && err.message.toLowerCase().includes("no such object"))
        ) {
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
    return res.status(400).json({ error: "O termo de busca é obrigatório" });
  }

  try {
    const user = await findUserPromise(term);

    // DEBUG: Log para verificar o objeto bruto do usuário retornado pelo AD
    console.log("======================================================");
    console.log("DEBUG: Objeto bruto do usuário recebido do AD:");
    console.log(user);
    console.log("======================================================");

    if (!user) {
      return res.json([]); // Retorna array vazio se o usuário não for encontrado
    }

    // Converte a foto para Base64 se ela existir
    if (user.jpegPhoto) {
        console.log("DEBUG: Atributo 'jpegPhoto' encontrado. Convertendo para Base64.");
        user.foto = `data:image/jpeg;base64,${user.jpegPhoto.toString('base64')}`;
        delete user.jpegPhoto; // Remove o dado binário original
    } else {
        console.log("DEBUG: Atributo 'jpegPhoto' NÃO encontrado.");
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
          Cargo: manager.title,
          Telefone: manager.mobile,
        };
      }
    }

    // Busca os subordinados diretos
    if (user.directReports && user.directReports.length > 0) {
        const reportPromises = user.directReports.map(dn => findUserPromise(dn));
        const reports = await Promise.all(reportPromises);
        
        // Filtra os resultados nulos e mapeia para um formato mais limpo
        user.subordinados = reports
            .filter(report => report !== null)
            .map(report => ({
                nome: report.displayName,
                email: report.mail,
                cargo: report.title
            }));
    }

    // Remove a propriedade original para não ser exibida
    delete user.directReports;

    // Retorna o usuário (com ou sem dados do gestor e subordinados) dentro de um array
    res.json([user]);
  } catch (error) {
    console.error("Erro na busca no AD:", error);
    res
      .status(500)
      .json({ error: "Erro interno ao buscar no Active Directory" });
  }
};
