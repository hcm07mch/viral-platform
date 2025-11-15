-- customers 테이블의 business_name 컬럼을 client_name으로 변경
ALTER TABLE customers RENAME COLUMN business_name TO client_name;

-- 인덱스 이름도 변경
DROP INDEX IF EXISTS idx_customers_business_name;
CREATE INDEX IF NOT EXISTS idx_customers_client_name ON customers(client_name);

-- 컬럼 코멘트 업데이트
COMMENT ON COLUMN customers.client_name IS '고객사 상호명 (field_key: client_name과 매핑)';
