-- =============================================================================
-- ESQUEMA DO BANCO DE DADOS: SISTEMA DE AGENDAMENTO DE BARBEARIA
-- SGDB: PostgreSQL (Versão 12+)
-- =============================================================================

-- 1. EXTENSÕES ÚTEIS
-- Permite uso de UUIDs para identificadores mais seguros (opcional, mas recomendado)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPOS ENUMERADOS (ENUMS)
-- Define os status possíveis de um agendamento
CREATE TYPE status_agendamento AS ENUM (
    'pendente',
    'confirmado',
    'concluido',
    'cancelado'
);

-- =============================================================================
-- 3. CRIAÇÃO DAS TABELAS
-- =============================================================================

-- TABELA: CONFIGURAÇÕES DA BARBEARIA
-- Guarda parâmetros globais como horários de atendimento e pausas
CREATE TABLE barbearia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    horario_abertura TIME NOT NULL DEFAULT '09:00:00',
    horario_fechamento TIME NOT NULL DEFAULT '19:00:00',
    inicio_almoco TIME,
    fim_almoco TIME,
    dias_funcionamento INT[] NOT NULL DEFAULT '{1,2,3,4,5,6}', -- 0=Domingo, 1=Segunda, ..., 6=Sábado
    intervalo_slot_minutos INT NOT NULL DEFAULT 30,           -- Frequência dos slots (ex: de 30 em 30 min)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABELA: USUÁRIOS ADMIN (BARBEIRO)
-- Armazena as credenciais de acesso do barbeiro para o painel de controle
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABELA: SERVIÇOS
-- Tipos de cortes e procedimentos oferecidos, preço e duração estimada
CREATE TABLE servicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL CHECK (preco >= 0),
    duracao_minutos INT NOT NULL CHECK (duracao_minutos > 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABELA: CLIENTES
-- Cadastro simplificado do cliente para agendamento rápido
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) UNIQUE NOT NULL, -- Chave de identificação no agendamento público
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABELA: AGENDAMENTOS
-- Registro central dos horários marcados e bloqueios manuais da agenda
CREATE TABLE agendamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    servico_id UUID REFERENCES servicos(id) ON DELETE RESTRICT,
    data_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_hora_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    status status_agendamento NOT NULL DEFAULT 'confirmado',
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Validação básica de consistência de datas
    CONSTRAINT chk_horario_valido CHECK (data_hora_fim > data_hora_inicio)
);

-- =============================================================================
--  ÍNDICES DE ALTA PERFORMANCE
-- =============================================================================

-- Índice para acelerar a checagem de conflitos de horários em queries de busca de slots
-- Filtra apenas agendamentos ativos (não cancelados) para otimizar o tamanho do índice
CREATE INDEX idx_agendamentos_intervalo_ativo 
ON agendamentos (data_hora_inicio, data_hora_fim) 
WHERE status IN ('pendente', 'confirmado');

-- ÍNDICES DE CHAVES ESTRANGEIRAS E BUSCAS COMUNS
CREATE INDEX idx_agendamentos_cliente_id ON agendamentos(cliente_id);
CREATE INDEX idx_agendamentos_servico_id ON agendamentos(servico_id);
CREATE INDEX idx_clientes_telefone ON clientes(telefone);

-- =============================================================================
--  TRIGGER E FUNÇÃO PARA UPDATED_AT AUTOMÁTICO
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica o gatilho em todas as tabelas principais
CREATE TRIGGER trg_update_barbearia BEFORE UPDATE ON barbearia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_usuarios BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_servicos BEFORE UPDATE ON servicos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_clientes BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_agendamentos BEFORE UPDATE ON agendamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
--  DADOS INICIAIS DE EXEMPLO (SEED INICIAL)
-- =============================================================================

INSERT INTO barbearia (nome, telefone, horario_abertura, horario_fechamento, inicio_almoco, fim_almoco) 
VALUES ('Barbearia', '11999999999', '09:00:00', '12:00:00', NULL, NULL);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos) VALUES
('Corte', 'Corte masculino', 35.00, 60),
('Barba', 'Barba', 15.00, 60);