require("dotenv").config();
const ActiveDirectory = require("activedirectory2");


const config = {
    url: process.env.LDAP_URL,
    baseDN: process.env.LDAP_BASE_DN,
    username: process.env.LDAP_USER,
    password: process.env.LDAP_PASS,
    referral: false,

    attributes: {
        user: [
            "thumbnailPhoto",
            "givenName", "initials", "sn", "displayName", "description",
            "physicalDeliveryOfficeName", "telephoneNumber", "mail", "wWWHomePage",
            "streetAddress", "postOfficeBox", "l", "st", "postalCode", "co",
            "userPrincipalName", "sAMAccountName", "profilePath", "scriptPath",
            "homeDirectory", "homeDrive", "homePhone", "pager", "mobile",
            "facsimileTelephoneNumber", "ipPhone", "title", "department",
            "company", "manager", "directReports", "distinguishedName",
            "objectClass", "objectCategory", "memberOf", "userAccountControl", "whenCreated", "extensionAttribute1", "extensionAttribute2", "birthDate"
        ]
    }

};


const ad = new ActiveDirectory(config);

module.exports = ad;