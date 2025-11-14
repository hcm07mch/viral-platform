-- =============================================
-- Realtime을 위한 RLS 우회 설정
-- =============================================

-- 현재 RLS 정책 확인
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'order_item_messages';

-- ===== 해결 방법 1: Realtime을 위한 SELECT 정책 추가 (기존 정책 삭제 후 재생성) =====
-- postgres 롤(Realtime이 사용)이 모든 메시지를 읽을 수 있도록 허용

DROP POLICY IF EXISTS "Enable realtime for postgres role" ON order_item_messages;
CREATE POLICY "Enable realtime for postgres role"
  ON order_item_messages FOR SELECT
  TO postgres
  USING (true);

-- ===== 해결 방법 2: anon 롤에 대한 SELECT 허용 (더 안전) =====
DROP POLICY IF EXISTS "Enable realtime for anon" ON order_item_messages;
CREATE POLICY "Enable realtime for anon"
  ON order_item_messages FOR SELECT
  TO anon
  USING (true);

-- ===== 해결 방법 3: 모든 사용자에게 SELECT 허용 (가장 간단) =====
DROP POLICY IF EXISTS "Public read for realtime" ON order_item_messages;
CREATE POLICY "Public read for realtime"
  ON order_item_messages FOR SELECT
  USING (true);

-- ===== 확인 =====
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'order_item_messages';
