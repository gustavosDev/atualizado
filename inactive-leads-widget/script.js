console.log("Script carregado!");
let token = null;
let leadsFiltrados = [];

// função chamada quando  clicar em "Salvar" nas configurações
AMOCRM.widgets.settings.onSave = function() {
  const login = document.getElementById("login").value;
  const apiKey = document.getElementById("api_key").value;
  const account = document.getElementById("account").value;

  console.log("Configurações salvas:");
  console.log("Login:", login);
  console.log("API Key:", apiKey);
  console.log("Account:", account);

  return true;
};

// elementos da interface
const verificarBtn = document.getElementById('ilw-verificar-btn');
const criarTarefaBtn = document.getElementById('ilw-criar-tarefa-btn');
const resultadoDiv = document.getElementById('ilw-resultado');
const loader = document.getElementById('ilw-loader');

// obter token
async function obterToken() {
  token = await AMOCRM.getToken();
  if (!token) throw new Error('Token não obtido');
}

// buscar leads
async function getLeads() {
  const response = await fetch('/api/v4/leads?with=tasks', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Erro ao buscar leads');
  const data = await response.json();
  return data._embedded.leads;
}

// filtrar leads inativos
function filtrarLeads(leads) {
  const cincoDiasAtras = Math.floor(Date.now() / 1000) - 5 * 24 * 60 * 60;
  return leads.filter(lead => {
    const semTarefa = !lead._embedded?.tasks || lead._embedded.tasks.length === 0;
    const dataUltimoContato = lead.last_contacted_at || lead.updated_at || 0;
    return semTarefa && dataUltimoContato < cincoDiasAtras;
  });
}

// exibir resultado
function exibirResultado(leads) {
  resultadoDiv.innerHTML = '';
  if (leads.length === 0) {
    resultadoDiv.innerHTML = `<p>✅ Nenhum lead encontrado com mais de 5 dias sem contato e sem tarefas.</p>`;
    criarTarefaBtn.classList.add('ilw-hidden');
  } else {
    resultadoDiv.innerHTML = leads.map(lead => `
      <div class="ilw-lead-card">
        <strong>${lead.name || 'Sem nome'}</strong><br>
        ID: ${lead.id}<br>
        <a href="https://example.kommo.com/leads/detail/${lead.id}" target="_blank">Ver Lead</a>
      </div>
    `).join('');
    criarTarefaBtn.classList.remove('ilw-hidden');
  }
}

// criar tarefas
async function criarTarefas(leads) {
  if (leads.length === 0) throw new Error('Sem leads para agendar tarefas');

  const tarefas = leads.map(lead => ({
    text: 'Entrar em contato com o lead (5 dias sem contato)',
    complete_till: Math.floor(Date.now() / 1000) + 86400,
    entity_id: lead.id,
    entity_type: 'leads'
  }));

  const response = await fetch('/api/v4/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tarefas)
  });

  if (!response.ok) throw new Error('Erro ao criar tarefas');
  resultadoDiv.innerHTML += `<p style="color: green;">✅ ${tarefas.length} tarefas criadas com sucesso!</p>`;
  criarTarefaBtn.classList.add('ilw-hidden');
}

// eventos
verificarBtn.addEventListener('click', async () => {
  loader.classList.remove('ilw-hidden');
  criarTarefaBtn.classList.add('ilw-hidden');

  try {
    await obterToken();
    const leads = await getLeads();
    leadsFiltrados = filtrarLeads(leads);
    exibirResultado(leadsFiltrados);
  } catch (err) {
    resultadoDiv.innerHTML = `<p style="color: red;">Erro: ${err.message}</p>`;
  } finally {
    loader.classList.add('ilw-hidden');
  }
});

criarTarefaBtn.addEventListener('click', async () => {
  loader.classList.remove('ilw-hidden');
  try {
    await criarTarefas(leadsFiltrados);
  } catch (err) {
    resultadoDiv.innerHTML += `<p style="color: red;">Erro: ${err.message}</p>`;
  } finally {
    loader.classList.add('ilw-hidden');
  }
});
