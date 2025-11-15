# Toast 시스템 사용 가이드

## 설정 완료!

토스트 시스템이 전역으로 설정되었습니다. 이제 모든 페이지에서 사용할 수 있습니다.

## 사용 방법

### 1. useToast 훅 import
```tsx
import { useToast } from '@/contexts/ToastContext';
```

### 2. 컴포넌트에서 사용
```tsx
'use client';

import { useToast } from '@/contexts/ToastContext';

export default function YourComponent() {
  const { showToast } = useToast();

  const handleAction = () => {
    // 성공 메시지 (기본값)
    showToast('작업이 완료되었습니다');
    
    // 또는 타입 지정
    showToast('작업이 완료되었습니다', 'success');
    showToast('오류가 발생했습니다', 'error');
    showToast('알림입니다', 'info');
    showToast('주의하세요', 'warning');
  };

  return (
    <button onClick={handleAction}>
      클릭
    </button>
  );
}
```

## OrderDetailClient 적용 예시

```tsx
'use client';

import { useToast } from '@/contexts/ToastContext';

export default function OrderDetailClient() {
  const { showToast } = useToast();

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message).then(() => {
      showToast('메시지가 복사되었습니다', 'success');
      setOpenMenuId(null);
    }).catch((error) => {
      console.error('복사 실패:', error);
      showToast('메시지 복사에 실패했습니다', 'error');
    });
  };

  const handleSendMessage = async () => {
    // ... 전송 로직
    showToast('메시지가 전송되었습니다', 'success');
  };

  // ... 나머지 코드
}
```

## Toast 타입

- `success` (기본): 녹색 체크마크, 성공 메시지
- `error`: 빨간색, 오류 메시지
- `info`: 파란색, 정보 메시지
- `warning`: 주황색, 경고 메시지

## 특징

- ✅ 자동으로 2초 후 사라짐
- ✅ 여러 토스트 동시 표시 가능 (스택됨)
- ✅ 모바일 반응형 지원
- ✅ 애니메이션 효과
- ✅ 전역 어디서나 사용 가능

## 기존 OrderDetailClient 수정 필요

현재 OrderDetailClient에서 로컬 토스트를 사용하고 있습니다.
이를 전역 토스트로 변경하려면:

1. `showCopyToast` 상태 제거
2. `useToast()` 훅 사용
3. 로컬 토스트 JSX 제거
4. `handleCopyMessage`에서 `showToast()` 호출

변경을 원하시면 말씀해주세요!
