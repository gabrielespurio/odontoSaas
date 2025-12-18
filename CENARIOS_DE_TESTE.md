# OdontoSync - Cenários de Teste Completos

## Visão Geral do Sistema

O **OdontoSync** é um sistema de gestão odontológica SaaS multi-tenant com os seguintes módulos:

- Autenticação e Autorização
- Gestão de Empresas (Multi-tenancy)
- Gestão de Pacientes
- Agenda/Agendamentos
- Consultas/Atendimentos
- Prontuário Odontológico (Odontograma)
- Anamnese
- Procedimentos e Categorias
- Financeiro (Contas a Receber, Contas a Pagar, Fluxo de Caixa)
- Compras (Fornecedores, Pedidos de Compra, Recebimentos)
- Estoque (Categorias, Produtos, Movimentações)
- Relatórios
- Configurações (Usuários, Perfis, WhatsApp)

---

## 1. MÓDULO DE AUTENTICAÇÃO

### 1.1 Login

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| AUTH-001 | Login com credenciais válidas | Usuário cadastrado | 1. Acessar /login 2. Informar email e senha válidos 3. Clicar em "Entrar" | Redirecionado para dashboard, token JWT gerado |
| AUTH-002 | Login com email inválido | - | 1. Acessar /login 2. Informar email não cadastrado 3. Clicar em "Entrar" | Mensagem "Invalid credentials" |
| AUTH-003 | Login com senha incorreta | Usuário cadastrado | 1. Acessar /login 2. Informar email válido e senha errada 3. Clicar em "Entrar" | Mensagem "Invalid credentials" |
| AUTH-004 | Login com campos vazios | - | 1. Acessar /login 2. Deixar campos vazios 3. Clicar em "Entrar" | Mensagem de erro de validação |
| AUTH-005 | Login com usuário inativo | Usuário com isActive=false | 1. Tentar login com usuário inativo | Acesso negado |
| AUTH-006 | Forçar troca de senha | Usuário com forcePasswordChange=true | 1. Login com credenciais válidas | Redirecionado para tela de troca de senha obrigatória |

### 1.2 Troca de Senha

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| AUTH-007 | Trocar senha com sucesso | Usuário logado | 1. Acessar configurações 2. Informar senha atual e nova senha 3. Confirmar | Senha alterada, mensagem de sucesso |
| AUTH-008 | Trocar senha - senha atual incorreta | Usuário logado | 1. Informar senha atual errada 2. Tentar trocar | Erro "Current password is incorrect" |
| AUTH-009 | Trocar senha - nova senha curta | Usuário logado | 1. Informar nova senha < 6 caracteres | Erro de validação |
| AUTH-010 | Troca forçada de senha | Usuário com forcePasswordChange=true | 1. Após login, informar nova senha | Senha alterada, flag resetado |

---

## 2. MÓDULO DE EMPRESAS (MULTI-TENANCY)

### 2.1 Gestão de Empresas

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| COMP-001 | Listar empresas | Super Admin logado | 1. Acessar /companies | Lista de todas as empresas |
| COMP-002 | Criar empresa | Super Admin | 1. Clicar em Nova Empresa 2. Preencher dados 3. Salvar | Empresa criada com sucesso |
| COMP-003 | Editar empresa | Super Admin | 1. Selecionar empresa 2. Alterar dados 3. Salvar | Dados atualizados |
| COMP-004 | Desativar empresa | Super Admin | 1. Selecionar empresa 2. Definir isActive=false | Empresa desativada |
| COMP-005 | Validar CNPJ único | Super Admin | 1. Criar empresa com CNPJ já existente | Erro de duplicidade |
| COMP-006 | Isolamento de dados | Usuário de empresa A | 1. Listar pacientes | Ver apenas pacientes da empresa A |

### 2.2 Integração WhatsApp

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| WA-001 | Criar instância WhatsApp | Admin da empresa | 1. Configurações 2. Conectar WhatsApp | QR Code gerado |
| WA-002 | Conectar WhatsApp | QR Code gerado | 1. Escanear QR Code com celular | Status muda para "connected" |
| WA-003 | Verificar status conexão | - | 1. Acessar configurações WhatsApp | Ver status atual (connected/disconnected) |
| WA-004 | Enviar lembrete agendamento | WhatsApp conectado | 1. Criar agendamento com paciente com telefone | Mensagem enviada ao paciente |

---

## 3. MÓDULO DE PACIENTES

