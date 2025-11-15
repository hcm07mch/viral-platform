-- 고객 관리 테이블 생성
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  place_id TEXT,
  place_url TEXT,
  contact TEXT,
  -- 추가 필드들 (product_input_defs와 연동 가능하도록)
  extra_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_client_name ON customers(client_name);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_place_url ON customers(place_url);
CREATE INDEX IF NOT EXISTS idx_customers_extra_fields ON customers USING GIN (extra_fields);

-- RLS (Row Level Security) 활성화
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 고객만 조회 가능
CREATE POLICY "Users can view their own customers"
  ON customers
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 고객만 삽입 가능
CREATE POLICY "Users can insert their own customers"
  ON customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 고객만 수정 가능
CREATE POLICY "Users can update their own customers"
  ON customers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 고객만 삭제 가능
CREATE POLICY "Users can delete their own customers"
  ON customers
  FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 생성
CREATE TRIGGER trigger_update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- 코멘트 추가
COMMENT ON TABLE customers IS '대행사 사용자가 관리하는 고객사 정보';
COMMENT ON COLUMN customers.id IS '고유 식별자';
COMMENT ON COLUMN customers.user_id IS '대행사 사용자 ID';
COMMENT ON COLUMN customers.client_name IS '고객사 상호명 (field_key: client_name과 매핑)';
COMMENT ON COLUMN customers.place_id IS 'N사 플레이스 ID (field_key: place_id와 매핑)';
COMMENT ON COLUMN customers.place_url IS '플레이스 URL';
COMMENT ON COLUMN customers.contact IS '연락처 (전화번호 또는 이메일)';
COMMENT ON COLUMN customers.extra_fields IS '추가 필드 (JSONB) - product_input_defs의 field_key를 키로 사용';
COMMENT ON COLUMN customers.created_at IS '생성 일시';
COMMENT ON COLUMN customers.updated_at IS '수정 일시';
