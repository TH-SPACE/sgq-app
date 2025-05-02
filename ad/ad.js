//CONEXÃO DO ACTIVE DIRECTORY DA VIVO!

const dotenv = require('dotenv');
dotenv.config();

const ActiveDirectory = require("activedirectory")

const config = {
    url: process.env.LDAP_URL,
    baseDN: process.env.LDAP_BASE_DN
};

const ad = new ActiveDirectory(config)

module.exports = ad