### 3.1 Cadastro de Pacientes

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| PAC-001 | Cadastrar paciente | Usuário logado | 1. Acessar /patients 2. Clicar "Novo Paciente" 3. Preencher dados 4. Salvar | Paciente cadastrado |
| PAC-002 | Cadastrar com CPF duplicado (mesma empresa) | Paciente com CPF existe | 1. Cadastrar paciente com mesmo CPF | Erro de duplicidade |
| PAC-003 | Cadastrar com CPF duplicado (outra empresa) | CPF existe em outra empresa | 1. Cadastrar paciente com mesmo CPF | Sucesso (CPF único por empresa) |
| PAC-004 | Editar paciente | Paciente existe | 1. Selecionar paciente 2. Alterar dados 3. Salvar | Dados atualizados |
| PAC-005 | Buscar paciente por nome | Pacientes cadastrados | 1. Usar campo de busca 2. Digitar nome parcial | Filtrar pacientes por nome |
| PAC-006 | Buscar paciente por CPF | Pacientes cadastrados | 1. Buscar por CPF | Encontrar paciente correto |
| PAC-007 | Desativar paciente | Paciente ativo | 1. Editar paciente 2. Definir inativo | Paciente não aparece em listas ativas |
| PAC-008 | Ver detalhes do paciente | Paciente existe | 1. Clicar no paciente | Ver página de detalhes com histórico |
| PAC-009 | Busca com CEP (auto-complete) | - | 1. Informar CEP válido | Endereço preenchido automaticamente |
| PAC-010 | Excluir paciente | Paciente sem vínculos | 1. Selecionar 2. Excluir | Paciente removido |

### 3.2 Prontuário do Paciente

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| PAC-011 | Adicionar nota clínica | Paciente existe | 1. Acessar detalhes 2. Adicionar nota | Nota salva no prontuário |
| PAC-012 | Ver histórico de consultas | Paciente com consultas | 1. Acessar detalhes do paciente | Ver lista de consultas anteriores |
| PAC-013 | Ver histórico financeiro | Paciente com pagamentos | 1. Acessar detalhes | Ver histórico de pagamentos |

---

## 4. MÓDULO DE ODONTOGRAMA

### 4.1 Gestão do Odontograma

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| ODO-001 | Visualizar odontograma | Paciente existe | 1. Acessar detalhes do paciente 2. Ver odontograma | Visualizar todos os dentes |
| ODO-002 | Marcar dente saudável | Odontograma aberto | 1. Selecionar dente 2. Marcar como saudável | Condição atualizada |
| ODO-003 | Marcar cárie | Odontograma aberto | 1. Selecionar dente 2. Marcar cárie | Dente marcado com cárie |
| ODO-004 | Marcar restauração | Odontograma aberto | 1. Selecionar dente 2. Marcar restauração | Condição atualizada |
| ODO-005 | Marcar extração | Odontograma aberto | 1. Selecionar dente 2. Marcar extração | Dente marcado como extraído |
| ODO-006 | Marcar tratamento planejado | Odontograma aberto | 1. Selecionar dente 2. Marcar tratamento planejado | Tratamento agendado |
| ODO-007 | Marcar tratamento concluído | Tratamento planejado existe | 1. Marcar como concluído | Status atualizado |
| ODO-008 | Adicionar observação ao dente | Odontograma aberto | 1. Selecionar dente 2. Adicionar nota | Observação salva |

---

## 5. MÓDULO DE ANAMNESE

### 5.1 Ficha de Anamnese

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| ANA-001 | Criar anamnese | Paciente sem anamnese | 1. Acessar paciente 2. Criar anamnese 3. Preencher | Anamnese salva |
| ANA-002 | Editar anamnese | Anamnese existe | 1. Acessar anamnese 2. Alterar dados 3. Salvar | Dados atualizados |
| ANA-003 | Registrar tratamento médico | Anamnese aberta | 1. Marcar "Em tratamento médico" 2. Descrever | Informação registrada |
| ANA-004 | Registrar medicamentos | Anamnese aberta | 1. Listar medicamentos em uso | Medicamentos salvos |
| ANA-005 | Registrar alergias | Anamnese aberta | 1. Informar alergias | Alergias registradas |
| ANA-006 | Registrar queixa de dor | Anamnese aberta | 1. Descrever queixa principal | Queixa salva |

---

## 6. MÓDULO DE AGENDA/AGENDAMENTOS

### 6.1 Gestão de Agendamentos

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| AGE-001 | Criar agendamento | Paciente e dentista existem | 1. Acessar agenda 2. Selecionar horário 3. Preencher dados | Agendamento criado, WhatsApp enviado |
| AGE-002 | Criar agendamento com conflito | Horário ocupado | 1. Tentar agendar mesmo horário/dentista | Erro de conflito de horário |
| AGE-003 | Editar agendamento | Agendamento existe | 1. Selecionar 2. Alterar dados 3. Salvar | Dados atualizados |
| AGE-004 | Cancelar agendamento | Agendamento existe | 1. Selecionar 2. Cancelar | Status = cancelado |
| AGE-005 | Visualizar agenda por dia | Agendamentos existem | 1. Selecionar data | Ver agendamentos do dia |
| AGE-006 | Visualizar agenda por semana | Agendamentos existem | 1. Selecionar visão semanal | Ver agendamentos da semana |
| AGE-007 | Filtrar por dentista | Vários dentistas | 1. Selecionar dentista no filtro | Ver apenas agendamentos do dentista |
| AGE-008 | Iniciar atendimento | Agendamento no status "agendado" | 1. Clicar em "Iniciar Atendimento" | Status muda para "em_atendimento" |
| AGE-009 | Verificar disponibilidade | - | 1. Consultar disponibilidade de horário | Retornar horários livres |
| AGE-010 | Agendamentos sem consulta | Agendamentos confirmados | 1. Ver lista de agendamentos pendentes | Listar agendamentos sem consulta vinculada |

