-- 결제 거래 테이블
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 결제 정보
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  point_amount INTEGER NOT NULL CHECK (point_amount > 0),
  
  -- 결제 상태
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  payment_method TEXT CHECK (payment_method IN ('card', 'bank', 'kakao', 'naver', 'toss', 'test')),
  
  -- PG사 연동 데이터 (나중에 사용)
  pg_provider TEXT, -- 'tosspayments', 'inicis', 'kakao', etc.
  pg_transaction_id TEXT UNIQUE, -- PG사에서 제공하는 거래 ID
  pg_payment_key TEXT, -- 결제 키
  pg_order_id TEXT, -- 주문 ID (merchant_uid)
  pg_response JSONB, -- PG사 응답 데이터 전체 저장
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- 메타데이터
  ip_address INET,
  user_agent TEXT,
  error_message TEXT
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_pg_transaction_id ON payment_transactions(pg_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- RLS 정책
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 결제 내역만 조회 가능
CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 사용자는 자신의 결제만 생성 가능
CREATE POLICY "Users can create own payment transactions"
  ON payment_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 결제만 업데이트 가능 (상태 변경 등)
CREATE POLICY "Users can update own payment transactions"
  ON payment_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 결제 내역 조회 가능
CREATE POLICY "Admins can view all payment transactions"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tier = 'admin'
    )
  );

-- 관리자는 모든 결제 업데이트 가능 (환불 처리 등)
CREATE POLICY "Admins can update all payment transactions"
  ON payment_transactions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tier = 'admin'
    )
  );

COMMENT ON TABLE payment_transactions IS '결제 거래 내역 테이블 - PG사 연동 준비';
COMMENT ON COLUMN payment_transactions.status IS 'pending: 대기중, completed: 완료, failed: 실패, cancelled: 취소, refunded: 환불';
COMMENT ON COLUMN payment_transactions.pg_provider IS 'PG사 제공자 (tosspayments, inicis, kakao 등)';
COMMENT ON COLUMN payment_transactions.pg_transaction_id IS 'PG사에서 제공하는 고유 거래 ID';
COMMENT ON COLUMN payment_transactions.pg_response IS 'PG사 응답 데이터 전체 (JSON 형태로 저장)';
