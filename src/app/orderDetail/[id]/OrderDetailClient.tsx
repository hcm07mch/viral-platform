'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import '@/styles/orderDetail.css';

type OrderStatus = 'received' | 'pause' | 'running' | 'done' | 'cancelled' | 'refunded';

type OrderItem = {
  id: string;
  client_name: string;
  daily_qty: number;
  weeks: number;
  total_qty: number;
  item_price: number;
  item_details: Record<string, any>;
};

type InputDef = {
  id: number;
  field_key: string;
  label: string;
  field_type: string;
};

type OrderDetail = {
  id: string;
  order_id: string;
  product_name: string;
  status: OrderStatus;
  start_date: string;
  end_date: string;
  period_text: string;
  total_qty: number;
  total_price: number;
  created_at: string;
  order_details: Record<string, any>;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  received: '접수중',
  pause: '보류',
  running: '구동중',
  done: '작업완료',
  cancelled: '취소',
  refunded: '환불'
};

export default function OrderDetailClient() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [inputDefs, setInputDefs] = useState<InputDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAccordions, setActiveAccordions] = useState<Set<string>>(new Set(['timeline']));
  const [showRefundModal, setShowRefundModal] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId]);

  const fetchOrderDetail = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('주문 상세 정보를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      setOrder(data.order);
      setItems(data.items);
      setInputDefs(data.inputDefs);
    } catch (error) {
      console.error('주문 상세 조회 오류:', error);
      alert('주문 정보를 불러올 수 없습니다.');
      router.push('/orderList');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccordion = (id: string) => {
    setActiveAccordions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRefundConfirm = () => {
    console.log('환불 신청:', order?.order_id);
    setShowRefundModal(false);
    router.push('/refundRequest');
  };

  if (isLoading) {
    return (
      <main style={{ padding: '100px 24px', textAlign: 'center' }}>
        로딩 중...
      </main>
    );
  }

  if (!order) {
    return (
      <main style={{ padding: '100px 24px', textAlign: 'center' }}>
        주문 정보를 찾을 수 없습니다.
      </main>
    );
  }

  return (
    <>
      <main className="page">
        {/* 상단 요약바 */}
        <section className="summary-bar">
          <div className="summary-card">
            <div className="summary-label">주문번호</div>
            <div className="summary-value">{order.order_id}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">상태</div>
            <div className="summary-value">
              <span className="status-chip" data-status={order.status}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">기간</div>
            <div className="summary-value">{order.period_text}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">총량 / 총액</div>
            <div className="summary-value">
              {order.total_qty}건 / {order.total_price.toLocaleString('ko-KR')}원
            </div>
          </div>
        </section>

        {/* 좌측: 타임라인 / 커뮤니케이션 / 감사로그 */}
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">상태 타임라인</div>
            <div className="subtxt">접수→원청전달→구동시작→중간점검→완료</div>
          </div>

          {/* 타임라인 아코디언 */}
          <div className={`accordion ${activeAccordions.has('timeline') ? 'active' : ''}`}>
            <div className="acc-head" onClick={() => toggleAccordion('timeline')}>
              <div className="acc-head-left">타임라인</div>
              <div className="pill">최근 30일</div>
            </div>
            <div className="acc-body">
              <div className="timeline-item">
                <div className="timeline-date">{order.start_date}</div>
                <div className="timeline-content">
                  접수 완료 <span className="badge">주문 생성</span>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-date">{order.start_date}</div>
                <div className="timeline-content">
                  원청 전달 대기중 <span className="badge">담당자: 시스템</span>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-date">진행중</div>
                <div className="timeline-content">
                  현재 상태: {STATUS_LABELS[order.status]}
                </div>
              </div>
            </div>
          </div>

          {/* 커뮤니케이션 아코디언 */}
          <div className={`accordion ${activeAccordions.has('communication') ? 'active' : ''}`}>
            <div className="acc-head" onClick={() => toggleAccordion('communication')}>
              <div className="acc-head-left">커뮤니케이션</div>
              <div className="pill">파일 첨부 가능</div>
            </div>
            <div className="acc-body">
              <div className="chat">
                <div className="author">System</div>
                <div className="bubble">주문이 정상적으로 접수되었습니다. 담당자가 확인 후 진행 예정입니다.</div>
              </div>
              <div className="cta-row">
                <div className="btn">파일 첨부</div>
                <div className="btn primary">메시지 보내기</div>
              </div>
            </div>
          </div>

          {/* 감사 로그 아코디언 */}
          <div className={`accordion ${activeAccordions.has('audit') ? 'active' : ''}`}>
            <div className="acc-head" onClick={() => toggleAccordion('audit')}>
              <div className="acc-head-left">감사 로그 (이력)</div>
              <div className="pill">필드 변경</div>
            </div>
            <div className="acc-body">
              <div className="log-row">
                {new Date(order.created_at).toLocaleString('ko-KR')} — 주문 생성 (by Client)
              </div>
              <div className="log-row">
                {new Date(order.created_at).toLocaleString('ko-KR')} — 상태: {STATUS_LABELS[order.status]} (by System)
              </div>
            </div>
          </div>
        </section>

        {/* 우측: 동적 필드 / 정산 / 액션 */}
        <aside className="panel">
          <div className="panel-header">
            <div className="panel-title">주문 파라미터</div>
            <div className="subtxt">상품 설정에 따른 동적 필드</div>
          </div>

          {/* 동적 필드 그리드 */}
          <div className="form-grid">
            {items.length > 0 && items[0].item_details && Object.entries(items[0].item_details).map(([key, value]) => {
              const fieldDef = inputDefs.find(def => def.field_key === key);
              const displayLabel = fieldDef?.label || key;
              
              return (
                <div key={key} className="form-field">
                  <div className="field-label-row">
                    <div className="field-label">{displayLabel}</div>
                    <div className="help-icon">?</div>
                    <div className="help-tooltip">
                      {fieldDef?.field_type === 'TEXT' && '텍스트 입력 필드'}
                      {fieldDef?.field_type === 'NUMBER' && '숫자 입력 필드'}
                      {fieldDef?.field_type === 'URL' && 'URL 주소'}
                      {!fieldDef && '추가 정보'}
                    </div>
                  </div>
                  <div className="field-value">{String(value) || '-'}</div>
                </div>
              );
            })}
            
            {/* 발행수/기간 */}
            <div className="form-field">
              <div className="field-label-row">
                <div className="field-label">발행수 (1일)</div>
                <div className="help-icon">?</div>
                <div className="help-tooltip">하루 기준 수량. 청구는 ×7×주수.</div>
              </div>
              <div className="field-value">
                {items[0]?.daily_qty || 0}건/1일 · {items[0]?.weeks || 0}주 (총 {order.total_qty})
              </div>
            </div>
          </div>

          {/* 주문 항목 리스트 */}
          <div className="panel-header" style={{ marginTop: '16px' }}>
            <div className="panel-title">주문 항목 상세</div>
            <div className="subtxt">총 {items.length}건</div>
          </div>

          {items.map((item) => (
            <div key={item.id} className="order-item-card">
              <div className="item-header">
                <div className="item-title">{item.client_name}</div>
                <div className="item-summary">
                  {item.daily_qty}건/일 · {item.weeks}주 · 총 {item.total_qty}건
                </div>
              </div>
              <div className="item-details">
                {Object.entries(item.item_details).map(([key, value]) => {
                  const fieldDef = inputDefs.find(def => def.field_key === key);
                  const displayLabel = fieldDef?.label || key;
                  
                  return (
                    <div key={key} className="detail-row">
                      <span className="detail-label">{displayLabel}:</span>
                      <span className="detail-value">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="item-footer">
                <span className="item-price">{item.item_price.toLocaleString('ko-KR')}원</span>
              </div>
            </div>
          ))}

          {/* 증빙/리포트 */}
          <div className="panel-header" style={{ marginTop: '16px' }}>
            <div className="panel-title">증빙 & 리포트</div>
            <div className="subtxt">링크/이미지/CSV/PDF</div>
          </div>
          <div className="proof-list">
            <div className="proof-item">준비중</div>
            <div className="proof-item">준비중</div>
            <div className="proof-item">준비중</div>
          </div>

          {/* 정산 정보 */}
          <div className="panel-header" style={{ marginTop: '16px' }}>
            <div className="panel-title">정산 정보</div>
            <div className="subtxt">포인트 트랜잭션 요약</div>
          </div>
          <table className="calc-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>수량</th>
                <th>단가</th>
                <th>금액</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1일 발행</td>
                <td>{items[0]?.daily_qty || 0}</td>
                <td>-</td>
                <td>-</td>
              </tr>
              <tr>
                <td>× 7일</td>
                <td>{(items[0]?.daily_qty || 0) * 7}</td>
                <td>-</td>
                <td>-</td>
              </tr>
              <tr>
                <td>× 주수({items[0]?.weeks || 0})</td>
                <td>{order.total_qty}</td>
                <td>-</td>
                <td>-</td>
              </tr>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right' }}><b>총합</b></td>
                <td><b>{order.total_price.toLocaleString('ko-KR')}원</b></td>
              </tr>
            </tbody>
          </table>
          
          <div className="cta-row" style={{ marginTop: '10px' }}>
            <div className="btn" onClick={() => router.push('/pointWallet')}>
              포인트 내역 보기
            </div>
            <div className="btn" onClick={() => alert('준비중입니다.')}>
              재주문(복제)
            </div>
            <div className="btn" onClick={() => alert('준비중입니다.')}>
              일시중지
            </div>
            <div 
              className="btn primary" 
              onClick={() => setShowRefundModal(true)}
            >
              환불 신청
            </div>
          </div>
        </aside>

        {/* 액션 버튼 영역 */}
        <section className="action-bar">
          <button 
            className="btn-secondary"
            onClick={() => router.push('/orderList')}
          >
            목록으로
          </button>
          <button 
            className="btn-primary"
            onClick={() => setShowRefundModal(true)}
          >
            환불 신청
          </button>
        </section>
      </main>

      {/* 환불 재확인 모달 */}
      <div className={`modal-backdrop ${showRefundModal ? 'active' : ''}`}>
        <div className="modal" role="dialog" aria-modal="true">
          <h3>환불 신청을 진행할까요?</h3>
          <div>
            주문번호: <b>{order.order_id}</b><br/>
            현재상태: <b>{STATUS_LABELS[order.status]}</b><br/>
            <div className="subtxt" style={{ marginTop: '8px' }}>
              이미 집행된 부분은 환불되지 않을 수 있습니다. 계속 진행하시겠습니까?
            </div>
          </div>
          <div className="footer">
            <button className="btn" onClick={() => setShowRefundModal(false)}>취소</button>
            <button className="btn primary" onClick={handleRefundConfirm}>환불 신청 확정</button>
          </div>
        </div>
      </div>
    </>
  );
}
