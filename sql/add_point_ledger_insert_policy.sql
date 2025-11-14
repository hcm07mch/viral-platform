-- point_ledger INSERT 정책 추가
-- API가 포인트 충전 시 point_ledger에 INSERT 할 수 있도록 허용

-- 기존 정책이 있으면 삭제
DROP POLICY IF EXISTS "Users can insert their own point ledger" ON point_ledger;

-- 사용자는 자신의 포인트 내역을 생성할 수 있음 (API를 통해)
CREATE POLICY "Users can insert their own point ledger"
  ON point_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 정책 확인
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'point_ledger'
ORDER BY cmd, policyname;
