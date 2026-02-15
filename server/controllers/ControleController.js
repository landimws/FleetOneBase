
import * as ControleService from '../services/controleService.js';
import { Op } from 'sequelize';

export const listSemanas = async (req, res) => {
    const { Semana, ControleRegistro } = req.models;
    try {
        // Listar todas as semanas do sistema
        const semanas = await Semana.findAll({
            attributes: ['id', 'data_inicio', 'data_fim', 'status'],
            order: [['data_inicio', 'DESC']]
        });

        // Buscar status de controle para todas as semanas
        // SQLite pode ter problemas com GROUP BY se não selecionar agregados corretamente
        // Vamos buscar TUDO e processar em memória, já que não devem ter milhões de semanas
        const todosRegistros = await ControleRegistro.findAll({
            attributes: ['SemanaId', 'fechada']
        });

        // Mapa: ID -> Status (Se ALL records closed -> closed, else -> aberta)
        // Regra de Negócio: A semana está "fechada" se TODOS os registros dela estiverem fechados?
        // OU se existir um flag na semana?
        // O Model ControleRegistro tem flag 'fechada' POR VEÍCULO.
        // Mas o código anterior tentava agrupar.
        // Vamos assumir: Se houver PELO MENOS UM registro e TODOS estiverem fechados = FECHADA.
        // Se não houver registros = PENDENTE.
        // Se houver registros e algum aberto = ABERTA.

        const mapaSemana = {}; // { semanaId: { total: 0, fechados: 0 } }

        todosRegistros.forEach(r => {
            if (!mapaSemana[r.SemanaId]) mapaSemana[r.SemanaId] = { total: 0, fechados: 0 };
            mapaSemana[r.SemanaId].total++;
            if (r.fechada) mapaSemana[r.SemanaId].fechados++;
        });

        const result = semanas.map(s => {
            let statusControle = 'pendente';
            const dados = mapaSemana[s.id];

            if (dados) {
                if (dados.total > 0 && dados.total === dados.fechados) {
                    statusControle = 'fechada';
                } else {
                    statusControle = 'aberta';
                }
            }

            return {
                id: s.id,
                _id: s.id,
                data_inicio: s.data_inicio,
                data_fim: s.data_fim,
                status_original: s.status,
                status_controle: statusControle
            };
        }).filter(s => s.status_controle !== 'pendente');

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao listar semanas de controle' });
    }
};

export const checkProximaSemana = async (req, res) => {
    const { Semana, ControleRegistro } = req.models;
    try {
        console.log('[checkProximaSemana] Buscando próxima semana...');

        // 1. Descobrir qual a última semana que TEM controle
        const semanasComControle = await ControleRegistro.findAll({
            attributes: ['SemanaId'],
            group: ['SemanaId']
        });

        const idsNoControle = semanasComControle.map(x => x.SemanaId);

        // 2. Buscar a próxima semana do Grid que NÃO está no Controle
        const whereClause = {};
        if (idsNoControle.length > 0) {
            whereClause.id = { [Op.notIn]: idsNoControle };
        }

        const proxima = await Semana.findOne({
            where: whereClause,
            order: [['data_inicio', 'ASC']]
        });

        if (!proxima) {
            console.log('[checkProximaSemana] Nenhuma semana pendente encontrada.');
            return res.json({ success: false, message: 'Não há novas semanas disponíveis no Grid para iniciar.' });
        }

        console.log('[checkProximaSemana] Próxima encontrada:', proxima.id, proxima.data_inicio);
        res.json({ success: true, semana: proxima });
    } catch (e) {
        console.error('[checkProximaSemana] Erro:', e);
        res.status(500).json({ error: 'Erro ao buscar próxima semana' });
    }
};

