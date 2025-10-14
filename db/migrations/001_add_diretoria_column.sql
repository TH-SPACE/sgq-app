-- =====================================================
-- MIGRAÇÃO: Adicionar coluna DIRETORIA
-- Data: 2025-10-14
-- Descrição: Adiciona coluna DIRETORIA nas tabelas necessárias
-- =====================================================

-- 1. Adicionar coluna DIRETORIA na tabela COLABORADORES_CW
ALTER TABLE COLABORADORES_CW
ADD COLUMN DIRETORIA VARCHAR(50) DEFAULT 'ENGENHARIA';

-- 2. Atualizar todos os registros existentes para ENGENHARIA
UPDATE COLABORADORES_CW
SET DIRETORIA = 'ENGENHARIA'
WHERE DIRETORIA IS NULL;

-- 3. Criar índice para melhor performance
CREATE INDEX idx_diretoria ON COLABORADORES_CW(DIRETORIA);

-- 4. Atualizar perfis dos usuários HE existentes de HE_USER para HE_ENGENHARIA
UPDATE users_thanos
SET perfil = REPLACE(perfil, 'HE_USER', 'HE_ENGENHARIA')
WHERE perfil LIKE '%HE_USER%';

-- 5. (Opcional) Adicionar coluna DIRETORIA na tabela PLANEJAMENTO_HE para rastreabilidade
ALTER TABLE PLANEJAMENTO_HE
ADD COLUMN DIRETORIA VARCHAR(50) DEFAULT NULL;

-- 6. Criar índice na tabela PLANEJAMENTO_HE
CREATE INDEX idx_he_diretoria ON PLANEJAMENTO_HE(DIRETORIA);

-- =====================================================
-- VERIFICAÇÃO: Execute estes SELECTs para validar
-- =====================================================

-- Verificar estrutura da tabela COLABORADORES_CW
-- SHOW COLUMNS FROM COLABORADORES_CW LIKE 'DIRETORIA';

-- Verificar quantidade de registros por diretoria
-- SELECT DIRETORIA, COUNT(*) as TOTAL FROM COLABORADORES_CW GROUP BY DIRETORIA;

-- Verificar usuários HE (devem ter perfil HE_ENGENHARIA ou HE_IMPLANTACAO)
-- SELECT id, nome, email, perfil FROM users_thanos WHERE perfil LIKE '%HE_%';
