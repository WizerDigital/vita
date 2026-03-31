# Agente Base - Vita Node

Agente conversacional escalável integrado com WAHA (WhatsApp HTTP API), OpenAI, BullMQ, PostgreSQL e Redis.

## 🚀 Funcionalidades

- **API de Mensagens:** Recebimento e processamento de webhooks do WAHA.
- **Worker de IA:** Processamento assíncrono de mensagens utilizando modelos da OpenAI.
- **Scanner:** Monitoramento e gestão de estados de contatos/conversas.
- **Notificações:** Sistema de background para envio de alertas e status.
- **Escalabilidade:** Utiliza BullMQ para gerenciamento de filas de tarefas.

## 🛠️ Tecnologias

- **Runtime:** Node.js (ES Modules)
- **IA:** OpenAI API
- **Banco de Dados:** PostgreSQL (Persistência) & Redis (Filas e Cache)
- **Mensageria:** BullMQ
- **Infraestrutura:** Docker & PM2 (ecosystem config incluído)

## 📋 Pré-requisitos

- Node.js v18+
- Instância do WAHA configurada
- PostgreSQL e Redis rodando (via Docker Compose disponível)

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/WizerDigital/vita.git
cd vita
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas credenciais
```

4. Inicie a infraestrutura (PostgreSQL/Redis):
```bash
docker-compose up -d
```

5. Inicialize o banco de dados:
```bash
psql -h localhost -U postgres -d agent_db -f init.sql
```

## 🏃 Execução

Para rodar todos os serviços em modo de desenvolvimento:
```bash
npm run dev
```

Ou individualmente:
- **API:** `npm run start`
- **Worker:** `npm run worker`
- **Scanner:** `npm run scanner`
- **Notifications:** `npm run notifications`

## 📦 Estrutura de Pastas

- `src/api`: Endpoint de webhooks e rotas da API.
- `src/agent`: Lógica do agente de IA, ferramentas (tools) e workers.
- `src/background`: Processos de segundo plano (scanner e notificações).
- `src/config`: Configurações de conexões (DB, Redis, Queues).
- `src/utils`: Funções utilitárias.
- `src/waha-docs`: Documentação e exemplos de payloads do WAHA.

---
Desenvolvido por Rafael Franskowiak
