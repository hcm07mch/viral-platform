# 포인트 충전 시스템 구조

## 개요
이 시스템은 PG사 결제 연동을 고려하여 설계된 포인트 충전 시스템입니다. 현재는 테스트 모드로 동작하며, 추후 실제 PG사(Toss Payments, 이니시스, 카카오페이 등)와 연동할 수 있도록 구조화되어 있습니다.

## 데이터베이스 구조

### 1. payment_transactions 테이블
결제 거래 내역을 저장하는 메인 테이블입니다.

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,      -- 결제 금액 (원)
  point_amount INTEGER NOT NULL,        -- 충전될 포인트
  status TEXT NOT NULL,                 -- pending, completed, failed, cancelled, refunded
  payment_method TEXT,                  -- card, bank, kakao, naver, toss, test
  pg_provider TEXT,                     -- PG사 (tosspayments, inicis, kakao 등)
  pg_transaction_id TEXT UNIQUE,        -- PG사 거래 ID
  pg_payment_key TEXT,                  -- 결제 키
  pg_order_id TEXT,                     -- 주문 ID
  pg_response JSONB,                    -- PG사 응답 전체
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT
);
```

### 2. point_ledger 테이블 확장
기존 point_ledger에 payment_transaction_id 컬럼을 추가하여 충전 내역을 추적합니다.

```sql
ALTER TABLE point_ledger
ADD COLUMN payment_transaction_id UUID REFERENCES payment_transactions(id);
```

## API 엔드포인트

### 1. POST /api/payment
포인트 충전 요청을 생성합니다.

**Request Body:**
```json
{
  "amount": 10000,
  "paymentMethod": "test"  // test, card, kakao, toss, bank
}
```

**Response (테스트 모드):**
```json
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "amount": 10000,
    "pointAmount": 10000,
    "status": "completed"
  },
  "balance": 50000,
  "message": "충전이 완료되었습니다."
}
```

**Response (실제 PG 모드 - 추후 구현):**
```json
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "amount": 10000,
    "pointAmount": 10000,
    "status": "pending"
  },
  "paymentUrl": "https://pg-provider.com/payment/...",
  "message": "결제 대기 중입니다."
}
```

### 2. GET /api/payment
사용자의 결제 내역을 조회합니다.

**Query Parameters:**
- `status`: 결제 상태 필터링 (optional)
- `limit`: 조회 개수 (default: 50)

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "amount": 10000,
      "point_amount": 10000,
      "status": "completed",
      "payment_method": "test",
      "created_at": "2025-11-14T...",
      "completed_at": "2025-11-14T..."
    }
  ]
}
```

### 3. POST /api/payment/callback
PG사 결제 완료 콜백을 처리합니다. (추후 구현)

**Request Body:**
```json
{
  "transactionId": "uuid",
  "pgTransactionId": "pg-tx-123",
  "status": "completed",
  "amount": 10000,
  "pgResponse": { ... }
}
```

## 결제 플로우

### 현재 (테스트 모드)
1. 사용자가 충전 금액 선택
2. POST /api/payment 호출
3. payment_transactions 레코드 생성 (pending)
4. 즉시 completed로 변경
5. point_ledger에 충전 기록 추가
6. 사용자에게 완료 메시지 표시

### 추후 (실제 PG 연동)
1. 사용자가 충전 금액 선택
2. POST /api/payment 호출
3. payment_transactions 레코드 생성 (pending)
4. PG사 결제창 URL 반환
5. 사용자가 PG사에서 결제 진행
6. PG사가 POST /api/payment/callback 호출
7. 결제 성공 시:
   - payment_transactions를 completed로 변경
   - point_ledger에 충전 기록 추가
8. 사용자에게 완료 메시지 표시

## 프론트엔드 구조

### PointChargeClient.tsx
충전 페이지의 메인 컴포넌트입니다.

**주요 기능:**
- 금액 선택 (프리셋 + 직접 입력)
- 결제 수단 선택
- API 호출 및 결제 처리
- 부모 창 새로고침 및 자동 닫기

**결제 수단:**
- 🧪 테스트 결제 (현재 활성화)
- 💳 신용/체크카드 (준비중)
- 💬 카카오페이 (준비중)
- 💙 토스페이 (준비중)
- 🏦 계좌이체 (준비중)

## PG사 연동 가이드

### 1. Toss Payments 연동 예시

```typescript
// POST /api/payment에서
const tossPaymentsResponse = await fetch('https://api.tosspayments.com/v1/payments', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: amount,
    orderId: transaction.pg_order_id,
    orderName: `포인트 ${pointAmount}개 충전`,
    successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/callback`,
    failUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/callback`,
  }),
});

// 결제창 URL 반환
return NextResponse.json({
  success: true,
  paymentUrl: tossPaymentsResponse.checkout.url,
  transaction: { ... }
});
```

### 2. 콜백 처리

```typescript
// POST /api/payment/callback에서
const { paymentKey, orderId, amount } = await request.json();

// Toss Payments 결제 승인
const confirmResponse = await fetch(
  `https://api.tosspayments.com/v1/payments/confirm`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount,
    }),
  }
);

// payment_transactions 업데이트
// point_ledger에 포인트 추가
```

## 환경 변수 설정 (추후 필요)

```env
# Toss Payments
TOSS_PAYMENTS_CLIENT_KEY=test_ck_...
TOSS_PAYMENTS_SECRET_KEY=test_sk_...

# 기타 PG사
INICIS_MID=...
KAKAO_CID=...
```

## 보안 고려사항

1. **결제 금액 검증**: 클라이언트에서 전송된 금액을 서버에서 재검증
2. **콜백 인증**: PG사 콜백의 서명/해시 검증 필수
3. **중복 결제 방지**: pg_transaction_id UNIQUE 제약 조건
4. **RLS 정책**: 사용자는 자신의 결제 내역만 조회 가능
5. **트랜잭션 처리**: 결제 완료와 포인트 추가는 원자적으로 처리

## 테스트 방법

1. SQL 파일 실행:
```sql
-- Supabase SQL Editor에서 실행
\i sql/create_payment_transactions.sql
\i sql/add_payment_transaction_to_ledger.sql
```

2. 포인트 지갑 페이지에서 충전하기 버튼 클릭
3. 금액 선택 및 테스트 결제 수단 선택
4. 충전하기 버튼 클릭
5. 포인트가 즉시 반영되는지 확인

## 다음 단계

1. ✅ 테스트 모드 구현 완료
2. ⏳ PG사 선택 및 연동 (Toss Payments 추천)
3. ⏳ 결제창 팝업/리다이렉트 처리
4. ⏳ 콜백 핸들러 구현
5. ⏳ 결제 실패/취소 처리
6. ⏳ 환불 기능 구현
7. ⏳ 관리자 결제 내역 조회 페이지
