## 주문 중단 신청 기능 구현 가이드

### 필요한 Supabase 테이블 설정

주문 중단 신청 기능을 위해 다음 SQL 스크립트를 순서대로 실행해야 합니다:

#### 1. **order_items에 status 컬럼 추가**
파일: `sql/add_order_items_status.sql`
- order_items 테이블에 status 컬럼 추가
- updated_at 컬럼 추가
- product_id 컬럼 추가 (없는 경우)

```bash
# Supabase SQL Editor에서 실행
psql -U postgres -d postgres -f sql/add_order_items_status.sql
```

#### 2. **cancellation_requests 테이블 생성**
파일: `sql/create_cancellation_requests.sql`
- 중단/환불 신청 테이블 생성
- 자동 트리거 설정 (환불 처리 등)
- RLS 정책 설정

```bash
# Supabase SQL Editor에서 실행
psql -U postgres -d postgres -f sql/create_cancellation_requests.sql
```

---

### 테이블 구조

#### `cancellation_requests` 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 신청 ID (Primary Key) |
| order_item_id | UUID | 주문 항목 ID (Foreign Key) |
| user_id | UUID | 신청 사용자 ID |
| request_type | TEXT | 'pause', 'cancel', 'refund' |
| status | TEXT | 'pending', 'approved', 'rejected', 'completed' |
| reason | TEXT | 신청 사유 (필수) |
| details | TEXT | 상세 설명 |
| requested_refund_amount | NUMERIC | 요청 환불 금액 |
| approved_refund_amount | NUMERIC | 승인된 환불 금액 |
| admin_response | TEXT | 관리자 응답 |
| admin_note | TEXT | 내부 메모 (비공개) |
| processed_by | UUID | 처리한 관리자 ID |
| attachments | JSONB | 첨부 파일 목록 |
| created_at | TIMESTAMP | 신청 일시 |
| updated_at | TIMESTAMP | 수정 일시 |
| processed_at | TIMESTAMP | 처리 완료 일시 |

---

### API 라우트 구현 예시

#### 1. 중단 신청 생성
`src/app/api/cancellation-requests/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      order_item_id, 
      request_type, 
      reason, 
      details, 
      requested_refund_amount 
    } = body;

    // 유효성 검사
    if (!order_item_id || !request_type || !reason) {
      return NextResponse.json(
        { error: '필수 항목이 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 신청 가능 여부 확인
    const { data: canRequest } = await supabase
      .rpc('can_request_cancellation', { p_order_item_id: order_item_id });

    if (!canRequest) {
      return NextResponse.json(
        { error: '이미 처리 중인 신청이 있거나 신청할 수 없는 상태입니다.' },
        { status: 400 }
      );
    }

    // 신청 생성
    const { data, error } = await supabase
      .from('cancellation_requests')
      .insert({
        order_item_id,
        user_id: user.id,
        request_type,
        reason,
        details,
        requested_refund_amount: request_type === 'refund' ? requested_refund_amount : null
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });

  } catch (error) {
    console.error('중단 신청 생성 오류:', error);
    return NextResponse.json(
      { error: '중단 신청 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자의 신청 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('cancellation_requests')
      .select(`
        *,
        order_items (
          id,
          client_name,
          order_id,
          orders (
            id,
            product_name
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });

  } catch (error) {
    console.error('신청 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '신청 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

#### 2. 특정 신청 조회/수정
`src/app/api/cancellation-requests/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from('cancellation_requests')
      .select(`
        *,
        order_items (
          id,
          client_name,
          daily_qty,
          weeks,
          total_qty,
          item_price,
          status,
          order_id,
          orders (
            id,
            product_name
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });

  } catch (error) {
    console.error('신청 조회 오류:', error);
    return NextResponse.json(
      { error: '신청 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 신청 취소 (pending 상태만 가능)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { id } = await params;

    // pending 상태인지 확인
    const { data: request_data } = await supabase
      .from('cancellation_requests')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!request_data || request_data.status !== 'pending') {
      return NextResponse.json(
        { error: '취소할 수 없는 신청입니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('cancellation_requests')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ message: '신청이 취소되었습니다.' });

  } catch (error) {
    console.error('신청 취소 오류:', error);
    return NextResponse.json(
      { error: '신청 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

---

### 프론트엔드 사용 예시

#### OrderDetailClient에서 중단 신청

```typescript
const handleRefundRequest = async () => {
  try {
    const response = await fetch('/api/cancellation-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_item_id: itemDetail.item_id,
        request_type: 'refund', // 'pause', 'cancel', 'refund'
        reason: '서비스 불만족',
        details: '약속된 효과가 나타나지 않았습니다.',
        requested_refund_amount: itemDetail.item_price
      })
    });

    if (response.ok) {
      showToast('중단 신청이 접수되었습니다.', 'success');
      router.push('/cancellation-requests'); // 신청 목록 페이지
    } else {
      const error = await response.json();
      showToast(error.error || '신청에 실패했습니다.', 'error');
    }
  } catch (error) {
    console.error('신청 오류:', error);
    showToast('신청 중 오류가 발생했습니다.', 'error');
  }
};
```

---

### 주요 기능

1. **자동 환불 처리**
   - 관리자가 승인하고 완료 처리하면 자동으로 포인트 환불
   - point_ledger에 기록
   - 사용자 잔액 자동 증가

2. **중복 신청 방지**
   - 같은 order_item에 대해 pending 상태 신청이 있으면 추가 신청 불가

3. **부분 환불 지원**
   - 관리자가 requested_refund_amount와 다른 approved_refund_amount 설정 가능

4. **상태 추적**
   - order_item_status_history에 자동 기록
   - 타임라인 확인 가능

5. **첨부 파일 지원**
   - attachments JSONB 컬럼으로 파일 정보 저장 가능

---

### 다음 단계

1. SQL 스크립트 실행
2. API 라우트 생성
3. 프론트엔드 UI 구현 (중단 신청 폼, 신청 목록)
4. 관리자 페이지 구현 (신청 승인/거절)