### 6.2 Controle de Acesso por Escopo

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| AGE-011 | Dentista com escopo "own" | Usuário dentista dataScope=own | 1. Acessar agenda | Ver apenas seus próprios agendamentos |
| AGE-012 | Recepcionista com escopo "all" | Usuário recepção dataScope=all | 1. Acessar agenda | Ver todos os agendamentos da clínica |

---

## 7. MÓDULO DE CONSULTAS/ATENDIMENTOS

### 7.1 Gestão de Consultas

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| CON-001 | Iniciar consulta via agendamento | Agendamento confirmado | 1. Clicar "Iniciar Atendimento" | Consulta criada, vinculada ao agendamento |
| CON-002 | Criar consulta avulsa | Paciente existe | 1. Nova consulta 2. Selecionar paciente 3. Preencher | Consulta criada |
| CON-003 | Adicionar procedimentos à consulta | Consulta em andamento | 1. Selecionar procedimentos realizados | Procedimentos adicionados |
| CON-004 | Adicionar produtos utilizados | Consulta em andamento | 1. Adicionar produtos do estoque | Produtos vinculados, estoque atualizado |
| CON-005 | Registrar observações clínicas | Consulta em andamento | 1. Preencher campo de observações | Observações salvas |
| CON-006 | Finalizar consulta | Consulta em andamento | 1. Clicar "Concluir" | Status = concluído, agendamento sincronizado |
| CON-007 | Cancelar consulta | Consulta existe | 1. Cancelar consulta | Status = cancelado |
| CON-008 | Gerar número de atendimento | Nova consulta | 1. Criar consulta | Número único gerado automaticamente |
| CON-009 | Sincronizar status agendamento/consulta | Consulta finalizada | 1. Verificar agendamento vinculado | Agendamento também marcado como concluído |

---

## 8. MÓDULO DE PROCEDIMENTOS

### 8.1 Categorias de Procedimentos

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| PROC-001 | Criar categoria | Admin logado | 1. Acessar /procedures 2. Nova categoria 3. Salvar | Categoria criada |
| PROC-002 | Editar categoria | Categoria existe | 1. Selecionar 2. Editar 3. Salvar | Dados atualizados |
| PROC-003 | Categoria duplicada | Categoria com nome existe | 1. Criar categoria com mesmo nome | Erro de duplicidade |

### 8.2 Procedimentos

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| PROC-004 | Criar procedimento | Categoria existe | 1. Novo procedimento 2. Preencher dados 3. Salvar | Procedimento criado |
| PROC-005 | Editar procedimento | Procedimento existe | 1. Selecionar 2. Editar 3. Salvar | Dados atualizados |
| PROC-006 | Definir preço do procedimento | Novo procedimento | 1. Informar valor | Preço salvo |
| PROC-007 | Definir duração | Novo procedimento | 1. Informar duração em minutos | Duração salva |
| PROC-008 | Desativar procedimento | Procedimento ativo | 1. Editar 2. Desativar | Não aparece em seleções |
| PROC-009 | Filtrar por categoria | Procedimentos cadastrados | 1. Selecionar categoria | Ver apenas procedimentos da categoria |
| PROC-010 | Buscar procedimento | Procedimentos cadastrados | 1. Digitar nome na busca | Filtrar resultados |

---

## 9. MÓDULO FINANCEIRO

### 9.1 Contas a Receber

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| FIN-001 | Gerar conta a receber de consulta | Consulta finalizada | 1. Gerar financeiro da consulta | Conta a receber criada |
| FIN-002 | Criar conta a receber manual | - | 1. Nova conta 2. Selecionar paciente 3. Definir valores | Conta criada |
| FIN-003 | Parcelar conta a receber | Nova conta | 1. Definir número de parcelas | Parcelas geradas |
| FIN-004 | Registrar pagamento | Conta pendente | 1. Marcar como pago 2. Informar método | Status = paid, data registrada |
| FIN-005 | Cancelar conta a receber | Conta pendente | 1. Cancelar conta | Status = cancelled |
| FIN-006 | Filtrar por status | Contas existem | 1. Selecionar "Pendentes" | Ver apenas pendentes |
| FIN-007 | Filtrar por período | Contas existem | 1. Selecionar datas | Filtrar por vencimento |
| FIN-008 | Listar contas vencidas | Contas vencidas existem | 1. Filtrar vencidas | Ver contas com status overdue |
| FIN-009 | Excluir conta a receber | Conta não paga | 1. Selecionar 2. Excluir | Conta removida |

