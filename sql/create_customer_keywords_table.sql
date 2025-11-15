-- customer_keywords 테이블 생성
CREATE TABLE IF NOT EXISTS customer_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_customer_keywords_customer_id ON customer_keywords(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_keywords_keyword ON customer_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_customer_keywords_created_at ON customer_keywords(created_at DESC);

-- 중복 방지를 위한 유니크 제약 조건
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_keywords_unique 
  ON customer_keywords(customer_id, LOWER(keyword));

-- RLS (Row Level Security) 활성화
ALTER TABLE customer_keywords ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 고객 키워드만 조회 가능
CREATE POLICY "Users can view their own customer keywords"
  ON customer_keywords
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_keywords.customer_id
        AND customers.user_id = auth.uid()
    )
  );

-- RLS 정책: 사용자는 자신의 고객 키워드만 삽입 가능
CREATE POLICY "Users can insert their own customer keywords"
  ON customer_keywords
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_keywords.customer_id
        AND customers.user_id = auth.uid()
    )
  );

-- RLS 정책: 사용자는 자신의 고객 키워드만 삭제 가능
CREATE POLICY "Users can delete their own customer keywords"
  ON customer_keywords
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_keywords.customer_id
        AND customers.user_id = auth.uid()
    )
  );

-- 코멘트 추가
COMMENT ON TABLE customer_keywords IS '고객별 검색 키워드 관리';
COMMENT ON COLUMN customer_keywords.id IS '고유 식별자';
COMMENT ON COLUMN customer_keywords.customer_id IS '고객 ID';
COMMENT ON COLUMN customer_keywords.keyword IS '검색 키워드';
COMMENT ON COLUMN customer_keywords.created_at IS '생성 일시';
