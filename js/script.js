// ============ CONFIGURAÇÃO FIREBASE ============
const firebaseConfig = {
    apiKey: "AIzaSyDxFqXgBACV7Z-BZf8ypljel_lvs6JNrm0",
    authDomain: "total-monitoramento-os-df8ca.firebaseapp.com",
    databaseURL: "https://total-monitoramento-os-df8ca-default-rtdb.firebaseio.com",
    projectId: "total-monitoramento-os-df8ca",
    storageBucket: "total-monitoramento-os-df8ca.firebasestorage.app",
    messagingSenderId: "9343216301",
    appId: "1:9343216301:web:696a99e025c4d2c76cb424"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

console.log('🔥 Total Monitoramento - Banco Online Conectado!');

// ============ SISTEMA DE NOTIFICAÇÕES ============
function criarContainerNotificacoes() {
    if (!document.getElementById('notificacoesContainer')) {
        const container = document.createElement('div');
        container.id = 'notificacoesContainer';
        container.className = 'notificacoes-container';
        document.body.appendChild(container);
    }
}

function mostrarNotificacao(titulo, mensagem, tipo = 'info') {
    criarContainerNotificacoes();
    
    const container = document.getElementById('notificacoesContainer');
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao ${tipo}`;
    
    const icones = {
        sucesso: '✅',
        erro: '❌',
        info: 'ℹ️',
        alerta: '⚠️'
    };
    
    notificacao.innerHTML = `
        <button class="notificacao-fechar" onclick="this.parentElement.remove()">×</button>
        <div class="notificacao-titulo">${icones[tipo] || ''} ${titulo}</div>
        <div class="notificacao-mensagem">${mensagem}</div>
    `;
    
    container.appendChild(notificacao);
    
    setTimeout(() => {
        if (notificacao.parentElement) {
            notificacao.remove();
        }
    }, 5000);
}

// ============ FUNÇÕES AUXILIARES ============
function gerarProtocolo() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const protocoloBase = (timestamp.slice(-3) + random).slice(0, 6);
    return protocoloBase.padStart(6, '0');
}

function formatarData(data) {
    if (!data) return '-';
    return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============ BANCO DE DADOS FIREBASE ============

// Salvar OS no Firebase
function salvarOS(osData) {
    const newOSKey = database.ref().child('ordensServico').push().key;
    const dadosCompletos = {
        ...osData,
        id: newOSKey,
        dataAbertura: new Date().toISOString()
    };
    return database.ref('ordensServico/' + newOSKey).set(dadosCompletos);
}

// Ouvir OS em tempo real
function ouvirOS(callback) {
    return database.ref('ordensServico').on('value', (snapshot) => {
        const data = snapshot.val();
        const ordens = [];
        if (data) {
            Object.keys(data).forEach(key => {
                ordens.push(data[key]);
            });
        }
        ordens.sort((a, b) => {
            if (a.dataAbertura > b.dataAbertura) return -1;
            if (a.dataAbertura < b.dataAbertura) return 1;
            return 0;
        });
        callback(ordens);
    });
}

// Carregar OS uma vez
function carregarOS() {
    return new Promise((resolve) => {
        database.ref('ordensServico').once('value', (snapshot) => {
            const data = snapshot.val();
            const ordens = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    ordens.push(data[key]);
                });
            }
            resolve(ordens);
        });
    });
}

// Atualizar OS
function atualizarOS(id, dadosAtualizados) {
    return database.ref('ordensServico/' + id).update(dadosAtualizados);
}

// Excluir OS
function excluirOSFirebase(id) {
    return database.ref('ordensServico/' + id).remove();
}

// Salvar Técnico
function salvarTecnicoDB(tecnico) {
    return new Promise((resolve) => {
        database.ref('tecnicos').once('value', (snapshot) => {
            const tecnicos = snapshot.val();
            if (tecnicos) {
                const emailExiste = Object.values(tecnicos).some(t => t.email === tecnico.email);
                if (emailExiste) {
                    resolve({ sucesso: false, erro: 'E-mail já cadastrado!' });
                    return;
                }
            }
            const newKey = database.ref().child('tecnicos').push().key;
            database.ref('tecnicos/' + newKey).set({ ...tecnico, id: newKey });
            resolve({ sucesso: true });
        });
    });
}

// Login Técnico
function loginTecnicoDB(email, senha) {
    return new Promise((resolve) => {
        database.ref('tecnicos').once('value', (snapshot) => {
            const tecnicos = snapshot.val();
            if (tecnicos) {
                const tecnicoEncontrado = Object.values(tecnicos).find(
                    t => t.email === email && t.senha === senha
                );
                if (tecnicoEncontrado) {
                    resolve({ sucesso: true, tecnico: tecnicoEncontrado });
                    return;
                }
            }
            resolve({ sucesso: false, erro: 'E-mail ou senha incorretos!' });
        });
    });
}

// ============ ÁREA DO CLIENTE ============
function cadastrarOS(event) {
    if (event) event.preventDefault();
    
    const osData = {
        protocolo: gerarProtocolo(),
        nomeCliente: document.getElementById('nomeCliente').value,
        emailCliente: document.getElementById('emailCliente').value,
        telefoneCliente: document.getElementById('telefoneCliente').value,
        tipoServico: document.getElementById('tipoServico').value,
        descricaoServico: document.getElementById('descricaoServico').value,
        prioridade: document.getElementById('prioridade').value,
        status: 'Aberta',
        dataInicio: null,
        dataFim: null,
        tecnicoResponsavel: null
    };
    
    salvarOS(osData).then(() => {
        document.getElementById('numeroProtocolo').textContent = osData.protocolo;
        document.getElementById('protocoloSection').style.display = 'block';
        document.getElementById('formOS').reset();
        document.getElementById('protocoloSection').scrollIntoView({ behavior: 'smooth' });
        
        mostrarNotificacao(
            'Ordem de Serviço Aberta', 
            `Protocolo #${osData.protocolo} gerado com sucesso! Nossa equipe iniciará o atendimento.`,
            'sucesso'
        );
    }).catch(() => {
        mostrarNotificacao('Erro', 'Não foi possível cadastrar a OS. Tente novamente.', 'erro');
    });
}

