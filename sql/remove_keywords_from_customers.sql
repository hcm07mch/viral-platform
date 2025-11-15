-- customers 테이블에서 keywords 컬럼 제거
-- 이 스크립트는 기존에 생성된 customers 테이블이 있는 경우에만 실행하세요.

-- keywords 컬럼 삭제
ALTER TABLE customers DROP COLUMN IF EXISTS keywords;

-- 변경사항 확인
COMMENT ON TABLE customers IS '대행사 사용자가 관리하는 고객사 정보 (keywords 컬럼 제거됨)';
