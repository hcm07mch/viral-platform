-- 메시지 삭제 기능을 위한 RLS 정책 추가

-- RLS 정책: 작성자는 자신의 메시지 삭제 가능
CREATE POLICY "Users can delete their own messages"
  ON order_item_messages FOR DELETE
  USING (
    author_id = auth.uid()
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