// ============ CENTRAL DE SERVIÇO ============
let abaAtiva = 'abertas';

function mudarAba(aba) {
    abaAtiva = aba;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const btnAtivo = document.querySelector(`[onclick="mudarAba('${aba}')"]`);
    if (btnAtivo) btnAtivo.classList.add('active');
    
    const tabAtiva = document.getElementById(`tab-${aba}`);
    if (tabAtiva) tabAtiva.classList.add('active');
}

function iniciarCentral() {
    ouvirOS((ordens) => {
        atualizarTodasAsAbas(ordens);
        atualizarEstatisticas(ordens);
    });
}

function carregarOSPorCategoria(categoria) {
    carregarOS().then(ordens => {
        let osFiltradas = [];
        switch(categoria) {
            case 'abertas':
                osFiltradas = ordens.filter(os => os.status === 'Aberta');
                break;
            case 'pendentes':
                osFiltradas = ordens.filter(os => os.status === 'Em Andamento' || os.status === 'Pendente');
                break;
            case 'resolvidas':
                osFiltradas = ordens.filter(os => os.status === 'Resolvida');
                break;
        }
        renderizarTabela(categoria, osFiltradas);
    });
}

function atualizarTodasAsAbas(ordens) {
    ['abertas', 'pendentes', 'resolvidas'].forEach(categoria => {
        let osFiltradas = [];
        switch(categoria) {
            case 'abertas':
                osFiltradas = ordens.filter(os => os.status === 'Aberta');
                break;
            case 'pendentes':
                osFiltradas = ordens.filter(os => os.status === 'Em Andamento' || os.status === 'Pendente');
                break;
            case 'resolvidas':
                osFiltradas = ordens.filter(os => os.status === 'Resolvida');
                break;
        }
        renderizarTabela(categoria, osFiltradas);
    });
}

