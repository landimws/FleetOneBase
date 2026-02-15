/**
 * Seed simplificado para popular dados do módulo de contratos
 * Execute com: npm start (e então acesse /api/contratos/seed/run via navegador)
 * OU crie uma rota temporária
 */

export async function seedContratos(models) {
    const {
        ConfiguracoesContrato,
        ItensContratoPadrao,
        TemplatesDocumento
    } = models;

    try {
        console.log('🌱 Iniciando seed do módulo de contratos...');

        // 1. Configurações padrão
        const configExistente = await ConfiguracoesContrato.findOne();
        if (!configExistente) {
            await ConfiguracoesContrato.create({
                taxa_administrativa: 0.15,
                percentual_multa_atraso: 0.02,
                percentual_juros_mora: 0.01,
                percentual_multa_rescisao: 0.10,
                vigencia_padrao_dias: 30,
                km_franquia_padrao: 100,
                valor_km_excedente_padrao: 0.50,
                valor_avaria_padrao: 100.00
            });
            console.log('✅ Configurações criadas');
        } else {
            console.log('ℹ️ Configurações já existem');
        }

        // 2. Itens padrão
        const itens = [
            { nome: 'Locação Mensal', tipo: 'locacao', valor_padrao: 1500.00, descricao: 'Valor da locação mensal do veículo' },
            { nome: 'Seguro Total', tipo: 'seguro', valor_padrao: 300.00, descricao: 'Seguro contra roubo, furto e colisão' },
            { nome: 'Rastreador GPS', tipo: 'servico', valor_padrao: 80.00, descricao: 'Monitoramento em tempo real' },
            { nome: 'Manutenção Preventiva', tipo: 'servico', valor_padrao: 150.00, descricao: 'Revisões periódicas incluídas' },
            { nome: 'Proteção de Vidros', tipo: 'acessorio', valor_padrao: 50.00, descricao: 'Cobertura para danos em vidros' },
            { nome: 'Assistência 24h', tipo: 'servico', valor_padrao: 100.00, descricao: 'Guincho e socorro mecânico' }
        ];

        for (const item of itens) {
            const existe = await ItensContratoPadrao.findOne({ where: { nome: item.nome } });
            if (!existe) {
                await ItensContratoPadrao.create(item);
                console.log(`✅ Item criado: ${item.nome}`);
            }
        }

        // 3. Template HTML padrão
        const templateExistente = await TemplatesDocumento.findOne({ where: { tipo: 'contrato' } });
        if (!templateExistente) {
            const htmlTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Contrato de Locação</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { text-align: center; color: #333; }
        .section { margin: 20px 0; }
        .label { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>CONTRATO DE LOCAÇÃO DE VEÍCULO</h1>
    
    <div class="section">
        <p><span class="label">Contrato Nº:</span> {{CONTRATO_NUMERO}}</p>
        <p><span class="label">Data de Assinatura:</span> {{CONTRATO_DATA_INICIO}}</p>
    </div>

    <div class="section">
        <h3>LOCADOR</h3>
        <p><span class="label">Empresa:</span> {{EMPRESA_NOME}}</p>
        <p><span class="label">CNPJ:</span> {{EMPRESA_CNPJ}}</p>
    </div>

    <div class="section">
        <h3>LOCATÁRIO</h3>
        <p><span class="label">Nome:</span> {{CLIENTE_NOME}}</p>
        <p><span class="label">CPF:</span> {{CLIENTE_CPF}}</p>
        <p><span class="label">CNH:</span> {{CLIENTE_CNH}}</p>
    </div>

    <div class="section">
        <h3>VEÍCULO</h3>
        <p><span class="label">Marca/Modelo:</span> {{VEICULO_MARCA}} {{VEICULO_MODELO}}</p>
        <p><span class="label">Placa:</span> {{VEICULO_PLACA}}</p>
        <p><span class="label">Cor:</span> {{VEICULO_COR}}</p>
    </div>

    <div class="section">
        <h3>CONDIÇÕES</h3>
        <p><span class="label">Vigência:</span> {{CONTRATO_VIGENCIA_DIAS}} dias</p>
        <p><span class="label">Período:</span> {{CONTRATO_DATA_INICIO}} até {{CONTRATO_DATA_FIM}}</p>
        <p><span class="label">KM Franquia:</span> {{KM_FRANQUIA}} km</p>
        <p><span class="label">Valor KM Excedente:</span> R$ {{VALOR_KM_EXCEDENTE}}</p>
    </div>

    <div class="section">
        <h3>ITENS E VALORES</h3>
        {{ITENS_TABELA}}
    </div>

    @if(VALOR_CAUCAO > 0)
    <div class="section">
        <h3>CAUÇÃO</h3>
        {{CLAUSULA_4_2}}
    </div>
    @endif

    <div class="section">
        <p style="margin-top: 60px; text-align: center;">
            _________________________________<br>
            {{CLIENTE_NOME}}
        </p>
    </div>
</body>
</html>`;

            await TemplatesDocumento.create({
                nome: 'Contrato Padrão',
                tipo: 'contrato',
                html_completo: htmlTemplate,
                ativo: true,
                versao: 1,
                variaveis_disponiveis: JSON.stringify([
                    'EMPRESA_NOME', 'EMPRESA_CNPJ', 'CLIENTE_NOME', 'CLIENTE_CPF',
                    'CLIENTE_CNH', 'VEICULO_MARCA', 'VEICULO_MODELO', 'VEICULO_PLACA',
                    'VEICULO_COR', 'CONTRATO_NUMERO', 'CONTRATO_DATA_INICIO',
                    'CONTRATO_DATA_FIM', 'CONTRATO_VIGENCIA_DIAS', 'KM_FRANQUIA',
                    'VALOR_KM_EXCEDENTE', 'VALOR_CAUCAO', 'ITENS_TABELA', 'CLAUSULA_4_2'
                ])
            });
            console.log('✅ Template HTML criado');
        } else {
            console.log('ℹ️ Template já existe');
        }

        console.log('🎉 Seed concluído com sucesso!');
        return { success: true, message: 'Dados iniciais criados' };

    } catch (error) {
        console.error('❌ Erro no seed:', error);
        throw error;
    }
}
