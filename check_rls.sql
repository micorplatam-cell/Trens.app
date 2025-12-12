-- Verificar RLS y políticas
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_assets';

-- Ver políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_assets';
