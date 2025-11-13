-- =============================================
-- 주문 항목 상태 타임라인 테이블
-- =============================================

-- order_item_status_history 테이블 (주문 항목의 상태 변경 이력)
CREATE TABLE IF NOT EXISTS order_item_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 주문 항목 참조
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  
  -- 상태 정보
  from_status TEXT,  -- 이전 상태 (NULL이면 최초 생성)
  to_status TEXT NOT NULL,  -- 변경된 상태
  
  -- 변경 주체
  changed_by UUID REFERENCES profiles(user_id),  -- 변경한 사용자 (NULL이면 시스템)
  changed_by_role TEXT,  -- 'user', 'admin', 'system'
  
  -- 변경 사유/메모
  reason TEXT,  -- 상태 변경 사유
  admin_note TEXT,  -- 관리자 메모 (관리자만 작성 가능)
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_order_item_status_history_item_id ON order_item_status_history(order_item_id);
CREATE INDEX idx_order_item_status_history_created_at ON order_item_status_history(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE order_item_status_history ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 주문 항목 이력만 조회 가능
CREATE POLICY "Users can view their own order item status history"
  ON order_item_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_status_history.order_item_id
        AND o.user_id = auth.uid()
    )
  );

-- RLS 정책: 관리자는 모든 이력 조회 가능
CREATE POLICY "Admins can view all order item status history"
  ON order_item_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tier = 'admin'
    )
  );

-- RLS 정책: 상태 이력 생성은 시스템/관리자만 가능
CREATE POLICY "Only system can insert status history"
  ON order_item_status_history FOR INSERT
  WITH CHECK (
    -- 관리자이거나 서비스 롤인 경우만 허용
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tier = 'admin'
    )
    OR auth.role() = 'service_role'
  );

-- =============================================
-- 트리거: order_items의 모든 변경 사항을 타임라인에 자동 기록
-- =============================================

-- 트리거 함수 - 모든 변경 사항 추적
CREATE OR REPLACE FUNCTION log_order_item_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_reason TEXT;
  v_from_status TEXT;
  v_to_status TEXT;
BEGIN
  -- 작업 유형에 따라 reason 및 상태 설정
  IF TG_OP = 'INSERT' THEN
    v_reason := '주문 항목 생성';
    v_from_status := NULL;
    v_to_status := NEW.status;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- 상태 변경 감지
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_reason := '상태 변경: ' || COALESCE(OLD.status, 'NULL') || ' → ' || NEW.status;
      v_from_status := OLD.status;
      v_to_status := NEW.status;
      
    -- 수량 변경 감지
    ELSIF OLD.daily_qty != NEW.daily_qty OR OLD.weeks != NEW.weeks OR OLD.total_qty != NEW.total_qty THEN
      v_reason := '수량 정보 수정 (일일: ' || OLD.daily_qty || '→' || NEW.daily_qty || 
                  ', 주: ' || OLD.weeks || '→' || NEW.weeks || 
                  ', 총: ' || OLD.total_qty || '→' || NEW.total_qty || ')';
      v_from_status := NEW.status;
      v_to_status := NEW.status;
      
    -- 가격 변경 감지
    ELSIF OLD.unit_price != NEW.unit_price OR OLD.item_price != NEW.item_price THEN
      v_reason := '가격 정보 수정 (단가: ' || OLD.unit_price || '→' || NEW.unit_price || 
                  ', 항목가: ' || OLD.item_price || '→' || NEW.item_price || ')';
      v_from_status := NEW.status;
      v_to_status := NEW.status;
      
    -- 고객명 변경 감지
    ELSIF OLD.client_name != NEW.client_name THEN
      v_reason := '고객명 수정: ' || OLD.client_name || ' → ' || NEW.client_name;
      v_from_status := NEW.status;
      v_to_status := NEW.status;
      
    -- item_details 변경 감지
    ELSIF OLD.item_details::text != NEW.item_details::text THEN
      v_reason := '주문 항목 상세 정보 수정';
      v_from_status := NEW.status;
      v_to_status := NEW.status;
      
    ELSE
      -- 기타 변경사항
      v_reason := '주문 항목 정보 수정';
      v_from_status := NEW.status;
      v_to_status := NEW.status;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_reason := '주문 항목 삭제';
    v_from_status := OLD.status;
    v_to_status := NULL;
    
    -- DELETE의 경우 OLD 레코드 사용
    INSERT INTO order_item_status_history (
      order_item_id,
      from_status,
      to_status,
      changed_by,
      changed_by_role,
      reason
    ) VALUES (
      OLD.id,
      v_from_status,
      v_to_status,
      auth.uid(),
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM profiles 
          WHERE user_id = auth.uid() AND tier = 'admin'
        ) THEN 'admin'
        WHEN auth.uid() IS NOT NULL THEN 'user'
        ELSE 'system'
      END,
      v_reason
    );
    
    RETURN OLD;
  END IF;
  
  -- INSERT 및 UPDATE의 경우 이력 기록
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO order_item_status_history (
      order_item_id,
      from_status,
      to_status,
      changed_by,
      changed_by_role,
      reason
    ) VALUES (
      NEW.id,
      v_from_status,
      v_to_status,
      auth.uid(),
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM profiles 
          WHERE user_id = auth.uid() AND tier = 'admin'
        ) THEN 'admin'
        WHEN auth.uid() IS NOT NULL THEN 'user'
        ELSE 'system'
      END,
      v_reason
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 - 모든 DML 작업 추적
DROP TRIGGER IF EXISTS order_item_changes_trigger ON order_items;
CREATE TRIGGER order_item_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION log_order_item_changes();

