# OdontoSync - Sistema de Gestão Odontológica

## 📋 Visão Geral

OdontoSync é um sistema SaaS completo para gestão de clínicas odontológicas. Oferece uma solução integrada para gerenciamento de pacientes, agendamentos, atendimentos, registros clínicos, controle financeiro e relatórios, otimizando as operações de consultórios dentários.

## 🚀 Funcionalidades Principais

### 📊 Dashboard
- Métricas em tempo real da clínica
- Agendamentos do dia
- Pacientes ativos
- Indicadores financeiros
- Visão geral dos atendimentos

### 👥 Gestão de Pacientes
- Cadastro completo de pacientes
- Histórico médico (anamnese)
- Anotações clínicas
- Gerenciamento de documentos
- Busca avançada e filtros

### 📅 Agenda de Atendimentos
- Calendário multi-visualização (dia, semana, mês)
- Agendamento de consultas
- Controle de status (agendado, em andamento, concluído, cancelado)
- Gestão de recursos por dentista
- Validação de conflitos em tempo real
- Notificações automáticas via WhatsApp

### 🦷 Atendimentos Clínicos
- Registro detalhado de consultas
- Planejamento de tratamentos
- Odontograma interativo (numeração FDI)
- Rastreamento de condições e tratamentos por dente
- Numeração sequencial automática de atendimentos

### 🔧 Procedimentos
- Catálogo de procedimentos odontológicos
- Categorização por especialidades
- Controle de duração e valores
- Gestão de procedimentos por empresa

### 💰 Gestão Financeira
#### Contas a Receber
- Controle de receitas de consultas
- Acompanhamento de pagamentos
- Múltiplas formas de pagamento
- Relatórios de recebimentos

#### Contas a Pagar
- Gestão de despesas da clínica
- Contas por dentista
- Categorização de gastos
- Controle de vencimentos

#### Fluxo de Caixa
- Visão consolidada das finanças
- Projeções financeiras
- Análise de entrada e saída
- Relatórios de fluxo

### 📈 Relatórios
- Relatório geral da clínica
- Relatórios financeiros detalhados
- Relatórios de agendamentos
- Relatórios de procedimentos
- Exportação em CSV
- Controle de escopo de dados por usuário

### ⚙️ Configurações
- Perfis de usuário
- Configurações da clínica
- Personalização do sistema
- Preferências de notificação

## 🏢 **Gestão de Empresas** (Novo!)

### Funcionalidades do Menu Empresas

#### 📋 Listagem de Empresas
- Visualização de todas as empresas cadastradas no sistema
- Informações resumidas: nome, razão social, e-mail, telefone
- Status de ativação (ativa/inativa)
- Filtros e busca avançada

#### ➕ Cadastro de Novas Empresas
- **Dados da Empresa:**
  - Nome da empresa
  - Razão social
  - CNPJ
  - E-mail corporativo
  - Telefone
  - Nome do responsável
  - Telefone do responsável

- **Endereço Completo:**
  - CEP (com auto-preenchimento via ViaCEP)
  - Logradouro
  - Número
  - Bairro
  - Cidade
  - Estado

- **Configurações de Assinatura:**
  - Data de fim do período trial
  - Data de início da assinatura
  - Data de fim da assinatura
  - Status de ativação

#### 👤 Criação Automática de Administrador
- Criação automática de usuário administrador para cada empresa
- Geração de senha temporária
- Perfil de administrador com acesso total
- Notificação dos dados de acesso

#### 🔍 Visualização Detalhada
- **Aba Informações da Empresa:**
  - Todos os dados cadastrais
  - Datas de assinatura e trial
  - Status de ativação
  - Informações de contato

- **Aba Usuários da Empresa:**
  - Lista completa de usuários
  - Informações de cada usuário: nome, e-mail, perfil
  - Status do usuário (ativo/pendente mudança de senha)
  - Ações para gerenciar usuários

#### ✏️ Edição de Empresas
- Atualização de todos os dados da empresa
- Modificação de informações de contato
- Alteração de datas de assinatura
- Ativação/desativação de empresas

#### 🗑️ Exclusão de Empresas
- Remoção segura de empresas do sistema
- Confirmação antes da exclusão
- Limpeza de dados relacionados

