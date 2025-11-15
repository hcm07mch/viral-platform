# 포인트 차감 RLS 오류 수정 가이드

## 🔴 오류 메시지
```
거래 내역 기록 실패: {
  code: '42501',
  message: 'new row violates row-level security policy for table "point_ledger"'
}
```

## 🔍 원인
API 라우트에서 `point_ledger` 테이블에 INSERT 시 RLS(Row Level Security) 정책 위반

## ✅ 해결 방법

### 1. Supabase Service Role Key 추가

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Service Role Key 찾는 방법:**
1. Supabase Dashboard 접속
2. Settings → API
3. "service_role" 키 복사 (⚠️ 절대 클라이언트에 노출하지 말 것!)

### 2. 서버 재시작

환경 변수 추가 후 개발 서버 재시작:
```bash
# 터미널에서 Ctrl+C로 종료 후
npm run dev
```

### 3. 테스트

1. 상품 주문 생성
2. 주문 확정
3. 포인트 지갑 페이지에서 차감 내역 확인

## 📋 변경된 파일들

1. **`src/lib/supabase/service.ts`** (신규)
   - Service Role 클라이언트 생성 함수
   - RLS 우회 가능

2. **`src/app/api/orders/confirm/route.ts`** (수정)
   - `point_ledger` INSERT 시 Service Role 사용
   - RLS 정책 우회

3. **`sql/fix_point_ledger_rls.sql`** (참고용)
   - RLS 정책 확인 및 수정 쿼리

## 🔒 보안 주의사항

**Service Role Key는:**
- ✅ 서버 사이드에서만 사용
- ✅ `.env.local`에만 저장 (Git 제외)
- ✅ 절대 클라이언트 코드에 노출 금지
- ✅ 모든 RLS 정책을 우회할 수 있음

**절대 하지 말아야 할 것:**
- ❌ 클라이언트 컴포넌트에서 사용
- ❌ Git에 커밋
- ❌ 공개 저장소에 노출
- ❌ 브라우저 콘솔에 출력

## 🎯 작동 원리

### 이전 (RLS 위반)
```
API Route → Supabase (ANON_KEY) → point_ledger INSERT → ❌ RLS 거부
```

### 이후 (정상 작동)
```
API Route → Supabase (SERVICE_ROLE_KEY) → point_ledger INSERT → ✅ RLS 우회
```

## 🧪 검증 쿼리

Supabase SQL Editor에서 실행:

```sql
-- 1. RLS 정책 확인
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'point_ledger';

-- 2. 최근 포인트 거래 내역
SELECT 
  transaction_type,
  amount,
  balance_after,
  memo,
  created_at
FROM point_ledger
ORDER BY created_at DESC
LIMIT 10;

-- 3. 사용자 잔액과 거래 내역 일치 여부
SELECT 
  p.user_id,
  p.balance as profile_balance,
  (SELECT balance_after FROM point_ledger 
   WHERE user_id = p.user_id 
   ORDER BY created_at DESC LIMIT 1) as latest_ledger_balance
FROM profiles p
WHERE EXISTS (SELECT 1 FROM point_ledger WHERE user_id = p.user_id);
```

## 📞 문제 해결

여전히 오류가 발생한다면:

1. **환경 변수 확인**
   ```bash
   # PowerShell
   Get-Content .env.local
   ```

2. **서버 로그 확인**
   - 콘솔에서 에러 메시지 확인
   - Service Role Key가 올바르게 로드되었는지 확인

3. **Supabase Dashboard 확인**
   - API Keys가 활성화되어 있는지
   - Service Role Key가 정확한지
