-- =============================================
-- Realtime 완전 재설정
-- =============================================

-- 1. 기존 publication에서 제거 (있다면)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS order_item_messages;

-- 2. 다시 추가
ALTER PUBLICATION supabase_realtime ADD TABLE order_item_messages;

-- 3. 확인
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'order_item_messages';

-- 결과가 나와야 함:
-- schemaname: public
-- tablename: order_item_messages

-- 4. 모든 Realtime 테이블 확인
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