export const getSemana = async (req, res) => {
    const {
        ControleRegistro, ControleVeiculo, Veiculo
    } = req.models;
    const { id } = req.params;

    try {
        // Verificar se precisa sincronizar (Lazy) -> DESATIVADO A PEDIDO DO USUÁRIO
        // const count = await ControleRegistro.count({ where: { SemanaId: id } });
        // if (count === 0) {
        //    // Tenta criar sob demanda
        //    await ControleService.sincronizarSemana(req.models, id);
        // }

        // Buscar dados da Grid
        const registros = await ControleRegistro.findAll({
            where: { SemanaId: id },
            include: [
                { model: Veiculo, attributes: ['modelo', 'placa'] }, // Join para mostrar modelo
                // { model: ControleVeiculo, attributes: ['pacote_km_semana', 'intervalo_oleo_km', 'ultima_troca_oleo_km'] } // Configs
            ]
        });

        // Buscar configs separadamente (ou via include acima se configurado)
        // O include acima falhou possivelmente se associação n estiver perfeita, mas vamos garantir:
        // Melhor buscar ControleVeiculo separadamente para garantir performance e montar objeto

        const configs = await ControleVeiculo.findAll();
        const mapaConfigs = {};
        configs.forEach(c => mapaConfigs[c.placa] = c);

        const grid = registros.map(r => {
            const conf = mapaConfigs[r.veiculo_id] || {};

            // Cálculos Voláteis (Frontend ou Backend?)
            // Backend é mais seguro.

            const kmRodados = r.km_atual > 0 ? (r.km_atual - r.km_anterior) : 0;

            const alertas = [];
            // Lógica de Alertas (simplificada aqui, pode ir pro Service se crescer)

            // Oleo
            const ultOleo = conf.ultima_troca_oleo_km || 0;
            const intervOleo = conf.intervalo_oleo_km || 5000;
            const proxOleo = ultOleo + intervOleo;

            if (r.km_atual > 0 && r.km_atual >= proxOleo) alertas.push('oleo');

            // Correia
            if (conf.usa_correia) {
                const ultCorreia = conf.ultima_troca_correia_km || 0;
                const intervCorreia = conf.intervalo_correia_km || 60000;
                const proxCorreia = ultCorreia + intervCorreia;
                if (r.km_atual > 0 && r.km_atual >= proxCorreia) alertas.push('correia');
            }

            // Excedente
            if (kmRodados > (conf.pacote_km_semana || 1000)) alertas.push('excedente');

            return {
                id: r.id,
                veiculo_id: r.veiculo_id,
                modelo: r.Veiculo?.modelo || 'Desc. Modelo',
                cliente: r.cliente_atual,
                km_anterior: r.km_anterior,
                km_atual: r.km_atual,
                km_rodados: kmRodados,
                situacao: r.situacao,
                alertas: alertas,
                configs: conf,
                fechada: r.fechada,
                data_atualizacao: r.updatedAt
            };
        });

        // Ordenar por placa
        grid.sort((a, b) => a.veiculo_id.localeCompare(b.veiculo_id));

        res.json({ success: true, data: grid });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao carregar grid da semana' });
    }
};

