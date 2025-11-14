-- =============================================
-- Realtime 디버깅 및 재설정
-- =============================================

-- 1. 현재 Realtime Publication 상태 확인
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 2. order_item_messages가 없다면 추가
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS order_item_messages;

-- 3. REPLICA IDENTITY 확인 및 설정
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

-- 4. REPLICA IDENTITY를 FULL로 설정 (UPDATE 시 old/new 값 모두 전송)
ALTER TABLE order_item_messages REPLICA IDENTITY FULL;

-- 5. RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'order_item_messages';

-- 6. Realtime을 위한 SELECT 정책이 있는지 확인
-- 없다면 추가 (Realtime은 SELECT 권한이 필요함)
DO $$ 
BEGIN
  -- 기존 public read 정책이 없다면 생성
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_item_messages' 
    AND policyname = 'Enable realtime for authenticated users'
  ) THEN
    CREATE POLICY "Enable realtime for authenticated users"
      ON order_item_messages FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 7. 최종 확인
SELECT 
  'Publication' as check_type,
  COUNT(*) as status,
  'order_item_messages should be in supabase_realtime publication' as note
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'order_item_messages'

UNION ALL

SELECT 
  'REPLICA IDENTITY' as check_type,
  CASE WHEN c.relreplident = 'f' THEN 1 ELSE 0 END as status,
  'Should be FULL for UPDATE events' as note
FROM pg_class c
WHERE c.relname = 'order_item_messages'

UNION ALL

SELECT 
  'RLS SELECT Policy' as check_type,
  COUNT(*) as status,
  'Need at least one SELECT policy' as note
FROM pg_policies 
WHERE tablename = 'order_item_messages' 
AND cmd = 'SELECT';

-- 8. Realtime 테스트를 위한 수동 메시지 삽입 (선택사항)
/*
-- 이 주석을 제거하고 실행하면 테스트 메시지 삽입
INSERT INTO order_item_messages (
  order_item_id,
  author_id,
  author_role,
  message,
  message_type
) VALUES (
  'YOUR_ORDER_ITEM_ID',  -- 실제 order_item_id로 변경
  'YOUR_USER_ID',        -- 실제 user_id로 변경
  'admin',
  'Realtime 테스트 메시지',
  'general'
);
*/
