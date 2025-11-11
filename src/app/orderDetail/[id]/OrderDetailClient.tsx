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

      {/* 주문 상세 정보 */}
      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">주문 상세 정보</div>
          <div className="subtxt">{order.product_name}</div>
        </div>

        <div className="info-grid">
          <div className="info-row">
            <div className="info-label">상품명</div>
            <div className="info-value">{order.product_name}</div>
          </div>
          <div className="info-row">
            <div className="info-label">주문 일시</div>
            <div className="info-value">
              {new Date(order.created_at).toLocaleString('ko-KR')}
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">진행 기간</div>
            <div className="info-value">{order.period_text}</div>
          </div>
          <div className="info-row">
            <div className="info-label">총 수량</div>
            <div className="info-value">{order.total_qty}건</div>
          </div>
          <div className="info-row">
            <div className="info-label">총 금액</div>
            <div className="info-value">{order.total_price.toLocaleString('ko-KR')}원</div>
          </div>
        </div>
      </section>

      {/* 주문 항목 리스트 */}
      <section className="panel">
        <div className="panel-header">
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
      </section>

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
          onClick={() => alert('환불 신청 기능은 준비중입니다.')}
        >
          환불 신청
        </button>
      </section>
    </main>
  );
}
