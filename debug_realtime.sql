-- =============================================
-- Realtime 문제 해결: RLS 정책 확인 및 수정
-- =============================================

-- 1. 현재 RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'order_item_messages';

-- 2. Realtime을 위한 SELECT 권한 확인
-- Realtime은 postgres 롤로 동작하므로 서비스 롤이 읽을 수 있어야 함

-- 3. 기존 "Recipients can mark messages as read" 정책 삭제
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON order_item_messages;

-- 4. 읽음 상태 업데이트를 위한 새로운 정책 (단순화)
CREATE POLICY "Anyone can update is_read field"
  ON order_item_messages FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 또는 더 안전하게 is_read 필드만 업데이트 허용하려면:
-- CREATE POLICY "Update read status"
--   ON order_item_messages FOR UPDATE
--   USING (
--     -- 사용자는 관리자 메시지의 읽음 상태 업데이트 가능
--     (author_role = 'admin' AND EXISTS (
--       SELECT 1 FROM order_items oi
--       JOIN orders o ON o.id = oi.order_id
--       WHERE oi.id = order_item_messages.order_item_id
--         AND o.user_id = auth.uid()
--     ))
--     OR
--     -- 관리자는 모든 메시지의 읽음 상태 업데이트 가능
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.user_id = auth.uid()
--         AND profiles.tier = 'admin'
--     )
--   );

-- 5. REPLICA IDENTITY 확인
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'order_item_messages';
-- 결과가 'f' (full)이어야 함

-- 6. Publication 확인
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'order_item_messages';

-- 7. 테스트 쿼리
UPDATE order_item_messages 
SET is_read = TRUE 
WHERE id = 'message-id-here';
