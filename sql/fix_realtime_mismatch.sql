-- =============================================
-- Realtime Mismatch 에러 해결
-- "mismatch between server and client bindings for postgres changes"
-- =============================================

-- 1. 먼저 publication에서 제거 (IF EXISTS는 지원하지 않음)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE order_item_messages;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 2. REPLICA IDENTITY를 FULL로 설정
-- FULL = 모든 컬럼 값을 포함 (UPDATE/DELETE 시 old 값 전달)
ALTER TABLE order_item_messages REPLICA IDENTITY FULL;

-- 3. 다시 publication에 추가
ALTER PUBLICATION supabase_realtime ADD TABLE order_item_messages;

-- 4. 확인: REPLICA IDENTITY 상태 체크
SELECT 
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class c
WHERE c.relname = 'order_item_messages';

-- 5. 확인: publication에 포함되었는지 체크
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'order_item_messages';

-- 6. 확인: 모든 컬럼 목록
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'order_item_messages'
ORDER BY ordinal_position;

-- 문제 해결 후 실행 권장:
-- 1. Supabase Dashboard에서 Database > Replication 확인
-- 2. order_item_messages 테이블이 활성화되어 있는지 확인
-- 3. 브라우저에서 개발자 도구 > Network 탭 > WS (WebSocket) 확인
-- 4. Realtime 연결 상태 확인