function renderizarTabela(categoria, osFiltradas) {
    const tabela = document.getElementById(`tabela-${categoria}`);
    if (!tabela) return;
    
    const corpoTabela = tabela.querySelector('tbody');
    corpoTabela.innerHTML = '';
    
    if (osFiltradas.length === 0) {
        corpoTabela.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <h3>Nenhuma OS encontrada</h3>
                        <p>Não há ordens de serviço nesta categoria</p>
                    </div>
                </td>
            </tr>`;
        return;
    }
    
    osFiltradas.forEach(os => {
        const row = document.createElement('tr');
        const prioridadeClass = `badge-prioridade-${(os.prioridade || 'baixa').toLowerCase()}`;
        const statusClass = `badge-status-${os.status.toLowerCase().replace(' ', '')}`;
        
        if (categoria === 'abertas') {
            row.innerHTML = `
                <td><strong style="color: var(--amarelo);">#${os.protocolo}</strong></td>
                <td>${formatarData(os.dataAbertura)}</td>
                <td>${os.nomeCliente}<br><small style="color: #888;">${os.emailCliente}</small></td>
                <td>${os.tipoServico}</td>
                <td><span class="badge ${prioridadeClass}">${os.prioridade || 'Baixa'}</span></td>
                <td><span class="badge ${statusClass}">${os.status}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editarOSCentral('${os.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="excluirOS('${os.id}')">🗑️</button>
                </td>`;
        } else if (categoria === 'pendentes') {
            row.innerHTML = `
                <td><strong style="color: var(--amarelo);">#${os.protocolo}</strong></td>
                <td>${formatarData(os.dataAbertura)}</td>
                <td>${os.nomeCliente}</td>
                <td>${os.tipoServico}</td>
                <td>${formatarData(os.dataInicio)}</td>
                <td>${os.tecnicoResponsavel || '-'}</td>
                <td><span class="badge ${statusClass}">${os.status}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editarOSCentral('${os.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="excluirOS('${os.id}')">🗑️</button>
                </td>`;
        } else {
            row.innerHTML = `
                <td><strong style="color: var(--amarelo);">#${os.protocolo}</strong></td>
                <td>${formatarData(os.dataAbertura)}</td>
                <td>${os.nomeCliente}</td>
                <td>${os.tipoServico}</td>
                <td>${formatarData(os.dataInicio)}</td>
                <td>${formatarData(os.dataFim)}</td>
                <td>${os.tecnicoResponsavel || '-'}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="verDetalhesOS('${os.id}')">👁️</button>
                    <button class="btn btn-danger btn-sm" onclick="excluirOS('${os.id}')">🗑️</button>
                </td>`;
        }
        
        corpoTabela.appendChild(row);
    });
}

function atualizarEstatisticas(ordens) {
    if (!ordens) return;
    
    const abertas = ordens.filter(os => os.status === 'Aberta').length;
    const andamento = ordens.filter(os => os.status === 'Em Andamento' || os.status === 'Pendente').length;
    const resolvidas = ordens.filter(os => os.status === 'Resolvida').length;
    
    const elementos = {
        countAbertas: document.getElementById('countAbertas'),
        countAndamento: document.getElementById('countAndamento'),
        countResolvidas: document.getElementById('countResolvidas'),
        badgeAbertas: document.getElementById('badgeAbertas'),
        badgePendentes: document.getElementById('badgePendentes'),
        badgeResolvidas: document.getElementById('badgeResolvidas')
    };
    
    if (elementos.countAbertas) elementos.countAbertas.textContent = abertas;
    if (elementos.countAndamento) elementos.countAndamento.textContent = andamento;
    if (elementos.countResolvidas) elementos.countResolvidas.textContent = resolvidas;
    if (elementos.badgeAbertas) elementos.badgeAbertas.textContent = abertas;
    if (elementos.badgePendentes) elementos.badgePendentes.textContent = andamento;
    if (elementos.badgeResolvidas) elementos.badgeResolvidas.textContent = resolvidas;
}

function editarOSCentral(id) {
    const novoStatus = prompt(
        'EDITAR STATUS DA OS\n\n' +
        'Status disponíveis:\n' +
        '• Aberta\n• Em Andamento\n• Pendente\n• Resolvida\n\n' +
        'Digite o novo status:'
    );
    
    if (novoStatus && ['Aberta', 'Em Andamento', 'Pendente', 'Resolvida'].includes(novoStatus)) {
        const atualizacao = { status: novoStatus };
        if (novoStatus === 'Resolvida') {
            atualizacao.dataFim = new Date().toISOString();
        }
        atualizarOS(id, atualizacao);
        mostrarNotificacao('Status Atualizado', `OS alterada para "${novoStatus}"`, 'sucesso');
    }
}

function verDetalhesOS(id) {
    carregarOS().then(ordens => {
        const os = ordens.find(o => o.id === id);
        if (os) {
            alert(
                `📋 DETALHES DA OS #${os.protocolo}\n\n` +
                `👤 Cliente: ${os.nomeCliente}\n` +
                `📧 E-mail: ${os.emailCliente}\n` +
                `📞 Telefone: ${os.telefoneCliente}\n` +
                `🔧 Serviço: ${os.tipoServico}\n` +
                `📝 Descrição: ${os.descricaoServico}\n` +
                `⚡ Prioridade: ${os.prioridade}\n` +
                `📅 Abertura: ${formatarData(os.dataAbertura)}\n` +
                `▶ Início: ${formatarData(os.dataInicio)}\n` +
                `✓ Finalizado: ${formatarData(os.dataFim)}\n` +
                `👨‍🔧 Técnico: ${os.tecnicoResponsavel || 'Não atribuído'}\n` +
                `📊 Status: ${os.status}`
            );
        }
    });
}

