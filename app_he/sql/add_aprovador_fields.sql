-- Script para adicionar campos de controle de aprovação/recusa na tabela PLANEJAMENTO_HE
-- Este script adiciona campos para registrar quem aprovou ou recusou cada solicitação

-- Adiciona campo para armazenar o email de quem aprovou/recusou
ALTER TABLE PLANEJAMENTO_HE
ADD COLUMN TRATADO_POR VARCHAR(255) NULL COMMENT 'Email do usuário que aprovou ou recusou a solicitação';

-- Adiciona campo para armazenar a data/hora do tratamento
ALTER TABLE PLANEJAMENTO_HE
ADD COLUMN DATA_TRATAMENTO DATETIME NULL COMMENT 'Data e hora em que a solicitação foi aprovada ou recusada';