### 9.2 Contas a Pagar

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| FIN-010 | Criar conta a pagar | Admin logado | 1. Nova despesa 2. Preencher dados | Conta criada |
| FIN-011 | Categorizar despesa | Nova despesa | 1. Selecionar categoria (aluguel, salários, materiais...) | Categoria salva |
| FIN-012 | Registrar pagamento de despesa | Conta pendente | 1. Marcar como paga | Status atualizado |
| FIN-013 | Anexar comprovante | Conta existe | 1. Upload de arquivo | Comprovante anexado |
| FIN-014 | Despesa do dentista | Nova despesa | 1. Selecionar tipo "dentista" 2. Selecionar dentista | Despesa vinculada ao dentista |
| FIN-015 | Despesa da clínica | Nova despesa | 1. Selecionar tipo "clínica" | Despesa geral da clínica |
| FIN-016 | Filtrar por categoria | Despesas existem | 1. Selecionar categoria | Ver despesas da categoria |
| FIN-017 | Excluir conta a pagar | Conta não paga | 1. Selecionar 2. Excluir | Conta removida |

### 9.3 Fluxo de Caixa

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| FIN-018 | Visualizar fluxo de caixa | Movimentações existem | 1. Acessar /financial-cashflow | Ver entradas e saídas |
| FIN-019 | Calcular saldo atual | Movimentações existem | 1. Ver saldo | Saldo = entradas - saídas |
| FIN-020 | Filtrar por período | Movimentações existem | 1. Selecionar datas | Ver movimentações do período |
| FIN-021 | Entrada automática de pagamento | Recebível pago | 1. Registrar pagamento | Entrada gerada automaticamente no fluxo |
| FIN-022 | Saída automática de pagamento | Despesa paga | 1. Registrar pagamento | Saída gerada automaticamente no fluxo |

### 9.4 Métricas Financeiras

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| FIN-023 | Ver receita total | Recebíveis pagos | 1. Acessar dashboard financeiro | Ver total de receitas |
| FIN-024 | Ver despesas totais | Despesas pagas | 1. Acessar dashboard | Ver total de despesas |
| FIN-025 | Ver lucro líquido | Movimentações existem | 1. Acessar dashboard | Lucro = receitas - despesas |
| FIN-026 | Comparativo mensal | Dados de vários meses | 1. Acessar relatórios | Comparar receitas/despesas por mês |

---

## 10. MÓDULO DE COMPRAS

### 10.1 Fornecedores

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| COMP-001 | Cadastrar fornecedor | Admin logado | 1. Acessar /suppliers 2. Novo fornecedor 3. Preencher | Fornecedor criado |
| COMP-002 | Editar fornecedor | Fornecedor existe | 1. Selecionar 2. Editar 3. Salvar | Dados atualizados |
| COMP-003 | Desativar fornecedor | Fornecedor ativo | 1. Editar 2. Desativar | Não aparece em seleções |
| COMP-004 | CNPJ único por empresa | CNPJ já cadastrado | 1. Cadastrar com mesmo CNPJ | Erro de duplicidade |
| COMP-005 | Excluir fornecedor | Fornecedor sem pedidos | 1. Selecionar 2. Excluir | Fornecedor removido |

### 10.2 Pedidos de Compra

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| PO-001 | Criar pedido de compra | Fornecedor existe | 1. Novo pedido 2. Selecionar fornecedor 3. Adicionar itens | Pedido criado (status: draft) |
| PO-002 | Adicionar itens ao pedido | Pedido em rascunho | 1. Adicionar produtos 2. Definir quantidades | Itens adicionados |
| PO-003 | Vincular produto do estoque | Produto existe | 1. Selecionar produto existente | Item vinculado ao produto |
| PO-004 | Enviar pedido ao fornecedor | Pedido em rascunho | 1. Clicar "Enviar" | Status = sent |
| PO-005 | Confirmar pedido | Pedido enviado | 1. Marcar como confirmado | Status = confirmed |
| PO-006 | Cancelar pedido | Pedido não recebido | 1. Cancelar | Status = cancelled |
| PO-007 | Definir parcelas | Novo pedido | 1. Definir número de parcelas (1-12) | Valor parcelado calculado |
| PO-008 | Gerar número único | Novo pedido | 1. Criar pedido | Número PO-YYYY-NNNN gerado |
| PO-009 | Excluir pedido | Pedido em rascunho | 1. Selecionar 2. Excluir | Pedido removido |

### 10.3 Recebimentos

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| REC-001 | Criar recebimento | Pedido confirmado | 1. Receber pedido 2. Informar quantidades | Recebimento criado |
| REC-002 | Recebimento parcial | Pedido confirmado | 1. Informar quantidade < pedida | Status = partial |
| REC-003 | Recebimento completo | Pedido confirmado | 1. Informar quantidade = pedida | Status = received |
| REC-004 | Atualizar estoque | Recebimento concluído | 1. Confirmar recebimento | Produtos adicionados ao estoque |
| REC-005 | Gerar contas a pagar | Recebimento concluído | 1. Receber pedido com pagamento | Contas a pagar geradas |
| REC-006 | Cancelar recebimento | Recebimento pendente | 1. Cancelar | Status = cancelled |

