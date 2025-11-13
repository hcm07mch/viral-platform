-- =============================================
-- Realtime 설정: order_item_messages 테이블
-- =============================================

-- 1. Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE order_item_messages;

-- 2. REPLICA IDENTITY 설정 (UPDATE 이벤트에서 모든 컬럼 포함)
ALTER TABLE order_item_messages REPLICA IDENTITY FULL;

-- 3. 확인 쿼리
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'order_item_messages';

-- 참고:
-- - supabase_realtime publication은 Supabase에서 기본 제공
-- - 테이블을 publication에 추가하면 INSERT, UPDATE, DELETE 이벤트가 실시간으로 전송됨
-- - REPLICA IDENTITY FULL: UPDATE 시 old와 new 값 모두 전송
-- - 클라이언트에서 구독하여 실시간 업데이트 받을 수 있음
