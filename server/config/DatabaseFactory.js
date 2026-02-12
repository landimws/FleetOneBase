import { Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseFactory {
    constructor() {
        this.masterConnection = null;
        this.tenantConnections = new Map();

        // Configurações base
        this.baseConfig = {
            dialect: 'sqlite',
            logging: false, // Pode ser ativado via env se necessário
            benchmark: false
        };
    }

    /**
     * Inicializa a conexão com o Banco Master (Usuários, Empresas)
     */
    async initMaster() {
        if (this.masterConnection) return this.masterConnection;

        const storagePath = process.env.DATABASE_MASTER_STORAGE || 'data/master.sqlite';
        const fullPath = path.resolve(process.cwd(), storagePath);

        // Garantir que diretório existe
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        console.log(`[DB Factory] Conectando ao Master DB: ${fullPath}`);

        this.masterConnection = new Sequelize({
            ...this.baseConfig,
            storage: fullPath
        });

        try {
            await this.masterConnection.authenticate();
            console.log('✅ Master DB Conectado.');
        } catch (error) {
            console.error('❌ Erro ao conectar Master DB:', error);
            throw error;
        }

        return this.masterConnection;
    }

    /**
     * Obtém ou cria uma conexão para um Tenant específico
     * @param {number|string} tenantId ID da Empresa
     */
    async getTenantConnection(tenantId) {
        if (!tenantId) throw new Error('Tenant ID é obrigatório');

        // Retorna do cache se já existir
        if (this.tenantConnections.has(tenantId)) {
            return this.tenantConnections.get(tenantId);
        }

        const storagePath = `data/empresa_${tenantId}.sqlite`;
        const fullPath = path.resolve(process.cwd(), storagePath);

        // Garantir que diretório existe
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // console.log(`[DB Factory] Carregando Tenant DB ${tenantId}: ${fullPath}`);

        const connection = new Sequelize({
            ...this.baseConfig,
            storage: fullPath
        });

        try {
            await connection.authenticate();
            this.tenantConnections.set(tenantId, connection);
        } catch (error) {
            console.error(`❌ Erro ao conectar Tenant DB ${tenantId}:`, error);
            throw error;
        }

        return connection;
    }

    /**
     * Fecha conexão de um tenant para liberar memória
     */
    async closeTenantConnection(tenantId) {
        if (this.tenantConnections.has(tenantId)) {
            const conn = this.tenantConnections.get(tenantId);
            await conn.close();
            this.tenantConnections.delete(tenantId);
            console.log(`[DB Factory] Conexão Tenant ${tenantId} fechada.`);
        }
    }
}

// Singleton
export default new DatabaseFactory();