---

## 11. MÓDULO DE ESTOQUE

### 11.1 Categorias de Produtos

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| EST-001 | Criar categoria | Admin logado | 1. Acessar /stock-categories 2. Nova categoria | Categoria criada |
| EST-002 | Editar categoria | Categoria existe | 1. Selecionar 2. Editar | Dados atualizados |
| EST-003 | Categoria única por empresa | Nome já existe | 1. Criar com mesmo nome | Erro de duplicidade |

### 11.2 Produtos

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| EST-004 | Cadastrar produto | Categoria existe | 1. Acessar /stock-products 2. Novo produto | Produto criado |
| EST-005 | Definir estoque mínimo | Novo produto | 1. Informar quantidade mínima | Alerta quando abaixo |
| EST-006 | Definir unidade de medida | Novo produto | 1. Selecionar unidade (un, kg, ml...) | Unidade salva |
| EST-007 | SKU único | Produto com SKU existe | 1. Cadastrar com mesmo SKU | Erro de duplicidade |
| EST-008 | Editar produto | Produto existe | 1. Selecionar 2. Editar | Dados atualizados |
| EST-009 | Desativar produto | Produto ativo | 1. Editar 2. Desativar | Produto inativo |
| EST-010 | Filtrar por categoria | Produtos existem | 1. Selecionar categoria | Ver produtos da categoria |
| EST-011 | Buscar produto | Produtos existem | 1. Digitar nome/SKU | Filtrar resultados |

### 11.3 Movimentações de Estoque

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| EST-012 | Entrada manual | Produto existe | 1. Nova movimentação 2. Tipo: entrada | Quantidade adicionada |
| EST-013 | Saída manual | Produto com estoque | 1. Nova movimentação 2. Tipo: saída | Quantidade subtraída |
| EST-014 | Saída por consulta | Consulta com produtos | 1. Usar produto na consulta | Estoque reduzido automaticamente |
| EST-015 | Entrada por recebimento | Recebimento concluído | 1. Confirmar recebimento | Estoque aumentado automaticamente |
| EST-016 | Registrar motivo | Nova movimentação | 1. Informar razão (compra, venda, perda...) | Motivo registrado |
| EST-017 | Vincular documento | Nova movimentação | 1. Informar documento de referência | Documento vinculado |
| EST-018 | Histórico de movimentações | Movimentações existem | 1. Ver histórico do produto | Listar todas as movimentações |
| EST-019 | Alerta estoque baixo | Produto abaixo do mínimo | 1. Verificar alertas | Produto destacado |

---

## 12. MÓDULO DE RELATÓRIOS

### 12.1 Relatórios Gerais

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| REL-001 | Relatório de visão geral | Dados existem | 1. Acessar /reports | Ver métricas gerais |
| REL-002 | Relatório financeiro | Movimentações existem | 1. Selecionar relatório financeiro | Ver receitas e despesas |
| REL-003 | Relatório de agendamentos | Agendamentos existem | 1. Selecionar relatório de agenda | Ver estatísticas de agendamentos |
| REL-004 | Relatório de procedimentos | Consultas existem | 1. Selecionar relatório de procedimentos | Ver procedimentos mais realizados |
| REL-005 | Filtrar por período | Dados existem | 1. Selecionar datas inicial e final | Filtrar resultados |
| REL-006 | Filtrar por dentista | Vários dentistas | 1. Selecionar dentista | Ver dados do dentista |

---

## 13. MÓDULO DE CONFIGURAÇÕES

### 13.1 Gestão de Usuários

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| USR-001 | Criar usuário | Admin logado | 1. Acessar configurações 2. Novo usuário | Usuário criado |
| USR-002 | Definir perfil/role | Novo usuário | 1. Selecionar perfil (Admin, Dentista, Recepção) | Perfil atribuído |
| USR-003 | Definir escopo de dados | Novo usuário | 1. Selecionar "all" ou "own" | Escopo definido |
| USR-004 | Forçar troca de senha | Novo usuário | 1. Marcar "Forçar troca de senha" | Flag ativado |
| USR-005 | Editar usuário | Usuário existe | 1. Selecionar 2. Editar | Dados atualizados |
| USR-006 | Desativar usuário | Usuário ativo | 1. Editar 2. Desativar | Usuário não consegue logar |
| USR-007 | Excluir usuário | Usuário existe | 1. Selecionar 2. Excluir | Usuário removido |
| USR-008 | Email único por empresa | Email já cadastrado | 1. Criar usuário com mesmo email | Erro de duplicidade |

### 13.2 Perfis de Acesso

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| PERF-001 | Criar perfil personalizado | Admin logado | 1. Acessar perfis 2. Novo perfil | Perfil criado |
| PERF-002 | Definir módulos do perfil | Novo perfil | 1. Selecionar módulos permitidos | Módulos salvos |
| PERF-003 | Editar perfil | Perfil existe | 1. Selecionar 2. Editar | Dados atualizados |
| PERF-004 | Nome único por empresa | Nome já existe | 1. Criar com mesmo nome | Erro de duplicidade |

