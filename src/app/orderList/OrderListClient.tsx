'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/orderList.css';

type OrderStatus = 'received' | 'pause' | 'running' | 'done';

type InputDef = {
  id: number;
  product_id: number;
  field_key: string;
  label: string;
  field_type: string;
  required: boolean;
  sort_order: number;
};

type Order = {
  id: string;
  order_id: string;
  client_name: string;
  product_name: string;
  daily_qty: number;
  weeks: number;
  total_qty: number;
  start_date: string;
  end_date: string;
  status: OrderStatus;
  details: Record<string, any>;
  inputDefs?: InputDef[];
  created_at: string;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  received: '접수중',
  pause: '보류',
  running: '구동중',
  done: '작업완료'
};

export default function OrderListClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | OrderStatus>('all');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders/list');
      if (!response.ok) {
        throw new Error('주문 목록을 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('주문 목록 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundClick = (order: Order) => {
    setSelectedOrder(order);
    setShowRefundModal(true);
  };

  const handleRefundConfirm = () => {
    if (!selectedOrder) return;
    console.log('중단 신청:', selectedOrder.order_id);
    // TODO: API 호출
    router.push('/refundRequest');
    setShowRefundModal(false);
  };

  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeTab);

  if (isLoading) {
    return (
      <main className="orders-wrapper">
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </main>
    );
  }

  return (
    <>
      <main className="orders-wrapper">
        <section className="orders-panel">
          {/* 상태 필터 헤더 */}
          <div className="orders-filter-header">
            <div className="orders-filter-title">내 주문 현황</div>

            <div className="orders-tabs">
              <div 
                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                전체
              </div>
              <div 
                className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
                onClick={() => setActiveTab('received')}
              >
                접수중
              </div>
              <div 
                className={`tab-btn ${activeTab === 'pause' ? 'active' : ''}`}
                onClick={() => setActiveTab('pause')}
              >
                보류
              </div>
              <div 
                className={`tab-btn ${activeTab === 'running' ? 'active' : ''}`}
                onClick={() => setActiveTab('running')}
              >
                구동중
              </div>
              <div 
                className={`tab-btn ${activeTab === 'done' ? 'active' : ''}`}
                onClick={() => setActiveTab('done')}
              >
                작업완료
              </div>
            </div>
          </div>

          {/* 리스트 헤더 */}
          <div className="orders-list-headrow">
            <div>상호명 / 주문번호</div>
            <div>상품명 / 요약</div>
            <div>기간</div>
            <div>상태</div>
            <div>액션</div>
          </div>

          {/* 주문 목록 */}
          <div className="orders-list-container">
            {filteredOrders.length === 0 ? (
              <div className="empty-state">주문 내역이 없습니다.</div>
            ) : (
              filteredOrders.map(order => {
                return (
                  <div 
                    key={order.id} 
                    className="order-row-card"
                    onClick={() => router.push(`/orderDetail/${order.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="order-row-top">
                      {/* 상호명 / 주문번호 */}
                      <div className="order-col">
                        <div className="client-name">{order.client_name}</div>
                        <div className="order-id">{order.order_id}</div>
                      </div>

                      {/* 상품명 / 요약 */}
                      <div className="order-col">
                        {order.product_name}<br />
                        <span style={{ fontSize: '10px', color: '#777' }}>
                          {order.daily_qty}건/1일 · {order.weeks}주 진행 · 총 {order.total_qty}건
                        </span>
                      </div>

                      {/* 기간 */}
                      <div className="order-col">
                        {order.start_date} ~ {order.end_date}
                      </div>

                      {/* 상태 */}
                      <div className="order-col">
                        <span 
                          className="status-chip"
                          data-status={order.status}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>

                      {/* 액션 */}
                      <div className="order-col">
                        <div className="order-actions">
                          <div 
                            className="order-action-btn refund-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefundClick(order);
                            }}
                          >
                            중단 신청
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* 중단 신청 재확인 모달 */}
      {showRefundModal && selectedOrder && (
        <div className="refund-modal-backdrop active">
          <div className="refund-modal" role="dialog" aria-modal="true">
            <div className="refund-modal-header">
              중단 신청을 진행할까요?
            </div>

            <div className="refund-modal-body">
              <div className="refund-modal-row">
                주문번호: <strong>{selectedOrder.order_id}</strong>
              </div>
              <div className="refund-modal-row">
                상품명: <strong>{selectedOrder.product_name}</strong>
              </div>
              <div className="refund-modal-row">
                현재 상태: <strong>{STATUS_LABELS[selectedOrder.status]}</strong>
              </div>
              <div className="refund-modal-row">
                예상 중단 대상 기간: <strong>{selectedOrder.start_date} ~ {selectedOrder.end_date}</strong>
              </div>

              <div className="warn-box">
                중단 신청 접수 후 관리자가 검토합니다.<br/>
                이미 진행된 부분은 중단되지 않을 수 있습니다.<br/>
                계속 진행하시겠습니까?
              </div>
            </div>

            <div className="refund-modal-footer">
              <div 
                className="modal-btn" 
                onClick={() => setShowRefundModal(false)}
              >
                취소
              </div>
              <div 
                className="modal-btn danger" 
                onClick={handleRefundConfirm}
              >
                중단 신청 확정
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 하단 안내바 */}
      <footer className="orders-footer-bar">
        ※ "중단 신청"은 관리자가 확인 후 포인트로 환급 처리됩니다.
        ※ 작업완료 후 7일이 지난 주문은 중단 신청이 제한될 수 있습니다.
      </footer>
    </>
  );
}
