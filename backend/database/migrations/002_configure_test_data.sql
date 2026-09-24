UPDATE barbearia
SET horario_abertura = '10:00:00',
    horario_fechamento = '19:30:00',
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
SELECT 'Barba', 'Barba', 25.00, 30
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Barba');

INSERT INTO servicos (nome, descricao, preco, duracao_minutos)
SELECT 'Combo completo', 'Corte + barba', 65.00, 90
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Combo completo');

INSERT INTO servicos (nome, descricao, preco, duracao_minutos)
SELECT 'Sombrancelha', 'Design de sombrancelha', 10.00, 20
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Sombrancelha');

INSERT INTO servicos (nome, descricao, preco, duracao_minutos)
SELECT 'Luzes', 'Luzes', 100.00, 90
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Luzes');

INSERT INTO servicos (nome, descricao, preco, duracao_minutos)
SELECT 'Nevou', 'Nevou', 135.00, 90
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Nevou');

INSERT INTO servicos (nome, descricao, preco, duracao_minutos)
SELECT 'Atendimento kids atípicos', 'Atendimento para crianças atípicas', 100.00, 60
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Atendimento kids atípicos');

UPDATE servicos SET preco = 35.00, duracao_minutos = 60 WHERE nome = 'Corte';
UPDATE servicos SET preco = 25.00, duracao_minutos = 30 WHERE nome = 'Barba';
UPDATE servicos SET preco = 65.00, duracao_minutos = 90 WHERE nome = 'Combo completo';
UPDATE servicos SET preco = 10.00, duracao_minutos = 20 WHERE nome = 'Sombrancelha';
UPDATE servicos SET preco = 100.00, duracao_minutos = 90 WHERE nome = 'Luzes';
UPDATE servicos SET preco = 135.00, duracao_minutos = 90 WHERE nome = 'Nevou';
UPDATE servicos SET preco = 100.00, duracao_minutos = 60 WHERE nome = 'Atendimento kids atípicos';
UPDATE servicos SET nome = 'Atendimento kids atípicos' WHERE nome LIKE 'Atendimento kids at%' OR nome LIKE 'Atendimento kids at%';