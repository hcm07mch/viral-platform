-- =============================================
-- 주문 중단/환불 신청 테이블
-- =============================================

-- cancellation_requests 테이블 (주문 중단/환불 신청)
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 신청 대상 (order_items 단위로 신청)
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  -- 신청 유형: 'pause' (일시중지), 'cancel' (취소), 'refund' (환불)
  request_type TEXT NOT NULL CHECK (request_type IN ('pause', 'cancel', 'refund')),
  
  -- 신청 상태: 'pending' (검토중), 'approved' (승인), 'rejected' (거절), 'completed' (처리완료)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  
  -- 신청 사유 (고객 작성)
  reason TEXT NOT NULL,
  
  -- 상세 설명
  details TEXT,
  
  -- 환불 요청 금액 (환불인 경우)
  requested_refund_amount NUMERIC(10, 2),
  
  -- 실제 환불 금액 (관리자가 결정, 부분 환불 가능)
  approved_refund_amount NUMERIC(10, 2),
  
  -- 관리자 응답
  admin_response TEXT,
  admin_note TEXT,  -- 내부 메모 (고객에게 보이지 않음)
  processed_by UUID REFERENCES profiles(user_id),  -- 처리한 관리자
  
  -- 첨부 파일 (선택사항 - JSON 배열)
  -- 예: [{"url": "https://...", "name": "증빙.png", "type": "image/png"}]
  attachments JSONB DEFAULT '[]',
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE  -- 처리 완료 시각
);

-- 인덱스
CREATE INDEX idx_cancellation_requests_order_item_id ON cancellation_requests(order_item_id);
CREATE INDEX idx_cancellation_requests_user_id ON cancellation_requests(user_id);
CREATE INDEX idx_cancellation_requests_status ON cancellation_requests(status);
CREATE INDEX idx_cancellation_requests_created_at ON cancellation_requests(created_at DESC);

-- =============================================
-- 트리거: user_id 유효성 검증
-- =============================================

CREATE OR REPLACE FUNCTION validate_cancellation_user()
RETURNS TRIGGER AS $$
DECLARE
  v_order_user_id UUID;
BEGIN
  -- order_item의 주문 소유자 확인
  SELECT o.user_id INTO v_order_user_id
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.id = NEW.order_item_id;
  
  -- user_id가 주문 소유자와 일치하지 않으면 에러
  IF v_order_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid order_item_id';
  END IF;
  
  IF NEW.user_id != v_order_user_id THEN
    RAISE EXCEPTION 'User does not own this order item';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_cancellation_user
  BEFORE INSERT ON cancellation_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_cancellation_user();

-- =============================================
-- 트리거: updated_at 자동 업데이트
-- =============================================

CREATE OR REPLACE FUNCTION update_cancellation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cancellation_requests_updated_at
  BEFORE UPDATE ON cancellation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_cancellation_requests_updated_at();

-- =============================================
-- 트리거: 승인 시 processed_at 자동 설정
-- =============================================

CREATE OR REPLACE FUNCTION set_cancellation_processed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- 상태가 approved, rejected, completed로 변경되면 processed_at 설정
  IF NEW.status IN ('approved', 'rejected', 'completed') AND OLD.status = 'pending' THEN
    NEW.processed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_cancellation_processed_at
  BEFORE UPDATE ON cancellation_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_cancellation_processed_at();

-- =============================================
-- 트리거: 환불 승인 시 자동 처리
-- =============================================

CREATE OR REPLACE FUNCTION process_refund_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_order_id UUID;
  v_refund_amount NUMERIC(10, 2);
