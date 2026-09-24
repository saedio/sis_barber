CREATE TABLE IF NOT EXISTS bloqueios_agenda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_inicio DATE,
    data_fim DATE,
    dia_semana INT CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME,
    hora_fim TIME,
    motivo TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_bloqueio_alvo CHECK (
        (data_inicio IS NOT NULL AND data_fim IS NOT NULL AND dia_semana IS NULL)
        OR (data_inicio IS NULL AND data_fim IS NULL AND dia_semana IS NOT NULL)
    ),
    CONSTRAINT chk_bloqueio_datas CHECK (data_fim IS NULL OR data_fim >= data_inicio),
    CONSTRAINT chk_bloqueio_horarios CHECK (
        (hora_inicio IS NULL AND hora_fim IS NULL)
        OR (hora_inicio IS NOT NULL AND hora_fim IS NOT NULL AND hora_fim > hora_inicio)
    )
);

CREATE INDEX IF NOT EXISTS idx_bloqueios_agenda_datas
ON bloqueios_agenda (data_inicio, data_fim)
WHERE ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_bloqueios_agenda_semana
ON bloqueios_agenda (dia_semana)
WHERE ativo = TRUE;
