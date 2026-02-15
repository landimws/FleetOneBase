import MasterDatabase from '../config/MasterDatabase.js';
import bcrypt from 'bcrypt';
import { gerarSenhaSegura } from '../utils/senhaSegura.js';

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

        // 2. Criar Usuário Admin com senha segura gerada
        const senhaSuperAdmin = gerarSenhaSegura(16);
        const hashedPassword = await bcrypt.hash(senhaSuperAdmin, 10);

        const [admin, createdAdmin] = await Usuario.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                nome: 'Administrador',
                password: hashedPassword,
                role: 'admin',
                ativo: true,
                empresaId: empresa.id,
                isSuperAdmin: true
            }
        });

        if (createdAdmin) {
            console.log('\n' + '='.repeat(60));
            console.log('🔐 SUPER ADMIN CRIADO');
            console.log('='.repeat(60));
            console.log(`   Usuário: admin`);
            console.log(`   Senha:   ${senhaSuperAdmin}`);
            console.log('   ⚠️  GUARDE ESTA SENHA COM SEGURANÇA!');
            console.log('='.repeat(60) + '\n');
        } else {
            console.log('ℹ️ Usuário Admin já existe');
        }

        process.exit(0);
    } catch (e) {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    }
};

seed();