#### 🛡️ Controle de Acesso
- **Acesso Restrito:** Apenas administradores do sistema (sem empresa vinculada)
- **Multi-tenancy:** Isolamento completo de dados por empresa
- **Segurança:** Validação de permissões em todas as operações

## 👨‍⚕️ Gestão de Usuários

### Tipos de Usuário
- **Admin do Sistema:** Acesso total, gerencia empresas
- **Administrador:** Acesso completo dentro da empresa
- **Dentista:** Acesso aos próprios pacientes e agendamentos
- **Recepcionista:** Acesso básico para agendamentos e cadastros

### Controle de Dados
- **Escopo "Todos":** Visualiza dados de toda a empresa
- **Escopo "Próprios":** Visualiza apenas dados próprios
- **Mudança forçada de senha:** Para novos usuários
- **Perfis personalizáveis:** Controle granular de permissões

## 🔔 Automações

### Notificações WhatsApp
- **Novos Agendamentos:** Confirmação automática para pacientes
- **Lembretes Diários:** Notificações para consultas do dia seguinte
- **Horário Configurável:** Envio às 8:00 da manhã (horário de Brasília)

### Integração com APIs Externas
- **ViaCEP:** Auto-preenchimento de endereços
- **Evolution API:** Integração com WhatsApp
- **Neon Database:** Banco de dados serverless PostgreSQL

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **Radix UI** + shadcn/ui para componentes
- **TanStack Query** para gerenciamento de estado
- **React Hook Form** + Zod para formulários
- **Wouter** para roteamento

### Backend
- **Node.js** + Express.js
- **TypeScript** (ES modules)
- **Drizzle ORM** para banco de dados
- **PostgreSQL** (Neon serverless)
- **JWT** para autenticação
- **bcrypt** para hash de senhas

### Segurança
- Autenticação JWT
- Hash de senhas com bcrypt
- Controle de acesso baseado em roles
- Isolamento de dados multi-tenant
- Validação de dados com Zod

## 🚀 Como Executar

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   - Configure a conexão com o banco Neon
   - Defina as chaves de API necessárias

3. **Executar o projeto:**
   ```bash
   npm run dev
   ```

4. **Acessar a aplicação:**
   - Frontend: `http://localhost:5000`
   - API: `http://localhost:5000/api`

## 📁 Estrutura do Projeto

```
/
├── client/           # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── pages/        # Páginas da aplicação
│   │   ├── hooks/        # Hooks customizados
│   │   └── lib/          # Utilitários
│   └── index.html
├── server/           # Backend Express
│   ├── routes.ts     # Rotas da API
│   ├── db.ts         # Configuração do banco
│   ├── storage.ts    # Camada de dados
│   └── migrations/   # Migrações do banco
├── shared/           # Tipos compartilhados
│   └── schema.ts     # Esquemas Drizzle
└── README.md
```

## 🔐 Autenticação e Autorização

- **Login JWT:** Autenticação baseada em tokens
- **Sessões seguras:** Armazenamento em PostgreSQL
- **Controle granular:** Permissões por módulo
- **Multi-tenancy:** Isolamento por empresa
- **Troca de senha forçada:** Para novos usuários

## 📊 Banco de Dados

### Principais Tabelas
- `companies` - Empresas do sistema
- `users` - Usuários com controle multi-tenant
- `patients` - Pacientes por empresa
- `appointments` - Agendamentos
- `consultations` - Atendimentos clínicos
- `procedures` - Procedimentos odontológicos
- `financial_records` - Registros financeiros

### Multi-tenancy
- Coluna `company_id` em todas as tabelas principais
- Isolamento automático de dados por empresa
- Validação de acesso em todas as operações

## 🌟 Diferenciais

- **Interface Intuitiva:** Design moderno e responsivo
- **Multi-tenant:** Suporte a múltiplas clínicas
- **Automações:** Notificações WhatsApp integradas
- **Segurança:** Controle de acesso robusto
- **Escalabilidade:** Arquitetura preparada para crescimento
- **Relatórios:** Análises detalhadas e exportações
- **Mobile-first:** Funcionamento perfeito em dispositivos móveis

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema, entre em contato através dos canais disponíveis na plataforma.

---

**OdontoSync** - Transformando a gestão odontológica com tecnologia moderna e eficiente.