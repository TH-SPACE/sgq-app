const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,       // Endereço do banco (geralmente localhost)
    user: process.env.DB_USER,       // Usuário do banco (ex: root)
    password: process.env.DB_PASSWORD, // Senha do banco
    database: process.env.DB_NAME    // Nome do banco de dados
});

module.exports = pool.promise();
