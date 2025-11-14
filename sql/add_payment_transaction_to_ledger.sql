-- point_ledger 테이블에 payment_transaction_id 컬럼 추가
ALTER TABLE point_ledger
ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_point_ledger_payment_transaction_id 
ON point_ledger(payment_transaction_id);

COMMENT ON COLUMN point_ledger.payment_transaction_id IS '연관된 결제 거래 ID (충전 시에만 사용)';
