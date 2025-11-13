-- =============================================
-- 포인트 시스템 테이블 생성 쿼리
-- =============================================

-- 1. profiles 테이블 (이미 존재할 수 있음 - 확인 후 실행)
-- 사용자 프로필 테이블에 balance 컬럼이 없다면 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS balance NUMERIC(10, 2) DEFAULT 0;

-- balance 컬럼에 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_balance ON profiles(balance);

-- 2. point_ledger 테이블 생성 (포인트 거래 내역)
CREATE TABLE IF NOT EXISTS point_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  -- 거래 유형: 'charge' (충전), 'deduct' (차감), 'refund' (환불), 'admin_adjust' (관리자 조정)
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('charge', 'deduct', 'refund', 'admin_adjust')),
  
  -- 거래 금액 (양수: 충전/환불, 음수: 차감)
  amount NUMERIC(10, 2) NOT NULL,
  
  -- 거래 후 잔액
  balance_after NUMERIC(10, 2) NOT NULL,
  
  -- 관련 주문 ID (주문으로 인한 차감인 경우)
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- 관련 충전 ID (충전인 경우)
  charge_id UUID,
  
  -- 메모/설명
  memo TEXT,
  
  -- 생성일
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- point_ledger 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_point_ledger_user_id ON point_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_point_ledger_order_id ON point_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_point_ledger_created_at ON point_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_ledger_transaction_type ON point_ledger(transaction_type);

-- =============================================
-- RLS (Row Level Security) 정책 설정
-- =============================================

-- point_ledger RLS 활성화
ALTER TABLE point_ledger ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 거래 내역만 조회 가능
CREATE POLICY "Users can view their own point ledger"
  ON point_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Service Role은 모든 작업 가능 (서버 사이드 API용)
CREATE POLICY "Service role can manage point ledger"
  ON point_ledger FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- 포인트 충전 트리거 함수 (선택사항)
-- =============================================

-- 포인트 거래 시 profiles.balance 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_profile_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- point_ledger에 INSERT될 때 profiles의 balance 업데이트
  UPDATE profiles
  SET balance = NEW.balance_after
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (point_ledger에 INSERT 시 자동으로 balance 업데이트)
DROP TRIGGER IF EXISTS trigger_update_profile_balance ON point_ledger;
CREATE TRIGGER trigger_update_profile_balance
  AFTER INSERT ON point_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_balance();

-- =============================================
-- 테스트 데이터 삽입 (선택사항)
-- =============================================

-- 예시: 특정 사용자에게 테스트 포인트 충전
-- 실제 사용 시 user_id를 본인의 UUID로 변경하세요
/*
INSERT INTO point_ledger (user_id, transaction_type, amount, balance_after, memo)
VALUES (
  'your-user-uuid-here',  -- 본인의 user_id로 변경
  'charge',
  100000,
  100000,
  '테스트 충전'
);
*/

-- =============================================
-- 유용한 쿼리들
-- =============================================

-- 1. 특정 사용자의 현재 잔액 확인
/*
SELECT 
  user_id,
  SUM(amount) as total_balance
FROM point_ledger
WHERE user_id = 'your-user-uuid-here'
GROUP BY user_id;
*/

-- 2. 특정 사용자의 최근 거래 내역 조회
/*
SELECT 
  transaction_type,
  amount,
  balance_after,
  memo,
  created_at
FROM point_ledger
WHERE user_id = 'your-user-uuid-here'
ORDER BY created_at DESC
LIMIT 10;
*/

-- 3. 모든 사용자의 포인트 잔액 현황
/*
SELECT 
  pl.user_id,
  p.email,
  SUM(pl.amount) as current_balance,
  COUNT(*) as transaction_count
FROM point_ledger pl
JOIN profiles p ON pl.user_id = p.user_id
GROUP BY pl.user_id, p.email
ORDER BY current_balance DESC;
*/

-- 4. 일별 포인트 충전/사용 통계
/*
SELECT 
  DATE(created_at) as date,
  transaction_type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM point_ledger
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), transaction_type
ORDER BY date DESC, transaction_type;
*/