function excluirOS(id) {
    if (confirm('⚠️ Tem certeza que deseja excluir esta OS?\n\nEsta ação não pode ser desfeita!')) {
        excluirOSFirebase(id);
        mostrarNotificacao('OS Excluída', 'Ordem de Serviço foi removida', 'erro');
    }
}

function filtrarOS() {
    const termoBusca = document.getElementById('buscaCentral')?.value.toLowerCase() || '';
    
    carregarOS().then(ordens => {
        let osFiltradas = ordens;
        
        if (termoBusca !== '') {
            osFiltradas = ordens.filter(os => 
                (os.protocolo && os.protocolo.toLowerCase().includes(termoBusca)) ||
                (os.nomeCliente && os.nomeCliente.toLowerCase().includes(termoBusca)) ||
                (os.emailCliente && os.emailCliente.toLowerCase().includes(termoBusca)) ||
                (os.tipoServico && os.tipoServico.toLowerCase().includes(termoBusca)) ||
                (os.tecnicoResponsavel && os.tecnicoResponsavel.toLowerCase().includes(termoBusca))
            );
        }
        
        atualizarTodasAsAbas(osFiltradas);
    });
}

function atualizarLista() {
    const inputBusca = document.getElementById('buscaCentral');
    if (inputBusca) inputBusca.value = '';
}

