import { ComprasCalculo } from './compras.calculo.js';

let itens = [];

export const ComprasItens = {
    adicionar(item) {
        // Validação básica
        if (!item.descricao || item.quantidade <= 0) {
            alert('Descrição e quantidade são obrigatórios.');
            return false;
        }

        // Garante cálculo correto antes de adicionar
        item.total = ComprasCalculo.calcularItem(item.quantidade, item.valor_unitario, item.desconto_valor);
        itens.push(item);
        this.renderizar();
        return true;
    },

    atualizar(index, item) {
        if (!item.descricao || item.quantidade <= 0) {
            alert('Descrição e quantidade são obrigatórios.');
            return false;
        }
        item.total = ComprasCalculo.calcularItem(item.quantidade, item.valor_unitario, item.desconto_valor);
        itens[index] = item;
        this.renderizar();
        return true;
    },

    remover(index) {
        itens.splice(index, 1);
        this.renderizar();
    },

    limpar() {
        itens = [];
        this.renderizar();
    },

    obterTodos() {
        return [...itens]; // Retorna cópia para segurança
    },

    renderizar() {
        const tbody = document.getElementById('listaItens');
        const msg = document.getElementById('semItensMsg');

        if (itens.length === 0) {
            tbody.innerHTML = '';
            msg.style.display = 'block';
            // Disparar evento para atualizar totais da página
            document.dispatchEvent(new CustomEvent('compras:itensAtualizados', { detail: { itens } }));
            return;
        }

        msg.style.display = 'none';
        tbody.innerHTML = itens.map((item, index) => `
            <tr>
                <td>
                    <div style="font-weight:600; color:#334155;">${item.descricao}</div>
                    <div style="font-size:0.75rem; color:#94a3b8;">
                        ${item.tipo} 
                        ${item.placa ? ' | ' + item.placa : ''} 
                        ${item.numero_os ? ' | OS: ' + item.numero_os : ''}
                    </div>
                </td>
                <td class="text-center">${item.quantidade}</td>
                <td class="text-right">${parseFloat(item.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td class="text-right" style="font-weight:600;">${parseFloat(item.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td class="text-center">
                    <span data-index="${index}" class="btn-edit-item" style="cursor:pointer; color:#3498db; font-size:1.1rem; padding:4px; margin-right:8px;"><i class="fas fa-edit"></i></span>
                    <span data-index="${index}" class="btn-remove-item" style="cursor:pointer; color:#ef4444; font-size:1.1rem; padding:4px;">&times;</span>
                </td>
            </tr>
        `).join('');

        // Re-attach events
        tbody.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                this.remover(index);
            });
        });

        tbody.querySelectorAll('.btn-edit-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                // Disparar evento para a página lidar com a abertura do modal de edição
                document.dispatchEvent(new CustomEvent('compras:editarItem', { detail: { index, item: itens[index] } }));
            });
        });

        document.dispatchEvent(new CustomEvent('compras:itensAtualizados', { detail: { itens } }));
    }
};
