-- orders 테이블의 status CHECK 제약조건 업데이트

-- 1. 기존 CHECK 제약조건 삭제
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. 기존 데이터 마이그레이션 (제약조건 추가 전에 먼저 실행)
UPDATE orders SET status = 'received' WHERE status = 'pending';
UPDATE orders SET status = 'received' WHERE status = 'confirmed';
UPDATE orders SET status = 'running' WHERE status = 'processing';
UPDATE orders SET status = 'done' WHERE status = 'completed';

-- 3. 새로운 CHECK 제약조건 추가
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('received', 'pause', 'running', 'done', 'cancelled', 'refunded'));
