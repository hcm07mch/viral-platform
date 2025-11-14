-- =============================================
-- order_items 테이블에 status 컬럼 추가
-- (아직 없는 경우)
-- =============================================

-- status 컬럼 추가
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'received' 
CHECK (status IN ('received', 'pause', 'running', 'done', 'cancelled', 'refunded'));

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

-- =============================================
-- order_items의 updated_at 컬럼 추가 및 트리거
-- =============================================

-- updated_at 컬럼 추가
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_order_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_items_updated_at ON order_items;
CREATE TRIGGER trigger_update_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_items_updated_at();

-- =============================================
-- order_items에 product_id 추가 (있으면 스킵)
-- =============================================

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS product_id INTEGER;

-- =============================================
-- 기존 데이터 마이그레이션 (필요시)
-- =============================================

-- 기존 order_items에 status가 없는 경우 'received'로 설정
UPDATE order_items
SET status = 'received'
WHERE status IS NULL;

-- order_items의 product_id가 NULL인 경우 orders에서 복사
UPDATE order_items oi
SET product_id = o.product_id
FROM orders o
WHERE oi.order_id = o.id
  AND oi.product_id IS NULL;

-- =============================================
-- 검증 쿼리
-- =============================================

-- order_items 테이블 구조 확인
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'order_items'
-- ORDER BY ordinal_position;
