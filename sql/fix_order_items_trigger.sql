-- =============================================
-- order_items 트리거 오류 수정
-- =============================================

-- 문제: order_items 테이블에 status 컬럼이 없어서 트리거 오류 발생
-- 해결: 트리거를 비활성화하거나 status 컬럼 추가

-- ===== 방법 1: 트리거만 비활성화 (임시 해결) =====
-- 주문 항목 레벨의 상태 추적이 필요없다면 이것만 실행
DROP TRIGGER IF EXISTS order_item_changes_trigger ON order_items;

-- ===== 방법 2: status 컬럼 추가 (권장) =====
-- 주문 항목별로 상태를 관리하고 싶다면 이 방법 사용

-- 1. 기존 트리거 삭제
DROP TRIGGER IF EXISTS order_item_changes_trigger ON order_items;

-- 2. order_items에 status 컬럼 추가
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'received' 
CHECK (status IN ('received', 'pause', 'running', 'done', 'cancelled', 'refunded'));

-- 3. status 컬럼 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

-- 4. 트리거 다시 생성
CREATE TRIGGER order_item_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION log_order_item_changes();

-- ===== 확인 쿼리 =====
-- order_items 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

-- 트리거 확인
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'order_items';
