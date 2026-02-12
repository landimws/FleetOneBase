
import { Sequelize } from 'sequelize';

export async function up(queryInterface) {
    await queryInterface.addColumn('Multas', 'search_text', {
        type: Sequelize.TEXT,
        allowNull: true
    });
}

export async function down(queryInterface) {
    await queryInterface.removeColumn('Multas', 'search_text');
}
