//CONEXÃO DO ACTIVE DIRECTORY DA VIVO!

const ActiveDirectory = require("activedirectory")

const config = {
    url: 'ldap://redecorp.br',
    baseDN: "dc=redecorp, dc=com",
};

const ad = new ActiveDirectory(config)

module.exports = ad