-- =============================================
-- point_ledger RLS 정책 수정
-- =============================================

-- 문제: API 라우트에서 point_ledger에 INSERT 시 RLS 위반
-- 원인: service_role만 INSERT 가능하도록 설정되어 있음
-- 해결: 서버 사이드 API가 INSERT 할 수 있도록 정책 추가

-- 1. 기존 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'point_ledger';

-- 2. 기존 service role 정책 삭제 (재생성을 위해)
DROP POLICY IF EXISTS "Service role can manage point ledger" ON point_ledger;

-- 3. 새로운 정책 생성: authenticated 사용자도 자신의 거래 내역 생성 가능
-- (단, 실제로는 API 라우트에서만 호출되어야 함)
CREATE POLICY "Users can insert their own point ledger"
  ON point_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Service Role은 모든 작업 가능
CREATE POLICY "Service role can manage all point ledger"
  ON point_ledger FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. 또는 authenticated 롤에 대한 INSERT 권한 추가 (더 안전)
-- 이 방법은 API 라우트가 authenticated 컨텍스트에서 실행될 때 작동
CREATE POLICY "API can insert point ledger"
  ON point_ledger FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. 최종 정책 확인
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'point_ledger'
ORDER BY cmd, policyname;

-- ===== 대안: RLS 우회 (트리거에서 사용) =====
-- 트리거 함수를 SECURITY DEFINER로 설정하면 RLS 우회 가능
-- update_profile_balance 함수는 이미 SECURITY DEFINER로 설정되어 있음

-- ===== 테스트 쿼리 =====
-- API 라우트에서 실행되는 것과 동일한 INSERT 테스트
/*
INSERT INTO point_ledger (
  user_id,
  transaction_type,
  amount,
  balance_after,
  order_id,
  memo
) VALUES (
  auth.uid(),  -- 현재 로그인한 사용자
  'deduct',
  -1000,
  99000,
  NULL,
  '테스트 차감'
);
*/