BEGIN
  -- 환불이 승인되고 완료 상태가 되면 자동 처리
  IF NEW.request_type = 'refund' 
     AND NEW.status = 'completed' 
     AND OLD.status = 'approved' 
     AND NEW.approved_refund_amount > 0 THEN
    
    -- 사용자 ID 및 주문 ID 가져오기
    SELECT o.user_id, oi.order_id INTO v_user_id, v_order_id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = NEW.order_item_id;
    
    v_refund_amount := NEW.approved_refund_amount;
    
    -- 포인트 환불 처리
    INSERT INTO point_ledger (
      user_id,
      transaction_type,
      amount,
      balance_after,
      order_id,
      memo
    ) VALUES (
      v_user_id,
      'refund',
      v_refund_amount,
      (SELECT balance FROM profiles WHERE user_id = v_user_id) + v_refund_amount,
      v_order_id,
      '중단 신청 환불 처리 (신청 ID: ' || NEW.id || ')'
    );
    
    -- 사용자 잔액 업데이트
    UPDATE profiles
    SET balance = balance + v_refund_amount,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    -- 주문 항목 상태를 'refunded'로 변경
    UPDATE order_items
    SET status = 'refunded'
    WHERE id = NEW.order_item_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_refund_approval
  AFTER UPDATE ON cancellation_requests
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status = 'approved')
  EXECUTE FUNCTION process_refund_approval();

-- =============================================
-- RLS (Row Level Security) 정책
-- =============================================

ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 신청만 조회 가능
CREATE POLICY "Users can view their own cancellation requests"
  ON cancellation_requests FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 주문 항목에 대한 신청만 생성 가능
CREATE POLICY "Users can create cancellation requests for their orders"
  ON cancellation_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_id
        AND o.user_id = auth.uid()
        -- 이미 완료/취소/환불된 주문은 신청 불가
        AND oi.status NOT IN ('done', 'cancelled', 'refunded')
    )
  );

-- 사용자는 pending 상태의 자신의 신청만 수정/취소 가능
CREATE POLICY "Users can update their pending cancellation requests"
  ON cancellation_requests FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- 관리자는 모든 신청 조회 및 처리 가능
CREATE POLICY "Admins can manage all cancellation requests"
  ON cancellation_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tier = 'admin'
    )
  );

-- 서비스 롤은 모든 작업 가능
CREATE POLICY "Service role can manage cancellation requests"
  ON cancellation_requests FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- 유틸리티 함수
-- =============================================

-- 신청 가능 여부 확인 함수
CREATE OR REPLACE FUNCTION can_request_cancellation(p_order_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
  v_pending_count INTEGER;
BEGIN
  -- 주문 항목 상태 확인
  SELECT status INTO v_status
  FROM order_items
  WHERE id = p_order_item_id;
  
  -- 이미 완료/취소/환불된 주문은 신청 불가
  IF v_status IN ('done', 'cancelled', 'refunded') THEN
    RETURN FALSE;
  END IF;
  
  -- 이미 처리 중인 신청이 있는지 확인
  SELECT COUNT(*) INTO v_pending_count
  FROM cancellation_requests
  WHERE order_item_id = p_order_item_id
    AND status = 'pending';
  
  -- 처리 중인 신청이 없으면 신청 가능
  RETURN v_pending_count = 0;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 샘플 데이터 (테스트용)
-- =============================================

-- 예시: 환불 신청
/*
INSERT INTO cancellation_requests (
  order_item_id,
  user_id,
  request_type,
  reason,
  details,
  requested_refund_amount
) VALUES (
  'order-item-uuid-here',
  'user-uuid-here',
  'refund',
  '서비스 불만족',
  '약속된 효과가 나타나지 않았습니다.',
  50000.00
);
*/

-- 예시: 관리자가 승인
/*
UPDATE cancellation_requests
SET 
  status = 'approved',
  approved_refund_amount = 30000.00,  -- 부분 환불
  admin_response = '진행 상황을 고려하여 60% 환불 승인합니다.',
  admin_note = '3일 진행, 7일 남음',
  processed_by = 'admin-user-uuid'
WHERE id = 'request-uuid-here';
*/

-- 예시: 환불 처리 완료
/*
UPDATE cancellation_requests
SET status = 'completed'
WHERE id = 'request-uuid-here';
*/
