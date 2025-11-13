-- =============================================
-- 주문 시스템 테이블 설계
-- =============================================

-- 1. profiles 테이블 (기존 테이블 - 참고용)
-- CREATE TABLE profiles (
--   user_id UUID PRIMARY KEY REFERENCES auth.users(id),
--   email TEXT,
--   balance NUMERIC(10, 2) DEFAULT 0,
--   tier TEXT DEFAULT 'basic',
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- 2. orders 테이블 (주문 정보)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  -- 상품 정보
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  
  -- 주문 상태: 'received' (접수중), 'pause' (보류), 'running' (구동중), 'done' (작업완료), 'cancelled' (취소), 'refunded' (환불)
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'pause', 'running', 'done', 'cancelled', 'refunded')),
  
  -- 가격 정보
  unit_price NUMERIC(10, 2) NOT NULL,  -- 단가
  quantity INTEGER NOT NULL,            -- 총 수량
  total_price NUMERIC(10, 2) NOT NULL,  -- 총 가격
  
  -- 주문 상세 정보 (JSON 형태)
  -- 예: {"client_name": "가게명", "keyword": "키워드", "daily_qty": 10, "weeks": 2, "region": "서울", "memo": "메모"}
  order_details JSONB NOT NULL DEFAULT '{}',
  
  -- 메타 정보
  user_tier TEXT,  -- 주문 당시 회원 등급
  
  -- 관리자 메모
  admin_memo TEXT,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,  -- 주문 확정 시각
  completed_at TIMESTAMP WITH TIME ZONE,  -- 주문 완료 시각
  cancelled_at TIMESTAMP WITH TIME ZONE  -- 주문 취소 시각
);

-- orders 인덱스
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- 3. point_ledger 테이블 (포인트 거래 내역)
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

-- point_ledger 인덱스
CREATE INDEX idx_point_ledger_user_id ON point_ledger(user_id);
CREATE INDEX idx_point_ledger_order_id ON point_ledger(order_id);
CREATE INDEX idx_point_ledger_created_at ON point_ledger(created_at DESC);

-- 4. order_items 테이블 (주문 항목 - 한 번에 여러 업체 주문 시)
-- 현재는 ProductDetail에서 여러 개의 주문을 한 번에 확정하는 구조이므로 필요
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- 개별 항목 정보
  client_name TEXT NOT NULL,  -- 업체명/키워드
  daily_qty INTEGER NOT NULL,  -- 일일 수량
  weeks INTEGER NOT NULL,      -- 주 수
  total_qty INTEGER NOT NULL,  -- 총 수량
  unit_price NUMERIC(10, 2) NOT NULL,  -- 단가
  item_price NUMERIC(10, 2) NOT NULL,  -- 항목별 가격
  
  -- 상세 정보 (JSON)
  item_details JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- order_items 인덱스
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- =============================================
-- 트리거 함수들
-- =============================================

-- orders 테이블 updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- =============================================
-- RLS (Row Level Security) 정책
-- =============================================

-- point_ledger RLS
ALTER TABLE point_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own point ledger"
  ON point_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage point ledger"
  ON point_ledger FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- orders RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending orders"
  ON orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Service role can manage all orders"
  ON orders FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- order_items RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert order items for their orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage order items"
  ON order_items FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- 샘플 쿼리 (참고용)
-- =============================================

-- 주문 확정 시 실행할 트랜잭션 예시:
/*
BEGIN;

-- 1. orders 테이블에 주문 생성
INSERT INTO orders (user_id, product_id, product_name, unit_price, quantity, total_price, order_details, user_tier, status, confirmed_at)
VALUES (
  'user-uuid',
  1,
  '블로그 리뷰',
  100,
  140,
  14000,
  '{"items": [...]}',
  'premium',
  'confirmed',
  NOW()
) RETURNING id INTO order_id_var;

-- 2. order_items 테이블에 개별 항목들 추가
INSERT INTO order_items (order_id, client_name, daily_qty, weeks, total_qty, unit_price, item_price, item_details)
VALUES 
  (order_id_var, '가게1', 10, 2, 140, 100, 14000, '{"client_name": "가게1", ...}'),
  (order_id_var, '가게2', 5, 1, 35, 100, 3500, '{"client_name": "가게2", ...}');

-- 3. profiles의 balance 차감
UPDATE profiles
SET balance = balance - 14000
WHERE id = 'user-uuid'
RETURNING balance INTO new_balance;

-- 4. point_ledger에 차감 내역 기록
INSERT INTO point_ledger (user_id, transaction_type, amount, balance_after, order_id, memo)
VALUES (
  'user-uuid',
  'deduct',
  -14000,
  new_balance,
  order_id_var,
  '주문 확정: 블로그 리뷰 (2건)'
);

COMMIT;
*/