-- =============================================
-- 선택사항: 주문(order) 레벨의 상태 이력 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 주문 참조
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- 상태 정보
  from_status TEXT,
  to_status TEXT NOT NULL,
  
  -- 변경 주체
  changed_by UUID REFERENCES profiles(user_id),
  changed_by_role TEXT,
  
  -- 변경 사유/메모
  reason TEXT,
  admin_note TEXT,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at DESC);

-- RLS 활성화
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their own order status history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order status history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tier = 'admin'
    )
  );

-- 트리거 함수 - 주문(order) 레벨의 모든 변경사항 추적
CREATE OR REPLACE FUNCTION log_order_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_reason TEXT;
  v_from_status TEXT;
  v_to_status TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_reason := '주문 생성';
    v_from_status := NULL;
    v_to_status := NEW.status;
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_reason := '상태 변경: ' || COALESCE(OLD.status, 'NULL') || ' → ' || NEW.status;
      v_from_status := OLD.status;
      v_to_status := NEW.status;
      
    ELSIF OLD.total_price != NEW.total_price OR OLD.quantity != NEW.quantity THEN
      v_reason := '주문 금액/수량 수정';
      v_from_status := NEW.status;
      v_to_status := NEW.status;
      
    ELSIF OLD.admin_memo IS DISTINCT FROM NEW.admin_memo THEN
      v_reason := '관리자 메모 ' || CASE WHEN OLD.admin_memo IS NULL THEN '추가' ELSE '수정' END;
      v_from_status := NEW.status;
      v_to_status := NEW.status;
      
    ELSIF OLD.order_details::text != NEW.order_details::text THEN
      v_reason := '주문 상세 정보 수정';
      v_from_status := NEW.status;
      v_to_status := NEW.status;
      
    ELSE
      v_reason := '주문 정보 수정';
      v_from_status := NEW.status;
      v_to_status := NEW.status;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_reason := '주문 삭제';
    v_from_status := OLD.status;
    v_to_status := NULL;
    
    INSERT INTO order_status_history (
      order_id,
      from_status,
      to_status,
      changed_by,
      changed_by_role,
      reason
    ) VALUES (
      OLD.id,
      v_from_status,
      v_to_status,
      auth.uid(),
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM profiles 
          WHERE user_id = auth.uid() AND tier = 'admin'
        ) THEN 'admin'
        WHEN auth.uid() IS NOT NULL THEN 'user'
        ELSE 'system'
      END,
      v_reason
    );
    
    RETURN OLD;
  END IF;
  
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO order_status_history (
      order_id,
      from_status,
      to_status,
      changed_by,
      changed_by_role,
      reason
    ) VALUES (
      NEW.id,
      v_from_status,
      v_to_status,
      auth.uid(),
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM profiles 
          WHERE user_id = auth.uid() AND tier = 'admin'
        ) THEN 'admin'
        WHEN auth.uid() IS NOT NULL THEN 'user'
        ELSE 'system'
      END,
      v_reason
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS order_changes_trigger ON orders;
CREATE TRIGGER order_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_changes();

-- =============================================
-- 샘플 쿼리
-- =============================================

-- 특정 주문 항목의 상태 이력 조회
/*
SELECT 
  h.id,
  h.from_status,
  h.to_status,
  h.reason,
  h.admin_note,
  h.changed_by_role,
  p.email as changed_by_email,
  h.created_at
FROM order_item_status_history h
LEFT JOIN profiles p ON p.user_id = h.changed_by
WHERE h.order_item_id = 'your-item-id'
ORDER BY h.created_at DESC;
*/

-- 특정 사용자의 모든 주문 항목 상태 이력
/*
SELECT 
  oi.client_name,
  o.product_name,
  h.from_status,
  h.to_status,
  h.reason,
  h.created_at
FROM order_item_status_history h
JOIN order_items oi ON oi.id = h.order_item_id
JOIN orders o ON o.id = oi.order_id
WHERE o.user_id = auth.uid()
ORDER BY h.created_at DESC;
*/