export const criarSemana = async (req, res) => {
    const { id } = req.params;
    try {
        await ControleService.sincronizarSemana(req.models, id);
        res.json({ success: true, message: 'Semana criada/sincronizada' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};

export const fecharSemana = async (req, res) => {
    const { ControleRegistro } = req.models;
    const { id } = req.params;
    try {
        await ControleRegistro.update(
            { fechada: true, data_fechamento: new Date() },
            { where: { SemanaId: id } }
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao fechar semana' });
    }
};

export const excluirSemana = async (req, res) => {
    const { ControleRegistro, ControleServico, ControleKmHistorico } = req.models;
    const { id } = req.params;
    try {
        // Validação: Só pode excluir se for a última?
        // O usuário pediu "Só pode excluir a semana mais recente do Controle"

        const ultima = await ControleRegistro.max('SemanaId');
        if (ultima && parseInt(ultima) > parseInt(id)) {
            return res.status(400).json({ error: 'Não é possível excluir esta semana pois existem semanas posteriores criadas.' });
        }

        // Excluir registros
        await ControleRegistro.destroy({ where: { SemanaId: id } });
        // Excluir históricos desta semana (Opcional: manter histórico? Pediram pra excluir semana)
        // Se excluir a semana, o histórico de km atrelado a ela deve sumir para não duplicar se recriar
        await ControleKmHistorico.destroy({ where: { SemanaId: id } });
        // Serviços atrelados a semana?
        await ControleServico.destroy({ where: { SemanaId: id } });

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao excluir semana' });
    }
};

// ... (métodos anteriores)

// =================================================================================
// PHASE 4: OPERAÇÕES
// =================================================================================

export const updateConfig = async (req, res) => {
    const { ControleVeiculo } = req.models;
    const { id } = req.params; // Placa
    try {
        const {
            pacote_km_semana,
            intervalo_oleo_km,
            intervalo_correia_km,
            usa_correia,
            ultima_troca_oleo_km,
            ultima_troca_oleo_data,
            ultima_troca_correia_km,
            ultima_troca_correia_data
        } = req.body;

        // Find or create para garantir
        let config = await ControleVeiculo.findByPk(id);
        if (!config) {
            config = await ControleVeiculo.create({ placa: id });
        }

        await config.update({
            pacote_km_semana,
            intervalo_oleo_km,
            intervalo_correia_km,
            usa_correia,
            ultima_troca_oleo_km,
            ultima_troca_oleo_data,
            ultima_troca_correia_km,
            ultima_troca_correia_data
        });

        res.json({ success: true, data: config });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
};

export const registrarKm = async (req, res) => {
    const { ControleRegistro, ControleKmHistorico, ControleVeiculo } = req.models;
    const { id } = req.params; // ID do REGISTRO (não da placa)
    try {
        const { km_atual, data_registro, motivo } = req.body;

        const registro = await ControleRegistro.findByPk(id);
        if (!registro) return res.status(404).json({ error: 'Registro não encontrado' });

        if (registro.fechada) return res.status(400).json({ error: 'Semana fechada' });

        const kmAnterior = registro.km_anterior;
        const novoKm = parseInt(km_atual);

        // Validação de Correção
        if (registro.km_atual > 0 && novoKm !== registro.km_atual) {
            if (!motivo || motivo.trim() === '') {
                return res.status(400).json({ error: 'Para corrigir um Km já informado, é obrigatório informar o motivo.' });
            }
        }

        if (novoKm < kmAnterior && novoKm !== 0) {
            // Permitir correção se usuário errou, mas avisar frontend? Backend aceita.
            // Mas logicamente Km não diminui.
        }

        // Histórico
        await ControleKmHistorico.create({
            controle_veiculo_placa: registro.veiculo_id,
            SemanaId: registro.SemanaId,
            data_registro: data_registro || new Date(),
            km_registrado: novoKm,
            km_anterior: kmAnterior,
            motivo: motivo || null
        });

        // Configs para calcular manutenção
        const config = await ControleVeiculo.findByPk(registro.veiculo_id);

        // Calcular Situação
        let novaSituacao = 'Normal';

        if (config) {
            const proxOleo = (config.ultima_troca_oleo_km || 0) + (config.intervalo_oleo_km || 5000);
            const proxCorreia = (config.ultima_troca_correia_km || 0) + (config.intervalo_correia_km || 60000);

            if (novoKm >= proxOleo) novaSituacao = 'Agendar';
            if (config.usa_correia && novoKm >= proxCorreia) novaSituacao = 'Agendar';
        }

        // Se já estava em fluxo de oficina, mantém?
        // Regra: "Solicitar" -> "Normal" ou "Agendar".
        // Se estava "Agendado", "Na oficina", "Revisado", o registro de KM não deve resetar esses estados manuais.
        // A especificação diz: "Ao registrar km... situacao = 'Agendar' ou 'Normal'".
        // Mas e se já agendei? Normalmente registrar KM acontece ANTES de agendar.
        // Se eu registrar KM com o carro na oficina? 
        // Vamos preservar estados avançados.
        if (['Agendado', 'Na oficina', 'Revisado'].includes(registro.situacao)) {
            novaSituacao = registro.situacao;
        }

        registro.km_atual = novoKm;
        registro.situacao = novaSituacao;
        await registro.save();

        // [NEW] Propagar para a próxima semana (se existir)
        const proximoRegistro = await ControleRegistro.findOne({
            where: {
                veiculo_id: registro.veiculo_id,
                SemanaId: { [Op.gt]: registro.SemanaId }
            },
            order: [['SemanaId', 'ASC']]
        });

        if (proximoRegistro) {
            if (proximoRegistro.km_anterior !== novoKm) {
                proximoRegistro.km_anterior = novoKm;
                await proximoRegistro.save();
                console.log(`[Controle] Propagado Km Anterior para semana ${proximoRegistro.SemanaId} do veículo ${registro.veiculo_id}: ${novoKm}`);
            }
        }

        res.json({ success: true, data: registro });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao registrar Km' });
    }
};

export const agendarServico = async (req, res) => {
    const { ControleRegistro, ControleServico } = req.models;
    const { id } = req.params; // ID Registro
    try {
        const { data_agendamento, observacao } = req.body;
        const registro = await ControleRegistro.findByPk(id);

        await ControleServico.create({
            veiculo_id: registro.veiculo_id,
            SemanaId: registro.SemanaId,
            tipo: 'Mecanica', // Genérico por enquanto
            data_agendamento,
            observacao,
            status: 'Agendado'
        });

        registro.situacao = 'Agendado';
        await registro.save();

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao agendar' });
    }
};

export const registrarEntrada = async (req, res) => {
    const { ControleRegistro, ControleServico } = req.models;
    const { id } = req.params; // ID Registro
    try {
        const { data_entrada } = req.body;
        const registro = await ControleRegistro.findByPk(id);

        // Buscar serviço agendado (ou criar novo)
        // Lógica simplificada: Sempre cria um novo registro de serviço ou atualiza o último "agendado"?
        // Vamos criar um novo para garantir histórico de eventos, ou atualizar o último da semana?
        // Melhor: Procurar um serviço 'Agendado' para este veículo nesta semana.

        let servico = await ControleServico.findOne({
            where: {
                veiculo_id: registro.veiculo_id,
                SemanaId: registro.SemanaId,
                data_entrada: null
            },
            order: [['createdAt', 'DESC']]
        });

        if (servico) {
            servico.data_entrada = data_entrada;
            await servico.save();
        } else {
            await ControleServico.create({
                veiculo_id: registro.veiculo_id,
                SemanaId: registro.SemanaId,
                data_entrada,
                tipo: 'Mecanica'
            });
        }

        registro.situacao = 'Na oficina';
        await registro.save();

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao registrar entrada' });
    }
};

export const registrarSaida = async (req, res) => {
    const { ControleRegistro, ControleServico, ControleVeiculo } = req.models;
    const { id } = req.params; // ID Registro
    try {
        const { data_saida, km_saida, trocou_oleo, trocou_correia, observacao } = req.body;
        const registro = await ControleRegistro.findByPk(id);

        // Atualizar Serviço
        let servico = await ControleServico.findOne({
            where: {
                veiculo_id: registro.veiculo_id,
                SemanaId: registro.SemanaId,
                data_saida: null
            },
            order: [['createdAt', 'DESC']]
        });

        if (servico) {
            servico.data_saida = data_saida;
            servico.km_saida = km_saida;
            servico.trocou_oleo = trocou_oleo;
            servico.trocou_correia = trocou_correia;
            if (observacao) servico.observacao = observacao;
            await servico.save();
        } else {
            // Criar um solto (não ideal mas preventivo)
            await ControleServico.create({
                veiculo_id: registro.veiculo_id,
                SemanaId: registro.SemanaId,
                data_saida,
                km_saida,
                trocou_oleo,
                trocou_correia,
                observacao,
                tipo: 'Mecanica'
            });
        }

        // Atualizar Configurações do Veículo (Última Troca)
        const config = await ControleVeiculo.findByPk(registro.veiculo_id);
        if (config) {
            if (trocou_oleo) {
                config.ultima_troca_oleo_km = km_saida;
                config.ultima_troca_oleo_data = data_saida;
            }
            if (trocou_correia) {
                config.ultima_troca_correia_km = km_saida;
                config.ultima_troca_correia_data = data_saida;
            }
            await config.save();
        }

        registro.situacao = 'Revisado';
        // Opcional: Atualizar km_atual se km_saida > km_atual?
        if (km_saida > registro.km_atual) {
            registro.km_atual = km_saida; // Sync
        }

        await registro.save();

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao registrar saída' });
    }
};

export const solicitarServico = async (req, res) => {
    const { ControleRegistro } = req.models;
    const { id } = req.params;
    try {
        await ControleRegistro.update({ situacao: 'Agendar' }, { where: { id } });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao solicitar serviço' });
    }
};

// ... Outros endpoints de atualização de KM e Serviço serão adicionados na sequencia
