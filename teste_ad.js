require("dotenv").config();
const ActiveDirectory = require("activedirectory2");

const config = {
    url: process.env.LDAP_URL,
    baseDN: process.env.LDAP_BASE_DN,
    username: process.env.LDAP_USER,
    password: process.env.LDAP_PASS,
    referral: false,
    attributes: {
        user: ["displayName", "mail", "sAMAccountName", "userPrincipalName"]
    }
};

const ad = new ActiveDirectory(config);

const emailParaTestar = "thiago.anunes@telefonica.com";

ad.findUser(emailParaTestar, function (err, user) {
    if (err) {
        console.error("Erro ao buscar usuário:", err);
        return;
    }

    if (!user) {
        console.log("Usuário não encontrado.");
        return;
    }

    console.log("✅ Usuário encontrado:");
    console.log("Nome completo:", user.displayName);
    console.log("Email:", user.mail);
    console.log("Login:", user.sAMAccountName);
});