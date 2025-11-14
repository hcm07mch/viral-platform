# 중단 신청 관리 시스템 가이드

## 개요
사용자가 주문 항목에 대한 중단 신청(일시정지, 취소, 환불)을 할 수 있고, 관리자가 이를 승인/거절 처리할 수 있는 시스템입니다.

## 시스템 구성

### 1. 데이터베이스
**SQL 스크립트 실행 순서:**
```sql
-- 1단계: order_items 테이블 컬럼 추가
-- 파일: sql/add_order_items_status.sql
-- updated_at, product_id 컬럼 추가 및 트리거 설정

-- 2단계: cancellation_requests 테이블 생성
-- 파일: sql/create_cancellation_requests.sql
-- 중단 신청 테이블 및 트리거, RLS 정책 설정
```

### 2. API 엔드포인트

#### 사용자 API
- **POST /api/cancellation-requests**
  - 중단 신청 생성
  - Body: `{ order_item_id, request_type, reason, user_notes }`
  - request_type: 'pause' | 'cancel' | 'refund'

- **GET /api/cancellation-requests?order_item_id={id}**
  - 특정 주문 항목의 중단 신청 내역 조회

#### 관리자 API
- **GET /api/admin/cancellation-requests**
  - 모든 중단 신청 목록 조회
  - Query params: `status`, `type` (필터링)

- **PATCH /api/admin/cancellation-requests/[id]**
  - 중단 신청 승인/거절 처리
  - Body: `{ action: 'approve' | 'reject', admin_notes }`

### 3. 페이지

#### 사용자 페이지
- **/orderDetail/[id]**
  - 주문 상세 페이지
  - "중단 신청" 버튼으로 모달 열기
  - 신청 유형, 사유 선택 및 상세 내용 입력
  - 제한: cancelled, refunded, done 상태에서는 버튼 비활성화

#### 관리자 페이지
- **/admin/cancellation-requests**
  - 모든 중단 신청 목록
  - 필터링: 상태별, 유형별
  - 각 신청 카드에서 "처리하기" 버튼
  - 모달에서 관리자 메모 입력 후 승인/거절

## 사용 플로우

### 사용자 플로우
1. 주문 목록에서 항목 선택
2. 주문 상세 페이지에서 "중단 신청" 버튼 클릭
3. 모달에서 신청 유형 선택:
   - **일시정지**: 작업을 잠시 멈춤
   - **주문취소**: 작업을 완전히 중단하고 취소
   - **환불요청**: 환불 신청
4. 사유 선택 (필수):
   - 고객사 요청
   - 작업 품질 불만
   - 예산 부족
   - 서비스 변경
   - 기타
5. 상세 내용 입력 (선택)
6. "중단 신청 확정" 클릭
7. 관리자 검토 대기

### 관리자 플로우
1. `/admin/cancellation-requests` 페이지 접속
2. 필터로 대기중인 신청 확인
3. 신청 카드에서 "처리하기" 클릭
4. 모달에서 신청 내용 확인:
   - 사용자 정보
   - 신청 유형 및 사유
   - 주문 정보
5. 관리자 메모 작성 (선택)
6. 승인 또는 거절 버튼 클릭
7. 승인 시 자동으로:
   - order_items 상태 변경 (pause/cancelled/refunded)
   - 환불 타입인 경우 자동 포인트 환불 (트리거)

## 데이터 구조

### cancellation_requests 테이블
```sql
id                BIGSERIAL PRIMARY KEY
order_item_id     BIGINT (order_items 참조)
user_id           UUID (profiles 참조)
request_type      TEXT (pause/cancel/refund)
status            TEXT (pending/approved/rejected/completed)
reason            TEXT (사유)
user_notes        TEXT (사용자 메모)
admin_notes       TEXT (관리자 메모)
created_at        TIMESTAMP
processed_at      TIMESTAMP
processed_by      UUID (처리한 관리자)
```

## 자동화 기능

### 트리거 1: validate_cancellation_user
- 실행 시점: INSERT BEFORE
- 기능: 사용자가 자신의 주문 항목에만 신청할 수 있도록 검증

### 트리거 2: process_refund_approval
- 실행 시점: UPDATE AFTER (status → approved, request_type = refund)
- 기능:
  1. order_items 상태를 'refunded'로 변경
  2. 해당 금액을 point_ledger에 환불 기록
  3. profiles 테이블의 포인트 잔액 업데이트

## 권한 (RLS 정책)

### 사용자 권한
- SELECT: 자신의 신청만 조회
- INSERT: 자신의 주문 항목에만 신청 생성
- UPDATE/DELETE: 불가

### 관리자 권한
- SELECT: 모든 신청 조회
- UPDATE: 모든 신청 처리 가능

## 접근 방법

### 일반 사용자
```
대시보드 → 주문 목록 → 주문 상세 → 중단 신청 버튼
```

### 관리자
```
대시보드 → 관리자 페이지 (링크 추가 필요) → 중단 신청 관리
또는 직접 URL: /admin/cancellation-requests
```

## 필요한 추가 작업

1. **대시보드에 관리자 메뉴 추가**
   - `/dashboard` 페이지에 관리자용 링크 추가
   - 관리자 권한 체크

2. **알림 시스템 (선택)**
   - 신청 생성 시 관리자에게 알림
   - 처리 완료 시 사용자에게 알림

3. **통계 대시보드 (선택)**
   - 신청 현황 통계
   - 처리 속도 분석

## 주의사항

- 승인 후에는 취소 불가
- 환불은 자동으로 포인트로 반환
- 이미 완료(done)된 작업은 중단 신청 불가
- 중복 신청 방지 (pending 상태가 있으면 추가 신청 불가)

## 테스트 시나리오

1. 일반 사용자로 로그인
2. 주문 항목 생성
3. 중단 신청 생성 (각 유형별로)
4. 관리자로 로그인
5. 중단 신청 목록 확인
6. 승인/거절 처리
7. 사용자 계정으로 결과 확인

## 문제 해결

### 관리자 페이지 접근 불가
- profiles 테이블에서 tier='admin' 확인
- RLS 정책 활성화 확인

### 환불이 자동 처리되지 않음
- process_refund_approval 트리거 확인
- point_ledger 테이블 권한 확인

### 신청이 생성되지 않음
- validate_cancellation_user 트리거 확인
- order_item_id와 user_id 소유권 확인
