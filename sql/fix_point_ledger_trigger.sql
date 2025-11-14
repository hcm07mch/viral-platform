-- =============================================
-- 포인트 차감 내역 누락 문제 수정
-- =============================================

-- 문제: point_ledger에 INSERT 시 balance_after를 수동으로 계산하고 있음
-- 해결: balance_after를 자동 계산하는 트리거 추가 (선택사항)

-- ===== 방법 1: 현재 방식 유지 (권장) =====
-- API에서 balance_after를 계산하고, 트리거는 profiles.balance만 업데이트

-- 트리거 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'point_ledger';

-- update_profile_balance 트리거가 있는지 확인
-- 이 트리거는 point_ledger INSERT 시 profiles.balance를 자동 업데이트

-- ===== 방법 2: balance_after 자동 계산 트리거 추가 (선택사항) =====
-- 이 방법을 사용하면 API에서 balance_after를 계산할 필요 없음

CREATE OR REPLACE FUNCTION calculate_balance_after()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_balance NUMERIC(10, 2);
BEGIN
  -- 이전 거래의 balance_after 조회 (같은 사용자, 현재보다 이전 시간)
  SELECT balance_after INTO v_previous_balance
  FROM point_ledger
  WHERE user_id = NEW.user_id
    AND created_at < NEW.created_at
  ORDER BY created_at DESC
  LIMIT 1;

  -- 이전 거래가 없으면 profiles의 현재 balance 사용
  IF v_previous_balance IS NULL THEN
    SELECT balance INTO v_previous_balance
    FROM profiles
    WHERE user_id = NEW.user_id;
  END IF;

  -- balance_after가 NULL이거나 0이면 자동 계산
  IF NEW.balance_after IS NULL OR NEW.balance_after = 0 THEN
    NEW.balance_after := COALESCE(v_previous_balance, 0) + NEW.amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (BEFORE INSERT)
DROP TRIGGER IF EXISTS trigger_calculate_balance_after ON point_ledger;
CREATE TRIGGER trigger_calculate_balance_after
  BEFORE INSERT ON point_ledger
  FOR EACH ROW
  EXECUTE FUNCTION calculate_balance_after();

-- ===== 테스트 쿼리 =====

-- 1. 현재 포인트 거래 내역 확인
SELECT 
  user_id,
  transaction_type,
  amount,
  balance_after,
  memo,
  created_at
FROM point_ledger
ORDER BY created_at DESC
LIMIT 10;

-- 2. 사용자별 point_ledger 합계와 profiles.balance 비교
SELECT 
  pl.user_id,
  p.balance as profile_balance,
  SUM(pl.amount) as ledger_sum,
  (SELECT balance_after FROM point_ledger WHERE user_id = pl.user_id ORDER BY created_at DESC LIMIT 1) as latest_balance_after,
  CASE 
    WHEN p.balance = (SELECT balance_after FROM point_ledger WHERE user_id = pl.user_id ORDER BY created_at DESC LIMIT 1) 
    THEN '✅ 일치'
    ELSE '❌ 불일치'
  END as status
FROM point_ledger pl
JOIN profiles p ON p.user_id = pl.user_id
GROUP BY pl.user_id, p.balance;

-- 3. 주문별 포인트 차감 내역 확인
SELECT 
  pl.order_id,
  o.product_name,
  o.total_price,
  pl.amount,
  pl.balance_after,
  pl.memo,
  pl.created_at
FROM point_ledger pl
LEFT JOIN orders o ON o.id = pl.order_id
WHERE pl.transaction_type = 'deduct'
ORDER BY pl.created_at DESC;

-- ===== 불일치 수정 (필요 시) =====

-- profiles.balance를 point_ledger의 최신 balance_after로 동기화
UPDATE profiles p
SET balance = (
  SELECT balance_after 
  FROM point_ledger 
  WHERE user_id = p.user_id 
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM point_ledger WHERE user_id = p.user_id
);