---

## 14. MÓDULO DASHBOARD

### 14.1 Métricas do Dashboard

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| DASH-001 | Ver agendamentos de hoje | Agendamentos existem | 1. Acessar dashboard | Ver quantidade de agendamentos do dia |
| DASH-002 | Ver pacientes ativos | Pacientes cadastrados | 1. Acessar dashboard | Ver total de pacientes ativos |
| DASH-003 | Ver receita do mês | Pagamentos no mês | 1. Acessar dashboard | Ver total de receitas |
| DASH-004 | Ver próximos agendamentos | Agendamentos futuros | 1. Acessar dashboard | Listar próximos agendamentos |
| DASH-005 | Ver consultas em andamento | Consultas ativas | 1. Acessar dashboard | Listar atendimentos em andamento |

---

## 15. FLUXOS DE INTEGRAÇÃO (END-TO-END)

### 15.1 Fluxo Completo de Atendimento

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| E2E-001 | Atendimento completo | 1. Cadastrar paciente 2. Criar agendamento 3. Iniciar consulta 4. Realizar procedimentos 5. Finalizar consulta 6. Gerar financeiro 7. Registrar pagamento | Fluxo completo sem erros |

### 15.2 Fluxo Completo de Compras

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| E2E-002 | Compra completa | 1. Cadastrar fornecedor 2. Criar pedido de compra 3. Adicionar itens 4. Enviar pedido 5. Receber produtos 6. Confirmar entrada no estoque | Estoque atualizado, financeiro gerado |

### 15.3 Fluxo de Multi-Tenancy

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| E2E-003 | Isolamento de dados | 1. Criar empresa A 2. Criar dados em A 3. Criar empresa B 4. Logar em B | Empresa B não vê dados de A |

---

## 16. TESTES DE SEGURANÇA

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| SEC-001 | Acesso sem token | 1. Fazer requisição API sem Authorization header | Erro 401 |
| SEC-002 | Token expirado | 1. Usar token expirado | Erro 403 |
| SEC-003 | Acesso cross-company | 1. Tentar acessar dados de outra empresa | Erro 403 |
| SEC-004 | Injeção SQL | 1. Tentar SQL injection em campos | Requisição sanitizada, sem erro |
| SEC-005 | XSS | 1. Inserir script em campos de texto | Script escapado |

---

## 17. TESTES DE PERFORMANCE

| ID | Cenário | Critério de Aceite |
|----|---------|-------------------|
| PERF-001 | Tempo de login | < 2 segundos |
| PERF-002 | Carregamento do dashboard | < 3 segundos |
| PERF-003 | Listagem de pacientes (1000+) | < 2 segundos com paginação |
| PERF-004 | Busca de pacientes | < 1 segundo |
| PERF-005 | Geração de relatórios | < 5 segundos |

---

## Legenda de Status

- **Pendente**: Teste ainda não executado
- **Passou**: Teste executado com sucesso
- **Falhou**: Teste executado com falha
- **Bloqueado**: Teste não pode ser executado por dependência

---

## Instruções de Uso

1. Execute cada cenário de teste seguindo os passos descritos
2. Marque o status após execução
3. Documente evidências de falhas
4. Priorize correção de falhas críticas
5. Re-execute testes após correções

---

---

## 18. TESTES DE SEGURANÇA AVANÇADOS

### 18.1 Rotas de Debug Expostas (CRITICO)

| ID | Cenário | Rota | Resultado Esperado |
|----|---------|------|-------------------|
| SEC-006 | Debug users sem auth | GET /debug/users | DEVE retornar 401 em produção |
| SEC-007 | Debug receivables sem auth | GET /debug/receivables | DEVE retornar 401 em produção |
| SEC-008 | Debug timezone sem auth | GET /api/timezone-debug | DEVE retornar 401 em produção |
| SEC-009 | Debug dentists sem auth | GET /api/debug/dentists | DEVE retornar 401 em produção |
| SEC-010 | Debug users API sem auth | GET /api/debug/users | DEVE retornar 401 em produção |
| SEC-011 | Debug today sem auth | GET /api/debug/today | DEVE retornar 401 em produção |
| SEC-012 | Debug create-tables sem auth | POST /api/debug/create-tables | DEVE retornar 401 em produção |
| SEC-013 | Debug receivables-investigation | GET /api/debug/receivables-investigation | DEVE retornar 401 em produção |
| SEC-014 | Debug dentists-no-auth | GET /api/debug/dentists-no-auth | DEVE retornar 401 em produção |
| SEC-015 | Debug appointments-today | GET /api/debug/appointments-today | DEVE retornar 401 em produção |

