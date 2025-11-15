-- =============================================
-- 고객 정보와 주문 입력 필드 매핑 가이드
-- =============================================

/*
이 문서는 customers 테이블과 product_input_defs(input_field_templates) 간의
필드 매핑 규칙을 정의합니다.

## 매핑 구조

### 1. 기본 필드 (customers 테이블 컬럼)
이 필드들은 customers 테이블의 직접 컬럼으로 저장됩니다.

| Customer 컬럼    | field_key     | 용도                          |
|------------------|---------------|-------------------------------|
| client_name      | client_name   | 고객사 상호명 (주문 시 필수)  |
| place_id         | place_id      | N사 플레이스 ID               |
| contact          | contact       | 연락처 (전화/이메일)          |

### 2. 확장 필드 (extra_fields JSONB)
추가적인 product-specific 필드들은 JSONB로 저장됩니다.

예시:
```json
{
  "deadline": "2025-12-31",
  "daily_qty": "50",
  "weeks": "4",
  "special_notes": "주말 제외 요청",
  "budget": "1000000",
  "target_area": "강남구, 서초구"
}
```

## 사용 시나리오

### 시나리오 1: ProductDetail 페이지에서 고객 정보 가져오기

1. 사용자가 고객 선택 드롭다운 클릭
2. customers 테이블에서 user_id로 필터링된 고객 목록 조회
3. 고객 선택 시:
   - client_name → client_name 필드에 자동 입력
   - place_id → place_id 필드에 자동 입력
   - contact → contact 필드에 자동 입력
   - extra_fields의 각 키 → 해당 field_key 필드에 자동 입력

### 시나리오 2: 주문 생성 후 고객 정보 업데이트

사용자가 주문 시 입력한 값들을 고객 정보에 반영할 수도 있습니다.
```sql
UPDATE customers
SET extra_fields = extra_fields || '{"deadline": "2025-12-31", "budget": "1000000"}'::jsonb
WHERE id = 'customer-uuid';
```

## 구현 예시 (TypeScript)

### 고객 → 주문 폼 (자동 입력)
```typescript
// 고객 정보 가져오기
const customer = await supabase
  .from('customers')
  .select('*')
  .eq('id', customerId)
  .single();

// 기본 필드 매핑
const formData = {
  client_name: customer.client_name,
  place_id: customer.place_id,
  contact: customer.contact,
  // extra_fields 펼치기
  ...customer.extra_fields
};

// 예: { client_name: "강남식당", place_id: "1234", deadline: "2025-12-31" }
```

### 주문 → 고객 정보 저장
```typescript
// 주문 폼에서 입력받은 데이터
const orderFormData = {
  client_name: "강남식당",
  place_id: "1234",
  deadline: "2025-12-31",
  daily_qty: "50",
  weeks: "4"
};

// 기본 필드와 확장 필드 분리
const { client_name, place_id, contact, ...extraFields } = orderFormData;

// 고객 정보 업데이트
await supabase
  .from('customers')
  .update({
    client_name: client_name,
    place_id: place_id,
    contact: contact,
    extra_fields: extraFields
  })
  .eq('id', customerId);
```

## 권장 field_key 목록

### 기본 정보
- `client_name` - 고객사명 (customers.client_name)
- `place_id` - 플레이스 ID (customers.place_id)
- `contact` - 연락처 (customers.contact)

### 주문 관련
- `deadline` - 마감일
- `daily_qty` - 일일 수량
- `weeks` - 기간 (주)
- `start_date` - 시작일
- `end_date` - 종료일

### 상세 정보
- `special_notes` - 특이사항
- `budget` - 예산
- `target_area` - 타겟 지역
- `target_keywords` - 타겟 키워드
- `ad_copy` - 광고 문구

## 데이터베이스 쿼리 예시

### 특정 extra_fields 값으로 고객 검색
```sql
-- deadline이 설정된 고객 찾기
SELECT * FROM customers
WHERE extra_fields ? 'deadline'
  AND user_id = auth.uid();

-- deadline이 특정 날짜인 고객 찾기
SELECT * FROM customers
WHERE extra_fields->>'deadline' = '2025-12-31'
  AND user_id = auth.uid();

-- budget이 100만원 이상인 고객 찾기
SELECT * FROM customers
WHERE (extra_fields->>'budget')::numeric >= 1000000
  AND user_id = auth.uid();
```

### extra_fields 업데이트
```sql
-- 새 필드 추가
UPDATE customers
SET extra_fields = extra_fields || '{"new_field": "value"}'::jsonb
WHERE id = 'uuid';

-- 특정 필드 제거
UPDATE customers
SET extra_fields = extra_fields - 'field_to_remove'
WHERE id = 'uuid';

-- 특정 필드 값 변경
UPDATE customers
SET extra_fields = jsonb_set(extra_fields, '{deadline}', '"2026-01-01"')
WHERE id = 'uuid';
```

## 주의사항

1. **field_key 일관성**: input_field_templates의 field_key와 정확히 일치해야 함
2. **타입 검증**: extra_fields는 JSONB이므로 타입 변환 필요 시 주의
3. **NULL 처리**: extra_fields의 키가 없을 경우 NULL 또는 기본값 처리
4. **성능**: GIN 인덱스가 있지만 복잡한 JSONB 쿼리는 성능 영향 있음
5. **마이그레이션**: 기존 고객 데이터가 있다면 extra_fields를 {}로 초기화해야 함

*/
