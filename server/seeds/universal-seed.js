/**
 * Seed Universal - Dados essenciais para TODOS os tenants
 * Este seed é executado automaticamente quando um novo tenant é criado
 */

export async function seedUniversal(models) {
    const {
        MarcaVeiculo,
        ModeloVeiculo,
        FormaPagamento,
        TipoCombustivel,
        CorVeiculo,
        CategoriaDespesa
    } = models;

    try {
        console.log('🌱 [SEED UNIVERSAL] Iniciando...');

        // ===== 1. MARCAS DE VEÍCULOS =====
        console.log('  → Populando marcas de veículos...');
        const marcasData = [
            'Volkswagen', 'Chevrolet', 'Fiat', 'Toyota', 'Honda',
            'Hyundai', 'Renault', 'Ford', 'Nissan', 'Peugeot',
            'Jeep', 'Citroën', 'Mitsubishi', 'BMW', 'Mercedes-Benz',
            'Audi', 'Volvo', 'Caoa Chery', 'JAC Motors', 'BYD',
            'Kia', 'Suzuki', 'Subaru', 'Land Rover', 'Porsche',
            'Mini', 'Lexus', 'RAM', 'Dodge', 'Outra'
        ];

        const marcas = {};
        for (const nomeMarca of marcasData) {
            const [marca] = await MarcaVeiculo.findOrCreate({
                where: { nome: nomeMarca },
                defaults: { ativo: true }
            });
            marcas[nomeMarca] = marca.id;
        }
        console.log(`  ✅ ${marcasData.length} marcas criadas`);

        // ===== 2. MODELOS DE VEÍCULOS =====
        console.log('  → Populando modelos de veículos...');
        const modelosData = {
            'Volkswagen': ['Gol', 'Polo', 'Voyage', 'Virtus', 'T-Cross', 'Nivus', 'Saveiro', 'Amarok', 'Tiguan', 'Jetta'],
            'Chevrolet': ['Onix', 'Tracker', 'S10', 'Spin', 'Montana', 'Cruze', 'Equinox', 'Trailblazer', 'Prisma', 'Joy'],
            'Fiat': ['Argo', 'Mobi', 'Cronos', 'Toro', 'Strada', 'Pulse', 'Fastback', 'Fiorino', 'Ducato', 'Doblo'],
            'Toyota': ['Corolla', 'Hilux', 'Yaris', 'SW4', 'RAV4', 'Camry', 'Etios', 'Corolla Cross', 'Prius'],
            'Honda': ['Civic', 'City', 'HR-V', 'WR-V', 'CR-V', 'Fit', 'Accord'],
            'Hyundai': ['HB20', 'Creta', 'Tucson', 'ix35', 'Azera', 'Santa Fe', 'HB20S', 'Veloster'],
            'Renault': ['Kwid', 'Sandero', 'Duster', 'Captur', 'Oroch', 'Logan', 'Fluence', 'Kardian'],
            'Ford': ['Ka', 'EcoSport', 'Ranger', 'Fusion', 'Edge', 'Territory', 'Bronco'],
            'Nissan': ['Kicks', 'Versa', 'Frontier', 'Sentra', 'March', 'Livina'],
            'Peugeot': ['208', '2008', '3008', '5008', 'Partner'],
            'Jeep': ['Renegade', 'Compass', 'Commander', 'Grand Cherokee', 'Wrangler'],
            'Citroën': ['C3', 'C4 Cactus', 'Aircross', 'Jumper'],
            'Mitsubishi': ['L200', 'Pajero', 'Eclipse Cross', 'ASX', 'Outlander'],
            'BMW': ['320i', 'X1', 'X3', 'X5', 'Serie 3', 'Serie 5'],
            'Mercedes-Benz': ['Classe A', 'Classe C', 'GLA', 'GLC', 'Sprinter'],
            'Audi': ['A3', 'A4', 'Q3', 'Q5', 'Q7'],
            'Volvo': ['XC60', 'XC90', 'S60', 'V40'],
            'Caoa Chery': ['Tiggo 5', 'Tiggo 7', 'Tiggo 8', 'Arrizo 6'],
            'JAC Motors': ['T8', 'T6', 'T5', 'iEV20'],
            'BYD': ['Yuan', 'Song', 'Tang', 'Dolphin'],
            'Kia': ['Sportage', 'Sorento', 'Picanto', 'Cerato', 'Stonic'],
            'Suzuki': ['Vitara', 'Swift', 'Jimny', 'S-Cross'],
            'RAM': ['2500', '1500', '3500']
        };

        let totalModelos = 0;
        for (const [marcaNome, modelos] of Object.entries(modelosData)) {
            const marcaId = marcas[marcaNome];
            if (!marcaId) continue;

            for (const nomeModelo of modelos) {
                await ModeloVeiculo.findOrCreate({
                    where: { marca_id: marcaId, nome: nomeModelo },
                    defaults: { ativo: true }
                });
                totalModelos++;
            }
        }
        console.log(`  ✅ ${totalModelos} modelos criados`);

        // ===== 3. FORMAS DE PAGAMENTO =====
        console.log('  → Populando formas de pagamento...');
        const formasPagamento = [
            { nome: 'Dinheiro', aceita_parcelamento: false },
            { nome: 'Pix', aceita_parcelamento: false },
            { nome: 'Débito', aceita_parcelamento: false },
            { nome: 'Crédito à Vista', aceita_parcelamento: false },
            { nome: 'Crédito Parcelado', aceita_parcelamento: true },
            { nome: 'Boleto', aceita_parcelamento: false },
            { nome: 'Transferência Bancária', aceita_parcelamento: false },
            { nome: 'Cheque', aceita_parcelamento: false },
            { nome: 'Carteira Digital', aceita_parcelamento: false }
        ];

        for (const forma of formasPagamento) {
            await FormaPagamento.findOrCreate({
                where: { nome: forma.nome },
                defaults: { aceita_parcelamento: forma.aceita_parcelamento, ativo: true }
            });
        }
        console.log(`  ✅ ${formasPagamento.length} formas de pagamento criadas`);

        // ===== 4. TIPOS DE COMBUSTÍVEL =====
        console.log('  → Populando tipos de combustível...');
        const combustiveis = [
            'Flex (Gasolina/Etanol)',
            'Gasolina',
            'Etanol',
            'Diesel',
            'Elétrico',
            'Híbrido',
            'GNV'
        ];

        for (const combustivel of combustiveis) {
            await TipoCombustivel.findOrCreate({
                where: { nome: combustivel },
                defaults: { ativo: true }
            });
        }
        console.log(`  ✅ ${combustiveis.length} tipos de combustível criados`);

        // ===== 5. CORES DE VEÍCULOS =====
        console.log('  → Populando cores de veículos...');
        const cores = [
            { nome: 'Branco', hex: '#FFFFFF' },
            { nome: 'Preto', hex: '#000000' },
            { nome: 'Prata', hex: '#C0C0C0' },
            { nome: 'Cinza', hex: '#808080' },
            { nome: 'Vermelho', hex: '#FF0000' },
            { nome: 'Azul', hex: '#0000FF' },
            { nome: 'Verde', hex: '#008000' },
            { nome: 'Amarelo', hex: '#FFFF00' },
            { nome: 'Bege', hex: '#F5F5DC' },
            { nome: 'Marrom', hex: '#8B4513' },
            { nome: 'Dourado', hex: '#FFD700' },
            { nome: 'Laranja', hex: '#FFA500' },
            { nome: 'Outra', hex: null }
        ];

        for (const cor of cores) {
            await CorVeiculo.findOrCreate({
                where: { nome: cor.nome },
                defaults: { hex_code: cor.hex, ativo: true }
            });
        }
        console.log(`  ✅ ${cores.length} cores criadas`);

        // ===== 6. CATEGORIAS DE DESPESAS =====
        console.log('  → Populando categorias de despesas...');
        const categorias = [
            { nome: 'Manutenção de Veículos', descricao: 'Reparos, revisões e manutenção preventiva' },
            { nome: 'Peças e Acessórios', descricao: 'Compra de peças de reposição e acessórios' },
            { nome: 'Combustível', descricao: 'Abastecimento de veículos' },
            { nome: 'Documentação', descricao: 'IPVA, licenciamento, multas e emolumentos' },
            { nome: 'Seguros', descricao: 'Seguros de veículos e patrimoniais' },
            { nome: 'Limpeza e Estética', descricao: 'Lavagem, polimento e higienização' },
            { nome: 'Escritório', descricao: 'Material de escritório e papelaria' },
            { nome: 'Marketing', descricao: 'Publicidade, mídia e divulgação' },
            { nome: 'Tecnologia/Software', descricao: 'Sistemas, licenças e equipamentos de TI' },
            { nome: 'RH e Folha', descricao: 'Salários, benefícios e encargos trabalhistas' },
            { nome: 'Impostos e Taxas', descricao: 'Tributos e taxas governamentais' },
            { nome: 'Serviços Terceirizados', descricao: 'Consultorias, assessorias e terceirizados' },
            { nome: 'Outras Despesas', descricao: 'Despesas diversas não categorizadas' }
        ];

        for (const categoria of categorias) {
            await CategoriaDespesa.findOrCreate({
                where: { nome: categoria.nome },
                defaults: { descricao: categoria.descricao, ativo: true }
            });
        }
        console.log(`  ✅ ${categorias.length} categorias de despesas criadas`);

        console.log('🎉 [SEED UNIVERSAL] Concluído com sucesso!');
        return { success: true, message: 'Seed universal executado' };

    } catch (error) {
        console.error('❌ [SEED UNIVERSAL] Erro:', error);
        throw error;
    }
}
