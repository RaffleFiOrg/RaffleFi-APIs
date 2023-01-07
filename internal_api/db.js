"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const mariadb_1 = require("mariadb");
require('dotenv').config();
const db_config = {
    host: process.env.DB_ADDRESS,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 14,
    connectionTimeout: 600000
};
exports.pool = (0, mariadb_1.createPool)(db_config);
