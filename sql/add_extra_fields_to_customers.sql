-- 기존 customers 테이블에 extra_fields 컬럼 추가
ALTER TABLE customers ADD COLUMN IF NOT EXISTS extra_fields JSONB DEFAULT '{}';

-- GIN 인덱스 추가 (JSONB 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_customers_extra_fields ON customers USING GIN (extra_fields);

-- 컬럼 코멘트 업데이트
COMMENT ON COLUMN customers.client_name IS '고객사 상호명 (field_key: client_name과 매핑)';
COMMENT ON COLUMN customers.place_id IS 'N사 플레이스 ID (field_key: place_id와 매핑)';
COMMENT ON COLUMN customers.extra_fields IS '추가 필드 (JSONB) - product_input_defs의 field_key를 키로 사용';

-- extra_fields 사용 예시:
/*
{
  "deadline": "2025-12-31",
  "special_notes": "주말 제외",
  "budget": "1000000",
  "target_area": "강남구"
}
*/