### 18.2 Proteção JWT

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| SEC-016 | Token JWT expirado | 1. Usar token com mais de 24h | Erro 403 "Invalid token" |
| SEC-017 | Token JWT malformado | 1. Enviar token inválido no header | Erro 403 |
| SEC-018 | Token JWT de outro sistema | 1. Usar JWT assinado com outra chave | Erro 403 |
| SEC-019 | Renovação de token | 1. Fazer login novamente antes de expirar | Novo token válido gerado |
| SEC-020 | Brute force login | 1. Tentar 10+ logins com senha errada | Bloquear temporariamente (se implementado) |

### 18.3 Isolamento Multi-Tenant

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| SEC-021 | Acessar paciente de outra empresa | 1. Logar empresa A 2. GET /api/patients/:id de empresa B | Erro 403 ou 404 |
| SEC-022 | Editar paciente de outra empresa | 1. Logar empresa A 2. PUT /api/patients/:id de empresa B | Erro 403 |
| SEC-023 | Acessar agendamento de outra empresa | 1. Forjar companyId diferente na requisição | Dados filtrados pelo backend |
| SEC-024 | Criar dados em outra empresa | 1. Enviar companyId diferente no body | Backend deve usar companyId do token |
| SEC-025 | Super Admin acessa todas empresas | 1. Logar como super admin (companyId=null) | Acesso a todas as empresas |
| SEC-026 | Admin regular limitado à empresa | 1. Logar como admin de empresa | Acesso apenas à própria empresa |

---

## 19. TESTES DE INTEGRAÇÃO WHATSAPP (AVANÇADOS)

### 19.1 Cenários de Erro WhatsApp

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| WA-005 | QR Code expirado | QR gerado há mais de 1 min | 1. Tentar escanear QR antigo | Erro, regenerar QR |
| WA-006 | Evolution API indisponível | Serviço Evolution API offline | 1. Criar instância | Erro tratado graciosamente |
| WA-007 | Falha ao enviar mensagem | WhatsApp conectado, rede instável | 1. Criar agendamento | Agendamento criado, falha de WhatsApp não bloqueia |
| WA-008 | Paciente sem telefone | Paciente sem número | 1. Criar agendamento | Agendamento criado sem envio de mensagem |
| WA-009 | Telefone inválido | Número malformado | 1. Tentar enviar mensagem | Erro tratado, agendamento mantido |
| WA-010 | Desconexão inesperada | WhatsApp desconectado | 1. Verificar status | Status atualizado para "disconnected" |
| WA-011 | Reconexão automática | Status disconnected | 1. Verificar se sistema tenta reconectar | Reconexão ou exibição de novo QR |

---

## 20. TESTES DE CONSISTÊNCIA ENTRE MÓDULOS

### 20.1 Agenda <-> Consulta

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| CONS-001 | Sincronização de status | 1. Iniciar consulta de agendamento 2. Finalizar consulta | Agendamento também marcado como "concluido" |
| CONS-002 | Cancelar consulta sincroniza agendamento | 1. Cancelar consulta vinculada | Agendamento também cancelado |
| CONS-003 | Agendamento sem consulta | 1. Listar agendamentos sem consulta | API retorna lista correta |

### 20.2 Consulta <-> Financeiro

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| CONS-004 | Gerar recebível de consulta | 1. Finalizar consulta 2. Chamar /api/receivables/from-consultation | Recebível criado com valor correto |
| CONS-005 | Parcelamento de consulta | 1. Gerar recebível com 3 parcelas | 3 registros de recebíveis criados |
| CONS-006 | Valor = soma dos procedimentos | 1. Consulta com 2 procedimentos | Valor total = soma dos preços |

### 20.3 Compras <-> Estoque

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| CONS-007 | Recebimento atualiza estoque | 1. Receber pedido de compra | Quantidade do produto aumentada |
| CONS-008 | Recebimento parcial | 1. Receber apenas 50% do pedido | Estoque parcial, pedido status "partial" |
| CONS-009 | Cancelar recebimento reverte estoque | 1. Cancelar recebimento confirmado | Estoque revertido (se implementado) |

### 20.4 Consulta <-> Estoque

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| CONS-010 | Produto usado na consulta | 1. Adicionar produto à consulta | Estoque diminuído |
| CONS-011 | Estoque insuficiente | 1. Tentar usar mais do que disponível | Erro ou alerta |

### 20.5 Fluxo de Caixa <-> Financeiro

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| CONS-012 | Pagamento gera entrada | 1. Registrar pagamento de recebível | Entrada criada no fluxo de caixa |
| CONS-013 | Pagamento de despesa gera saída | 1. Pagar conta a pagar | Saída criada no fluxo de caixa |
| CONS-014 | Saldo = entradas - saídas | 1. Verificar saldo atual | Cálculo correto |

---

## 21. FLUXOS E2E COMPLETOS (AVANÇADOS)

### 21.1 Onboarding Completo de Empresa

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| E2E-004 | Setup inicial da empresa | 1. Super admin cria empresa 2. Cria admin da empresa 3. Admin loga 4. Configura WhatsApp 5. Cria categorias de procedimentos 6. Cria procedimentos 7. Cria categorias de produtos 8. Cria produtos iniciais | Empresa totalmente configurada |

