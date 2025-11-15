-- customers 테이블에 place_url 컬럼 추가
ALTER TABLE customers ADD COLUMN IF NOT EXISTS place_url TEXT;

-- place_url 컬럼에 대한 설명 추가
COMMENT ON COLUMN customers.place_url IS '플레이스 URL (예: https://map.naver.com/p/entry/place/1654947922)';

-- place_url에 대한 인덱스 추가 (옵션)
CREATE INDEX IF NOT EXISTS idx_customers_place_url ON customers(place_url);
