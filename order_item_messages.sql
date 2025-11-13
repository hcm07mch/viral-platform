-- =============================================
-- 주문 항목 메모/커뮤니케이션 테이블
-- =============================================

-- order_item_messages 테이블 (주문 항목별 메시지/메모)
CREATE TABLE IF NOT EXISTS order_item_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 주문 항목 참조
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  
  -- 작성자 정보
  author_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  author_role TEXT NOT NULL CHECK (author_role IN ('user', 'admin')),  -- 'user' or 'admin'
  
  -- 메시지 내용
  message TEXT NOT NULL,
  
  -- 메시지 타입 (선택사항)
  message_type TEXT DEFAULT 'general' CHECK (message_type IN ('general', 'question', 'request', 'notification', 'update')),
  
  -- 읽음 상태
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- 첨부 파일 (선택사항, JSON 배열)
  attachments JSONB DEFAULT '[]',
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_order_item_messages_item_id ON order_item_messages(order_item_id);
CREATE INDEX idx_order_item_messages_author_id ON order_item_messages(author_id);
CREATE INDEX idx_order_item_messages_created_at ON order_item_messages(created_at DESC);
CREATE INDEX idx_order_item_messages_is_read ON order_item_messages(is_read);

-- RLS (Row Level Security) 활성화
ALTER TABLE order_item_messages ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 주문 항목 메시지만 조회 가능
CREATE POLICY "Users can view their own order item messages"
  ON order_item_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_messages.order_item_id
        AND o.user_id = auth.uid()
    )
  );

-- RLS 정책: 관리자는 모든 메시지 조회 가능
CREATE POLICY "Admins can view all order item messages"
  ON order_item_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tier = 'admin'
    )
  );

-- RLS 정책: 사용자는 자신의 주문 항목에 메시지 작성 가능
CREATE POLICY "Users can insert messages on their order items"
  ON order_item_messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_messages.order_item_id
        AND o.user_id = auth.uid()
    )
  );

-- RLS 정책: 관리자는 모든 주문 항목에 메시지 작성 가능
CREATE POLICY "Admins can insert messages on any order item"
  ON order_item_messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tier = 'admin'
    )
  );

-- RLS 정책: 작성자는 자신의 메시지 수정 가능 (24시간 이내)
CREATE POLICY "Users can update their own messages within 24h"
  ON order_item_messages FOR UPDATE
  USING (
    author_id = auth.uid()
    AND created_at > NOW() - INTERVAL '24 hours'
  );

-- RLS 정책: 작성자는 자신의 메시지 삭제 가능
CREATE POLICY "Users can delete their own messages"
  ON order_item_messages FOR DELETE
  USING (
    author_id = auth.uid()
  );

-- RLS 정책: 관리자는 모든 메시지 수정 가능
CREATE POLICY "Admins can update any message"
  ON order_item_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tier = 'admin'
    )
  );

-- RLS 정책: 관리자는 모든 메시지 삭제 가능
CREATE POLICY "Admins can delete any message"
  ON order_item_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tier = 'admin'
    )
  );

-- RLS 정책: 읽음 상태 업데이트 (수신자만)
CREATE POLICY "Recipients can mark messages as read"
  ON order_item_messages FOR UPDATE
  USING (
    -- 사용자는 관리자 메시지를 읽음 처리
    (author_role = 'admin' AND EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_messages.order_item_id
        AND o.user_id = auth.uid()
    ))
    OR
    -- 관리자는 사용자 메시지를 읽음 처리
    (author_role = 'user' AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tier = 'admin'
    ))
  );

-- =============================================
-- 트리거: updated_at 자동 업데이트
-- =============================================

CREATE OR REPLACE FUNCTION update_order_item_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_item_messages_updated_at_trigger ON order_item_messages;
CREATE TRIGGER order_item_messages_updated_at_trigger
  BEFORE UPDATE ON order_item_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_order_item_messages_updated_at();

-- =============================================
-- 뷰: 읽지 않은 메시지 카운트
-- =============================================

CREATE OR REPLACE VIEW order_item_unread_counts AS
SELECT 
  oi.id AS order_item_id,
  o.user_id,
  COUNT(CASE WHEN m.author_role = 'admin' AND m.is_read = FALSE THEN 1 END) AS unread_from_admin,
  COUNT(CASE WHEN m.author_role = 'user' AND m.is_read = FALSE THEN 1 END) AS unread_from_user,
  MAX(m.created_at) AS last_message_at
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN order_item_messages m ON m.order_item_id = oi.id
GROUP BY oi.id, o.user_id;

-- =============================================
-- 샘플 쿼리
-- =============================================

-- 특정 주문 항목의 모든 메시지 조회 (시간순)
/*
SELECT 
  m.id,
  m.message,
  m.message_type,
  m.author_role,
  p.email AS author_email,
  m.is_read,
  m.created_at,
  m.attachments
FROM order_item_messages m
LEFT JOIN profiles p ON p.user_id = m.author_id
WHERE m.order_item_id = 'your-order-item-id'
ORDER BY m.created_at ASC;
*/

-- 특정 사용자의 읽지 않은 메시지가 있는 주문 항목 조회
/*
SELECT 
  oi.id,
  oi.client_name,
  o.product_name,
  uc.unread_from_admin,
  uc.last_message_at
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN order_item_unread_counts uc ON uc.order_item_id = oi.id
WHERE o.user_id = auth.uid()
  AND uc.unread_from_admin > 0
ORDER BY uc.last_message_at DESC;
*/

-- 메시지 작성 예시
/*
INSERT INTO order_item_messages (
  order_item_id,
  author_id,
  author_role,
  message,
  message_type
) VALUES (
  'order-item-uuid',
  auth.uid(),
  'user',  -- or 'admin'
  '작업 진행 상황이 궁금합니다.',
  'question'
);
*/

-- 메시지 읽음 처리
/*
UPDATE order_item_messages
SET is_read = TRUE, read_at = NOW()
WHERE id = 'message-uuid'
  AND is_read = FALSE;
*/
