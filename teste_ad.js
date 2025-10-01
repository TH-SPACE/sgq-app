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

    //  const userInfo = await new Promise((resolve, reject) => {
    //     ad.findUser(email, (err, user) => {
    //       if (err || !user) return reject(new Error("Usuário não encontrado no AD."));
    //       console.log("✅ Usuário encontrado:");
    //       console.log("Nome completo:", user.displayName);
    //       console.log("Email:", user.mail);
    //       console.log("Login:", user.sAMAccountName);
    //       console.log("UPN:", user.userPrincipalName);
    //       console.log("Cargo:", user.title);
    //       // console.log("Gerente (DN):", user.manager);
    //       // console.log("Departamento:", user.department);
    //       // console.log("Empresa:", user.company);
    //       // console.log("Telefone fixo:", user.telephoneNumber);
    //       // console.log("Celular:", user.mobile);
    //       // console.log("Localização física:", user.physicalDeliveryOfficeName);          
    //       // console.log("Subordinados:", user.directReports);
    //       // console.log("DN completo:", user.distinguishedName);
    //       // console.log("Classe do objeto:", user.objectClass);
    //       // console.log("Categoria do objeto:", user.objectCategory);
    //       // console.log("Controle de conta:", user.userAccountControl);
    //       // console.log("Data de criação da conta:", user.whenCreated);
    //       if (user.manager) {
    //         ad.findUser(user.manager, (err, gerente) => {
    //           if (err || !gerente) {
    //             console.log("❌ Não foi possível buscar o gerente.");
    //           } else {
    //             console.log("👤 Gestor direto:");
    //             console.log("Nome completo:", gerente.displayName);
    //             console.log("Email:", gerente.mail);
    //             console.log("Login:", gerente.sAMAccountName);
    //             console.log("Cargo:", gerente.title);
    //             // console.log("Departamento:", gerente.department);
    //             // console.log("Data de criação da conta:", gerente.whenCreated);
    //           }
    //         });
    //       }

    //       resolve(user);
    //     });
    //   });
