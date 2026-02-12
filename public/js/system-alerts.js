/**
 * SystemAlerts - Sistema de notificações padronizado e bonito
 * Substitui o alert() nativo do navegador.
 */

const SystemAlert = {
    init() {
        // Injetar CSS
        const style = document.createElement('style');
        style.innerHTML = `
            .system-alert-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(3px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .system-alert-overlay.visible {
                opacity: 1;
            }
            .system-alert-box {
                background: white;
                border-radius: 12px;
                box-shadow: 0 15px 35px rgba(0,0,0,0.2);
                width: 90%;
                max-width: 400px;
                overflow: hidden;
                transform: scale(0.9);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                font-family: 'Segoe UI', sans-serif;
            }
            .system-alert-overlay.visible .system-alert-box {
                transform: scale(1);
            }
            .system-alert-header {
                padding: 15px 20px;
                color: white;
                font-weight: 600;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .system-alert-header.error { background: linear-gradient(135deg, #ff416c, #ff4b2b); }
            .system-alert-header.success { background: linear-gradient(135deg, #11998e, #38ef7d); }
            .system-alert-header.warning { background: linear-gradient(135deg, #f7971e, #ffd200); }
            .system-alert-header.info { background: linear-gradient(135deg, #2193b0, #6dd5ed); }
            
            .system-alert-body {
                padding: 25px 20px;
                color: #333;
                font-size: 14px;
                line-height: 1.5;
                text-align: center;
            }
            .system-alert-footer {
                padding: 15px 20px;
                background: #f8f9fa;
                display: flex;
                justify-content: center;
                border-top: 1px solid #eee;
                gap: 10px;
                flex-wrap: wrap;
            }
            .system-alert-footer.vertical {
                flex-direction: column;
                padding: 10px 20px 20px;
            }
            .system-alert-btn {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                background: #555;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                min-width: 100px;
                flex: 1; /* Todos mesmo tamanho */
                white-space: nowrap;
            }
            .system-alert-btn:hover {
                opacity: 0.95;
                transform: translateY(-2px);
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            .system-alert-btn.error { background: #ff4b2b; }
            .system-alert-btn.success { background: #11998e; }
            .system-alert-btn.info { background: #3498db; }
            .system-alert-btn.cancel { background: #7f8c8d; }
        `;
        document.head.appendChild(style);
    },

    show(message, type = 'info', title = null) {
        return new Promise((resolve) => {
            // Remover anterior se existir
            const antigo = document.getElementById('system-alert-overlay');
            if (antigo) antigo.remove();

            const overlay = document.createElement('div');
            overlay.id = 'system-alert-overlay';
            overlay.className = 'system-alert-overlay';

            let icon = 'ℹ️';
            let defaultTitle = 'Informação';

            if (type === 'error') { icon = '❌'; defaultTitle = 'Erro'; }
            if (type === 'success') { icon = '✅'; defaultTitle = 'Sucesso'; }
            if (type === 'warning') { icon = '⚠️'; defaultTitle = 'Atenção'; }

            overlay.innerHTML = `
                <div class="system-alert-box">
                    <div class="system-alert-header ${type}">
                        <span>${icon}</span>
                        <span>${title || defaultTitle}</span>
                    </div>
                    <div class="system-alert-body">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                    <div class="system-alert-footer">
                        <button class="system-alert-btn ${type}" id="btn-alert-ok">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Animação de entrada
            requestAnimationFrame(() => {
                overlay.classList.add('visible');
            });

            // Fechar
            const btnOk = overlay.querySelector('#btn-alert-ok');
            const close = () => {
                overlay.classList.remove('visible');
                setTimeout(() => {
                    if (overlay.parentNode) overlay.remove();
                    resolve(true);
                }, 300);
            };

            btnOk.addEventListener('click', close);
            btnOk.focus();

            // Fechar com Enter
            const handleKey = (e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    close();
                    document.removeEventListener('keydown', handleKey);
                }
            };
            document.addEventListener('keydown', handleKey);
        });
    },

    confirm(message, title = 'Confirmação') {
        return new Promise((resolve) => {
            const antigo = document.getElementById('system-alert-overlay');
            if (antigo) antigo.remove();

            const overlay = document.createElement('div');
            overlay.id = 'system-alert-overlay';
            overlay.className = 'system-alert-overlay';

            overlay.innerHTML = `
                <div class="system-alert-box">
                    <div class="system-alert-header warning">
                        <span>❓</span>
                        <span>${title}</span>
                    </div>
                    <div class="system-alert-body">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                    <div class="system-alert-footer" style="gap: 10px;">
                        <button class="system-alert-btn" id="btn-alert-cancel" style="background: #95a5a6;">Cancelar</button>
                        <button class="system-alert-btn success" id="btn-alert-confirm">Confirmar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));

            const close = (result) => {
                overlay.classList.remove('visible');
                setTimeout(() => {
                    if (overlay.parentNode) overlay.remove();
                    resolve(result);
                }, 300);
            };

            document.getElementById('btn-alert-confirm').onclick = () => close(true);
            document.getElementById('btn-alert-cancel').onclick = () => close(false);
            document.getElementById('btn-alert-confirm').focus();
        });
    },

    custom(message, buttons, title = 'Escolha') {
        return new Promise((resolve) => {
            const antigo = document.getElementById('system-alert-overlay');
            if (antigo) antigo.remove();

            const overlay = document.createElement('div');
            overlay.id = 'system-alert-overlay';
            overlay.className = 'system-alert-overlay';

            // Generate buttons HTML
            const buttonsHtml = buttons.map(btn => `
                <button class="system-alert-btn ${btn.class || ''}" data-value="${btn.value}">${btn.label}</button>
            `).join('');

            // Decisão automática de layout
            const isVertical = buttons.length > 2;
            const footerClass = isVertical ? 'system-alert-footer vertical' : 'system-alert-footer';

            overlay.innerHTML = `
                <div class="system-alert-box">
                    <div class="system-alert-header info" style="background: linear-gradient(135deg, #667eea, #764ba2);">
                        <span>🤔</span>
                        <span>${title}</span>
                    </div>
                    <div class="system-alert-body">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                    <div class="${footerClass}">
                        ${buttonsHtml}
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));

            const close = (val) => {
                overlay.classList.remove('visible');
                setTimeout(() => {
                    if (overlay.parentNode) overlay.remove();
                    resolve(val);
                }, 300);
            };

            // Bind events
            overlay.querySelectorAll('.system-alert-btn').forEach(btn => {
                btn.onclick = () => close(btn.dataset.value);
            });

            // Focus no primeiro
            const primeiro = overlay.querySelector('.system-alert-btn');
            if (primeiro) primeiro.focus();
        });
    },

    prompt(message, defaultValue = '', title = 'Digite') {
        return new Promise((resolve) => {
            const antigo = document.getElementById('system-alert-overlay');
            if (antigo) antigo.remove();

            const overlay = document.createElement('div');
            overlay.id = 'system-alert-overlay';
            overlay.className = 'system-alert-overlay';

            overlay.innerHTML = `
                <div class="system-alert-box">
                    <div class="system-alert-header info">
                        <span>✏️</span>
                        <span>${title}</span>
                    </div>
                    <div class="system-alert-body" style="text-align: left;">
                        <p style="margin-bottom: 10px; text-align: center;">${message.replace(/\n/g, '<br>')}</p>
                        <input 
                            type="text" 
                            id="prompt-input" 
                            value="${defaultValue}" 
                            style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #ddd;
                                border-radius: 8px;
                                font-size: 14px;
                                font-family: 'Segoe UI', monospace;
                                transition: border-color 0.2s;
                                box-sizing: border-box;
                            "
                            placeholder="Digite aqui..."
                        />
                    </div>
                    <div class="system-alert-footer" style="gap: 10px;">
                        <button class="system-alert-btn cancel" id="btn-prompt-cancel">Cancelar</button>
                        <button class="system-alert-btn success" id="btn-prompt-ok">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));

            const input = overlay.querySelector('#prompt-input');
            const btnOk = overlay.querySelector('#btn-prompt-ok');
            const btnCancel = overlay.querySelector('#btn-prompt-cancel');

            // Focar e selecionar texto
            setTimeout(() => {
                input.focus();
                input.select();
            }, 100);

            // Efeito de foco no input
            input.addEventListener('focus', () => {
                input.style.borderColor = '#3498db';
            });
            input.addEventListener('blur', () => {
                input.style.borderColor = '#ddd';
            });

            const close = (result) => {
                overlay.classList.remove('visible');
                setTimeout(() => {
                    if (overlay.parentNode) overlay.remove();
                    resolve(result);
                }, 300);
            };

            btnOk.onclick = () => close(input.value);
            btnCancel.onclick = () => close(null);

            // Enter = OK, Escape = Cancel
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    close(input.value);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    close(null);
                }
            });
        });
    },

    promptDate(message, defaultValue = '', title = 'Selecione a Data') {
        return new Promise((resolve) => {
            const antigo = document.getElementById('system-alert-overlay');
            if (antigo) antigo.remove();

            const overlay = document.createElement('div');
            overlay.id = 'system-alert-overlay';
            overlay.className = 'system-alert-overlay';

            overlay.innerHTML = `
                <div class="system-alert-box">
                    <div class="system-alert-header info">
                        <span>📅</span>
                        <span>${title}</span>
                    </div>
                    <div class="system-alert-body" style="text-align: left;">
                        <p style="margin-bottom: 10px; text-align: center;">${message.replace(/\n/g, '<br>')}</p>
                        <input 
                            type="date" 
                            id="prompt-date-input" 
                            value="${defaultValue}" 
                            style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #ddd;
                                border-radius: 8px;
                                font-size: 14px;
                                font-family: 'Segoe UI', sans-serif;
                                transition: border-color 0.2s;
                                box-sizing: border-box;
                            "
                        />
                    </div>
                    <div class="system-alert-footer" style="gap: 10px;">
                        <button class="system-alert-btn cancel" id="btn-prompt-date-cancel">Cancelar</button>
                        <button class="system-alert-btn success" id="btn-prompt-date-ok">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));

            const input = overlay.querySelector('#prompt-date-input');
            const btnOk = overlay.querySelector('#btn-prompt-date-ok');
            const btnCancel = overlay.querySelector('#btn-prompt-date-cancel');

            // Focar input
            setTimeout(() => {
                input.focus();
            }, 100);

            // Efeito de foco no input
            input.addEventListener('focus', () => {
                input.style.borderColor = '#3498db';
            });
            input.addEventListener('blur', () => {
                input.style.borderColor = '#ddd';
            });

            const close = (result) => {
                overlay.classList.remove('visible');
                setTimeout(() => {
                    if (overlay.parentNode) overlay.remove();
                    resolve(result);
                }, 300);
            };

            btnOk.onclick = () => {
                if (!input.value) {
                    input.style.borderColor = '#e74c3c';
                    input.focus();
                    return;
                }
                close(input.value);
            };
            btnCancel.onclick = () => close(null);

            // Enter = OK, Escape = Cancel
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (input.value) {
                        close(input.value);
                    } else {
                        input.style.borderColor = '#e74c3c';
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    close(null);
                }
            });
        });
    },

    error(msg, title = 'Erro') { return this.show(msg, 'error', title); },
    success(msg, title = 'Sucesso') { return this.show(msg, 'success', title); },
    warning(msg, title = 'Atenção') { return this.show(msg, 'warning', title); },
    info(msg, title = 'Info') { return this.show(msg, 'info', title); }
};

// Garantir escopo global explícito
window.SystemAlert = SystemAlert;

// Auto-inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SystemAlert.init());
} else {
    SystemAlert.init();
}