### 21.2 Ciclo Completo de Paciente

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| E2E-005 | Jornada do paciente | 1. Cadastrar paciente 2. Criar anamnese 3. Registrar odontograma inicial 4. Agendar consulta 5. WhatsApp enviado 6. Iniciar atendimento 7. Registrar procedimentos 8. Atualizar odontograma 9. Usar produtos do estoque 10. Finalizar consulta 11. Gerar financeiro 12. Registrar pagamento 13. Verificar fluxo de caixa | Todos os módulos integrados corretamente |

### 21.3 Ciclo Completo de Compras

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| E2E-006 | Compra até estoque | 1. Cadastrar fornecedor 2. Criar pedido de compra 3. Adicionar itens (produtos existentes) 4. Enviar pedido 5. Confirmar pedido 6. Receber produtos (total) 7. Verificar estoque atualizado 8. Verificar contas a pagar geradas 9. Pagar despesas 10. Verificar fluxo de caixa | Integração compras-estoque-financeiro OK |

### 21.4 Dashboard e Relatórios

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| E2E-007 | Dashboard reflete dados | 1. Criar agendamentos 2. Realizar consultas 3. Gerar financeiros 4. Verificar dashboard | Métricas corretas e atualizadas |
| E2E-008 | Relatórios precisos | 1. Gerar relatório financeiro 2. Comparar com dados inseridos | Valores batem com registros |

---

## 22. TESTES DE SCHEDULER/CRON

### 22.1 Lembretes Automáticos

| ID | Cenário | Pré-condição | Passos | Resultado Esperado |
|----|---------|--------------|--------|-------------------|
| CRON-001 | Lembrete diário às 8h | Agendamentos para o dia, WhatsApp conectado | 1. Aguardar 8h (ou simular) | Mensagens enviadas aos pacientes |
| CRON-002 | Sem agendamentos | Nenhum agendamento para o dia | 1. Executar scheduler | Nenhuma mensagem enviada |
| CRON-003 | WhatsApp desconectado | WhatsApp offline | 1. Executar scheduler | Erro tratado, logs gerados |
| CRON-004 | Teste manual de lembretes | Admin logado | 1. POST /api/test-reminders | Lembretes enviados imediatamente |

---

## 23. TESTES DE TIMEZONE

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| TZ-001 | Agendamento em fuso horário Brasil | 1. Criar agendamento às 14:00 Brasil | Salvo corretamente, exibido às 14:00 |
| TZ-002 | Listagem por data | 1. Listar agendamentos do dia | Respeitar timezone Brazil/Sao_Paulo |
| TZ-003 | Consulta no mesmo dia | 1. Verificar se consulta aparece no dia correto | Data correta considerando timezone |

---

## 24. TESTES DE LIMPEZA E MANUTENÇÃO

### 24.1 Endpoints de Manutenção

| ID | Cenário | Passos | Resultado Esperado |
|----|---------|--------|-------------------|
| MAINT-001 | Cancelar todos agendamentos | 1. POST /api/appointments/cancel-all | Todos marcados como cancelados |
| MAINT-002 | Limpar agendamentos cancelados | 1. POST /api/appointments/cleanup-cancelled | Registros removidos |
| MAINT-003 | Limpar agendamentos passados | 1. POST /api/appointments/cleanup-past | Agendamentos antigos removidos |
| MAINT-004 | Sincronizar status | 1. POST /api/sync-status | Status de consultas sincronizados com agendamentos |

---

## 25. TESTES DE APIs FINANCEIRAS ESPECÍFICAS

| ID | Rota | Cenário | Resultado Esperado |
|----|------|---------|-------------------|
| FIN-027 | GET /api/financial | Listar financeiros (deprecated) | Lista de registros |
| FIN-028 | POST /api/financial | Criar financeiro (deprecated) | Registro criado |
| FIN-029 | GET /api/financial-metrics | Métricas financeiras | Totais de receita, despesa, lucro |
| FIN-030 | GET /api/current-balance | Saldo atual | Valor correto do saldo |

---

## ALERTAS DE SEGURANÇA IDENTIFICADOS

### Rotas SEM Autenticação em Produção (RISCO ALTO)

As seguintes rotas estão expostas sem autenticação e devem ser protegidas ou removidas em produção:

1. `GET /debug/users` - Expõe todos os usuários
2. `GET /debug/receivables` - Expõe dados financeiros
3. `GET /api/debug/*` - Múltiplas rotas de debug
4. `GET /api/timezone-debug` - Expõe dados de agendamentos
5. `POST /api/debug/create-tables` - Permite criar tabelas

**Recomendação**: Desabilitar todas as rotas `/debug/` em produção ou adicionar autenticação.

---

*Documento gerado em: 18/12/2024*
*Sistema: OdontoSync v1.0*
*Versão do documento: 2.0 (expandido com cenários avançados)*