function exportarDados() {
    carregarOS().then(ordensServico => {
        if (ordensServico.length === 0) {
            mostrarNotificacao('Aviso', 'Não há ordens de serviço para exportar!', 'alerta');
            return;
        }
        
        let csv = 'Protocolo;Data Abertura;Cliente;Email;Telefone;Serviço;Descrição;Prioridade;Status;Início;Fim;Técnico\n';
        
        ordensServico.forEach(os => {
            csv += `${os.protocolo};${formatarData(os.dataAbertura)};${os.nomeCliente};${os.emailCliente};${os.telefoneCliente};${os.tipoServico};"${os.descricaoServico}";${os.prioridade};${os.status};${formatarData(os.dataInicio)};${formatarData(os.dataFim)};${os.tecnicoResponsavel || ''}\n`;
        });
        
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `OS_Total_Monitoramento_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        
        mostrarNotificacao('Exportação Concluída', 'Dados exportados com sucesso!', 'sucesso');
    });
}

// ============ ÁREA DO TÉCNICO ============
function loginTecnico(event) {
    event.preventDefault();
    
    const email = document.getElementById('emailTecnico').value;
    const senha = document.getElementById('senhaTecnico').value;
    
    loginTecnicoDB(email, senha).then(resultado => {
        if (resultado.sucesso) {
            localStorage.setItem('tecnicoLogadoTotalMon', JSON.stringify(resultado.tecnico));
            mostrarNotificacao('Login Efetuado', `Bem-vindo, ${resultado.tecnico.nome}!`, 'sucesso');
            setTimeout(() => window.location.href = 'tecnico.html', 1000);
        } else {
            mostrarNotificacao('Erro de Autenticação', resultado.erro, 'erro');
        }
    });
}

function cadastrarTecnico(event) {
    event.preventDefault();
    
    const senha = document.getElementById('senhaTecnico').value;
    const confirmar = document.getElementById('confirmarSenha')?.value;
    
    if (confirmar && senha !== confirmar) {
        mostrarNotificacao('Erro', 'As senhas não coincidem!', 'erro');
        return;
    }
    
    const tecnico = {
        nome: document.getElementById('nomeTecnico').value,
        email: document.getElementById('emailTecnico').value,
        senha: senha,
        especialidade: document.getElementById('especialidadeTecnico').value
    };
    
    salvarTecnicoDB(tecnico).then(resultado => {
        if (resultado.sucesso) {
            mostrarNotificacao('Cadastro Realizado', 'Redirecionando para login...', 'sucesso');
            setTimeout(() => window.location.href = 'login-tecnico.html', 2000);
        } else {
            mostrarNotificacao('Erro', resultado.erro, 'erro');
        }
    });
}

function verificarLoginTecnico() {
    const tecnicoLogado = JSON.parse(localStorage.getItem('tecnicoLogadoTotalMon'));
    if (!tecnicoLogado) {
        window.location.href = 'login-tecnico.html';
        return null;
    }
    return tecnicoLogado;
}

function logoutTecnico() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('tecnicoLogadoTotalMon');
        window.location.href = 'login-tecnico.html';
    }
}

function carregarOSTecnico() {
    const tecnicoLogado = verificarLoginTecnico();
    if (!tecnicoLogado) return;
    
    document.getElementById('nomeTecnicoLogado').textContent = tecnicoLogado.nome;
    
    ouvirOS((ordens) => {
        const osAbertas = ordens.filter(os => os.status === 'Aberta');
        const osEmAndamento = ordens.filter(os => 
            os.status === 'Em Andamento' && os.tecnicoResponsavel === tecnicoLogado.nome
        );
        
        const corpoAbertas = document.getElementById('corpoOSAbertas');
        if (corpoAbertas) {
            corpoAbertas.innerHTML = '';
            if (osAbertas.length === 0) {
                corpoAbertas.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📭</div><h3>Nenhuma OS aberta</h3></div></td></tr>';
            } else {
                osAbertas.forEach(os => {
                    corpoAbertas.innerHTML += `
                        <tr>
                            <td><strong style="color:var(--amarelo)">#${os.protocolo}</strong></td>
                            <td>${formatarData(os.dataAbertura)}</td>
                            <td>${os.nomeCliente}</td>
                            <td>${os.telefoneCliente || '-'}</td>
                            <td>${os.tipoServico}</td>
                            <td>${(os.descricaoServico || '').substring(0, 50)}...</td>
                            <td><span class="badge badge-prioridade-${(os.prioridade || 'baixa').toLowerCase()}">${os.prioridade || 'Baixa'}</span></td>
                            <td><button class="btn btn-primary btn-sm" onclick="iniciarAtendimento('${os.id}')">▶ Iniciar</button></td>
                        </tr>`;
                });
            }
        }
        
        const corpoAndamento = document.getElementById('corpoOSAndamento');
        if (corpoAndamento) {
            corpoAndamento.innerHTML = '';
            if (osEmAndamento.length === 0) {
                corpoAndamento.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📋</div><h3>Nenhuma OS em andamento</h3></div></td></tr>';
            } else {
                osEmAndamento.forEach(os => {
                    corpoAndamento.innerHTML += `
                        <tr>
                            <td><strong style="color:var(--amarelo)">#${os.protocolo}</strong></td>
                            <td>${formatarData(os.dataAbertura)}</td>
                            <td>${os.nomeCliente}</td>
                            <td>${os.telefoneCliente || '-'}</td>
                            <td>${os.tipoServico}</td>
                            <td>${formatarData(os.dataInicio)}</td>
                            <td><span class="badge badge-status-andamento">Em Andamento</span></td>
                            <td><button class="btn btn-secondary btn-sm" onclick="mostrarFinalizarOS('${os.id}', '${os.protocolo}')">✓ Finalizar</button></td>
                        </tr>`;
                });
            }
        }
    });
}

function iniciarAtendimento(id) {
    const tecnicoLogado = verificarLoginTecnico();
    if (!tecnicoLogado) return;
    
    if (confirm('Deseja iniciar o atendimento desta OS?')) {
        atualizarOS(id, {
            status: 'Em Andamento',
            dataInicio: new Date().toISOString(),
            tecnicoResponsavel: tecnicoLogado.nome
        });
        mostrarNotificacao('Atendimento Iniciado', `Por: ${tecnicoLogado.nome}`, 'info');
    }
}

function mostrarFinalizarOS(id, protocolo) {
    const confirmacao = prompt(`Para finalizar a OS #${protocolo}, digite o número do protocolo:`);
    if (confirmacao === protocolo) {
        atualizarOS(id, {
            status: 'Resolvida',
            dataFim: new Date().toISOString()
        });
        mostrarNotificacao('Finalizado!', `OS #${protocolo} concluída!`, 'sucesso');
    } else if (confirmacao !== null) {
        mostrarNotificacao('Erro', 'Protocolo não confere!', 'erro');
    }
}

// ============ INICIALIZAÇÃO ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Total Monitoramento - Sistema Online!');
    
    // Máscara de telefone
    const telefoneInput = document.getElementById('telefoneCliente');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                value = value.replace(/(\d)(\d{4})$/, '$1-$2');
                e.target.value = value;
            }
        });
    }
    
    // Central - Iniciar em tempo real
    if (document.getElementById('tab-abertas')) {
        iniciarCentral();
    }
    
    // Técnico
    if (window.location.pathname.includes('tecnico.html')) {
        if (!verificarLoginTecnico()) return;
        carregarOSTecnico();
    }
});
