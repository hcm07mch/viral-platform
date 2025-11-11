'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/orderConfirm.css';

type OrderItem = {
  clientName: string;
  dailyCount: number;
  weeks: number;
  totalCount: number;
  estimatedPrice: number;
  details: Record<string, any>;
};

type InputDef = {
  id: number;
  product_id: number;
  field_key: string;
  label: string;
  field_type: string;
  required: boolean;
  sort_order: number;
};

type PendingOrder = {
  productId: string;
  productName: string;
  unitPrice: number;
  totalQuantity: number;
  totalPrice: number;
  inputDefs?: InputDef[];
  items: OrderItem[];
};

export default function OrderConfirmClient() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<PendingOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set([0]));
  const [showRedirectModal, setShowRedirectModal] = useState(false);

  useEffect(() => {
    // 세션 스토리지에서 주문 데이터 가져오기
    const pendingOrderStr = sessionStorage.getItem('pendingOrder');
    
    if (!pendingOrderStr) {
      router.push('/productDetail');
      return;
    }

    try {
      const data = JSON.parse(pendingOrderStr);
      setOrderData(data);
    } catch (err) {
      console.error('주문 데이터 파싱 오류:', err);
      router.push('/productDetail');
    }
  }, [router]);

  const toggleOrder = (index: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleConfirmOrder = async () => {
    if (!orderData) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orders/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: orderData.productId,
          productName: orderData.productName,
          unitPrice: orderData.unitPrice,
          items: orderData.items
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '주문 확정에 실패했습니다.');
        setIsLoading(false);
        return;
      }

      // 성공 시 세션 스토리지 정리
      sessionStorage.removeItem('pendingOrder');
      
      // 리다이렉트 선택 모달 표시
      setShowRedirectModal(true);

    } catch (error) {
      console.error('주문 확정 오류:', error);
      setError('서버 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const handleRedirect = (destination: 'orderList' | 'productList') => {
    router.push(`/${destination}`);
  };

  const handleGoBack = () => {
    // 주문 데이터는 세션 스토리지에 그대로 유지
    router.back();
  };

  if (!orderData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      <main className="confirm-wrapper">
        {/* 뒤로 가기 버튼 */}
        <div className="back-button-wrapper">
          <button className="back-button" onClick={handleGoBack}>
            ← 이전 화면으로
          </button>
        </div>

        {/* 상단 요약 패널 */}
        <section className="panel">
          <div className="panel-header">
            <div>주문 최종 요약</div>
            <div className="status-chip">확정 시 상태: 접수중</div>
          </div>

          <div className="summary-grid">
            <div className="summary-box">
              <div className="summary-label">총 주문 건수</div>
              <div className="summary-value">{orderData.items.length}건</div>
            </div>

            <div className="summary-box">
              <div className="summary-label">총 예상 수량</div>
              <div className="summary-value">{orderData.totalQuantity}건</div>
            </div>

            <div className="summary-box">
              <div className="summary-label">차감될 포인트</div>
              <div className="summary-value">{orderData.totalPrice.toLocaleString('ko-KR')} P</div>
            </div>

            <div className="summary-box">
              <div className="summary-label">상품</div>
              <div className="summary-value">{orderData.productName}</div>
            </div>
          </div>

          <div className="subtxt">
            주문 확정 후 각 주문은 "접수중" 상태로 등록되며,
            관리자가 원청 전달 후 "구동중"으로 전환됩니다.
          </div>

          {error && (
            <div className="deadline-warning">
              ※ {error}
            </div>
          )}
        </section>

        {/* 주문 상세 리스트 (아코디언) */}
        <section className="orders-list-panel">
          <div className="orders-list-header">
            <div>개별 주문 상세</div>
            <div className="subtxt">
              클릭해서 입력값/조건을 다시 확인하세요.
            </div>
          </div>

          {orderData.items.map((item, index) => {
            const isExpanded = expandedOrders.has(index);
            
            return (
              <div 
                key={index} 
                className={`confirm-order ${isExpanded ? 'active' : ''}`}
              >
                <div 
                  className="confirm-order-head"
                  onClick={() => toggleOrder(index)}
                >
                  <div className="co-left">
                    <div className="client-name">{item.clientName} ({orderData.productName})</div>
                    <div>{item.dailyCount}건/1일 · {item.weeks}주 진행 · 총 {item.totalCount}건</div>
                  </div>
                  <div className="co-right">
                    <div className="co-price">{item.estimatedPrice.toLocaleString('ko-KR')}원 예상</div>
                    <button className="expand-toggle-btn" type="button">
                      <span className="toggle-text">{isExpanded ? '닫기' : '상세보기'}</span>
                      <svg 
                        className="toggle-icon" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none"
                      >
                        <path 
                          d="M4 6L8 10L12 6" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="confirm-order-body">
                  {Object.entries(item.details).map(([key, value]) => {
                    // inputDefs에서 field_key에 해당하는 label 찾기
                    const fieldDef = orderData.inputDefs?.find(def => def.field_key === key);
                    const displayLabel = fieldDef?.label || key;
                    
                    return (
                      <div key={key}>
                        <strong>{displayLabel}:</strong> {String(value)}<br/>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* 하단 확정 CTA */}
      <footer className="final-cta-bar">
        <div className="final-cta-inner">
          <div className="final-cta-summary-row">
            <div className="final-col">
              <div className="final-label">최종 차감 포인트</div>
              <div className="final-value">{orderData.totalPrice.toLocaleString('ko-KR')} P</div>
            </div>

            <div className="final-col">
              <div className="final-label">확정 후 상태</div>
              <div className="final-value">접수중</div>
            </div>

            <div className="final-col">
              <div className="final-label">총 수량</div>
              <div className="final-value">{orderData.totalQuantity}건</div>
            </div>

            <div className="final-col">
              <div className="final-label">주문 항목</div>
              <div className="final-value">{orderData.items.length}건</div>
            </div>
          </div>

          <div 
            className={`confirm-btn ${isLoading ? 'disabled' : ''}`}
            onClick={!isLoading ? handleConfirmOrder : undefined}
          >
            {isLoading ? '처리 중...' : '주문 확정 (포인트 차감)'}
          </div>

          <div className="legal-note">
            주문 확정을 누르면 위 조건에 동의한 것으로 간주됩니다.
            일부 업종/문구는 별도 심사 후 조정될 수 있습니다.
          </div>
        </div>
      </footer>

      {/* 리다이렉트 선택 모달 */}
      {showRedirectModal && (
        <div className="redirect-modal-overlay">
          <div className="redirect-modal">
            <div className="redirect-modal-header">
              <h2>주문이 확정되었습니다!</h2>
              <p>다음 단계를 선택해주세요</p>
            </div>
            <div className="redirect-modal-buttons">
              <button 
                className="redirect-btn redirect-btn-primary"
                onClick={() => handleRedirect('orderList')}
              >
                <div className="redirect-btn-title">주문 목록 보기</div>
                <div className="redirect-btn-desc">확정된 주문을 확인합니다</div>
              </button>
              <button 
                className="redirect-btn redirect-btn-secondary"
                onClick={() => handleRedirect('productList')}
              >
                <div className="redirect-btn-title">다른 상품 구매하기</div>
                <div className="redirect-btn-desc">추가 주문을 진행합니다</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
