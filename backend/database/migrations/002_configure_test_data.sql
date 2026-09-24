UPDATE barbearia
SET horario_abertura = '09:00:00',
    horario_fechamento = '12:00:00',
    inicio_almoco = NULL,
    fim_almoco = NULL;

DELETE FROM servicos
WHERE NOT EXISTS (
  SELECT 1
  FROM agendamentos
  WHERE agendamentos.servico_id = servicos.id
);

INSERT INTO servicos (nome, descricao, preco, duracao_minutos)
SELECT 'Corte', 'Corte masculino', 35.00, 60
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Corte');

INSERT INTO servicos (nome, descricao, preco, duracao_minutos)
SELECT 'Barba', 'Barba', 15.00, 60
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Barba');