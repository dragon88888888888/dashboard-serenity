// lib/db.js
import mysql from 'mysql2/promise';

// Configuración de conexión a Amazon RDS MySQL
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: true
    } : false
};

// Pool de conexiones para mejor rendimiento
let pool;

// Función para obtener una conexión del pool
export async function getConnection() {
    if (!pool) {
        pool = mysql.createPool({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database,
            port: dbConfig.port,
            ssl: dbConfig.ssl,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }
    return pool;
}

// Función para ejecutar consultas
export async function executeQuery(query, params = []) {
    try {
        const connection = await getConnection();
        const [results] = await connection.execute(query, params);
        return results;
    } catch (error) {
        console.error('Error al ejecutar la consulta:', error);
        throw error;
    }
}