
import http from 'http';
import https from 'https'; // Para agente que ignora cert

// WORKAROUND: O servidor é HTTPS com cert auto-assinado.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configuração
const BASE_URL = 'https://localhost:3000'; // Atenção: HTTPS
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123' // Senha padrão desenvolvimento
};

// Helper simples para fazer request JSON
function request(method, path, data = null, cookies = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(cookies ? { 'Cookie': cookies } : {})
            },
            rejectUnauthorized: false
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, headers: res.headers, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTest() {
    console.log('🚀 [TESTE AUTOMATIZADO] Iniciando verificação de Backend (CRUD Empresa)...');

    try {
        // 1. Login
        console.log('\n🔐 [1] Tentando Login...');
        // Login pode ser redirecionamento 302 ou JSON. Vamos ver.
        // O controller AuthController.login retorna redirect ou render. 
        // Se for API, precisamos ver se ele aceita JSON e retorna JSON.
        // O AuthController atual parece renderizar. E possivelmente redirecionar.
        // Se ele redireciona, cookies vêm no header Set-Cookie.

        // Pelo código que li:
        // if (user) { req.session.userId = ... return res.redirect(...) }
        // Então não é uma API JSON pura. É MVC clássico.

        // Vamos logar simulando browser (x-www-form-urlencoded se for form, ou json se o js mandar json).
        // AuthController.js login: const { username, password } = req.body;
        // O form de login usa action="/auth/login" method="POST".

        // Vamos tentar POST JSON (express.json() está ativo).

        const loginRes = await request('POST', '/auth/login', ADMIN_CREDENTIALS);

        // Se login sucesso, deve vir 302 Found (redirecionamento) e cookies.
        if (loginRes.status !== 302 && loginRes.status !== 200) {
            console.error('❌ Falha no login. Status:', loginRes.status);
            console.log('Response:', loginRes.data);
            // Pode ser que usuário/senha esteja errado ou banco zerado.
            return;
        }

        const cookies = loginRes.headers['set-cookie'];
        if (!cookies) {
            console.error('❌ Login não retornou cookies de sessão.');
            return;
        }

        const cookieStr = cookies.map(c => c.split(';')[0]).join('; ');
        console.log('✅ Login OK. Sessão obtida.');

        // 2. Criar Empresa de Teste
        console.log('\n🏢 [2] Criando Empresa de Teste via API...');
        const novaEmpresa = {
            nome: 'Empresa Teste API ' + Date.now(),
            cnpj: '99.999.999/0001-99',
            responsavel: 'Tester Bot API'
        };

        // Rota: POST /admin/empresas
        const createRes = await request('POST', '/admin/empresas', novaEmpresa, cookieStr);

        // Controller create retorna JSON: res.json({ success: true, ... })
        if (!createRes.data.success) {
            console.error('❌ Falha ao criar empresa:', createRes.data);
            return;
        }

        const empresaId = createRes.data.empresaId;
        console.log(`✅ Empresa ${empresaId} criada com sucesso.`);

        // 3. Atualizar Empresa (O Ponto Crítico)
        console.log(`\n✏️ [3] Testando UPDATE na Empresa ${empresaId}...`);

        const updateData = {
            nome: 'Empresa Teste API - ATUALIZADA',
            responsavel: 'Tester Bot - ATUALIZADO',
            cnpj: '99.999.999/0001-99', // Manter mesmo CNPJ
            cidade: 'Teste City',
            estado: 'TS'
        };

        // Rota: PUT /admin/empresas/:id
        const updateRes = await request('PUT', `/admin/empresas/${empresaId}`, updateData, cookieStr);

        console.log('📩 Resposta Update:', updateRes.data);

        if (updateRes.data.success) {
            console.log('✅ SUCESSO! O Backend processou o update corretamente.');
            console.log('👉 Conclusão: O problema é EXCLUSIVAMENTE no Frontend (JavaScript do formulário).');
        } else {
            console.error('❌ FALHA! O Backend rejeitou ou falhou no update.');
            console.error('Erro:', updateRes.data);
        }

    } catch (e) {
        console.error('❌ Erro fatal no teste:', e);
    }
}

runTest();
