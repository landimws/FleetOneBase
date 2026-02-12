import MasterDatabase from '../config/MasterDatabase.js';
import bcrypt from 'bcrypt';

const seed = async () => {
    try {
        await MasterDatabase.init();
        const { Empresa, Usuario } = MasterDatabase;

        // 1. Criar Empresa Padrão
        const [empresa, createdEmpresa] = await Empresa.findOrCreate({
            where: { id: 1 },
            defaults: {
                nome: 'Minha Locadora (Matriz)',
                cnpj: '00.000.000/0001-00',
                email: 'contato@locadora.com'
            }
        });

        if (createdEmpresa) console.log('✅ Empresa Criada:', empresa.nome);
        else console.log('ℹ️ Empresa já existe:', empresa.nome);

        // 2. Criar Usuário Admin
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const [admin, createdAdmin] = await Usuario.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                nome: 'Administrador',
                password: hashedPassword,
                role: 'admin',
                ativo: true,
                empresaId: empresa.id
            }
        });

        if (createdAdmin) console.log('✅ Usuário Admin criado (admin/admin123)');
        else console.log('ℹ️ Usuário Admin já existe');

        process.exit(0);
    } catch (e) {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    }
};

seed();
