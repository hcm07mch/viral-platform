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

type OrderItem = {
  id: string;
  order_id: string;
  client_name: string;
  daily_qty: number;
  weeks: number;
  total_qty: number;
  unit_price: number;
  item_price: number;
  item_details: Record<string, any>;
  unit?: string;
};

type Order = {
  id: string;
  order_id: string;
  product_name: string;
  total_price: number;
  quantity: number;
  status: OrderStatus;
  created_at: string;
  order_items: OrderItem[];
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  received: '접수중',
  pause: '보류',
  running: '구동중',
  done: '작업완료'
};

type ViewMode = 'order' | 'item';
type LayoutMode = 'grid' | 'row';

export default function OrderListClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | OrderStatus>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('item');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('row');

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

  const toggleOrder = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleRefundClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeTab);

  // 주문 항목 단위로 펼치기
  const flattenedItems = filteredOrders.flatMap(order => 
    order.order_items.map(item => ({
      ...item,
      order_id: order.id,
      order_number: order.order_id,
      product_name: order.product_name,
      status: order.status,
      created_at: order.created_at,
      order_total_price: order.total_price
    }))
  );

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
            <div className="orders-filter-title-section">
              <div className="orders-filter-title">내 주문 현황</div>
              
              {/* 뷰 모드 전환 버튼 */}
              <div className="view-mode-toggle">
                <button
                  className={`view-mode-btn ${viewMode === 'item' ? 'active' : ''}`}
                  onClick={() => setViewMode('item')}
                >
                  📦 주문항목 단위
                </button>
                <button
                  className={`view-mode-btn ${viewMode === 'order' ? 'active' : ''}`}
                  onClick={() => setViewMode('order')}
                >
                  📋 주문서 단위
                </button>
              </div>
            </div>

            <div className="orders-filter-actions">
              {/* 레이아웃 모드 전환 버튼 - 주문항목 단위에서만 표시 */}
              {viewMode === 'item' && (
                <div className="layout-mode-toggle">
                  <button
                    className={`layout-mode-btn ${layoutMode === 'row' ? 'active' : ''}`}
                    onClick={() => setLayoutMode('row')}
                    title="리스트 보기"
                  >
                    ☰
                  </button>
                  <button
                    className={`layout-mode-btn ${layoutMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setLayoutMode('grid')}
                    title="그리드 보기"
                  >
                    ⊞
                  </button>
                </div>
              )}

              <div className="orders-tabs">
                <select 
                  className="status-select"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as 'all' | OrderStatus)}
                >
                  <option value="all">전체</option>
                  <option value="received">접수중</option>
                  <option value="pause">보류</option>
                  <option value="running">구동중</option>
                  <option value="done">작업완료</option>
                </select>
              </div>
            </div>
          </div>

          {/* 주문 목록 */}
          <div className={`orders-list-container layout-${layoutMode}`}>
            {filteredOrders.length === 0 ? (
              <div className="empty-state">주문 내역이 없습니다.</div>
            ) : viewMode === 'order' ? (
              // 주문서 단위 보기
              <div className={layoutMode === 'grid' ? 'orders-grid' : 'orders-rows'}>
              {filteredOrders.map(order => {
                const isExpanded = expandedOrderId === order.id;
                return (
                  <div 
                    key={order.id} 
                    className={`order-card ${isExpanded ? 'expanded' : ''}`}
                  >
                    {/* 주문서 헤더 */}
                    <div 
                      className="order-header"
                      onClick={() => toggleOrder(order.id)}
                    >
                      <div className="order-header-left">
                        <h3 className="order-title">
                          주문서 {order.order_id}
                        </h3>
                        <span className="order-date">
                          {formatDate(order.created_at)}
                        </span>
                        <span className="order-summary">
                          {order.product_name} · 총 {order.quantity}건
                        </span>
                      </div>
                      
                      <div className="order-header-right">
                        <div className="order-info">
                          <span 
                            className="status-badge"
                            data-status={order.status}
                          >
                            {STATUS_LABELS[order.status]}
                          </span>
                          <span className="total-amount">
                            {formatCurrency(order.total_price)}
                          </span>
                        </div>
                        <button 
                          className="expand-button"
                          aria-label="주문 항목 펼치기"
                        >
                          {isExpanded ? (
                            <>
                              <span>주문항목 닫기</span>
                              <span className="icon">▲</span>
                            </>
                          ) : (
                            <>
                              <span>주문항목 보기</span>
                              <span className="icon">▼</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 주문 항목 목록 (펼쳐졌을 때만 표시) */}
                    {isExpanded && (
                      <div className="order-items">
                        <h4 className="order-items-title">주문 항목</h4>
                        <table className="items-table">
                          <thead>
                            <tr>
                              <th>항목 ID</th>
                              <th>업체명</th>
                              <th>키워드</th>
                              <th>1일 수량</th>
                              <th>주 수</th>
                              <th>총 수량</th>
                              <th>단가</th>
                              <th>항목별 금액</th>
                              <th>상세</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.order_items.map((item) => (
                              <tr key={item.id}>
                                <td className="item-id-cell">#{item.id.slice(0, 8)}</td>
                                <td className="client-name-cell">{item.client_name}</td>
                                <td className="keyword-cell">{item.item_details?.keyword || '-'}</td>
                                <td>{item.daily_qty}{item.unit || '건'}</td>
                                <td>{item.weeks}주 ({item.weeks * 7}일)</td>
                                <td>{item.total_qty}{item.unit || '건'}</td>
                                <td>{formatCurrency(item.unit_price)}</td>
                                <td className="item-price">{formatCurrency(item.item_price)}</td>
                                <td>
                                  <button
                                    className="table-detail-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/orderDetail/${item.id}`);
                                    }}
                                  >
                                    보기
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={5} className="total-label">
                                총 금액
                              </td>
                              <td className="total-price">
                                {formatCurrency(order.total_price)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            ) : (
              // 주문 항목 단위 보기
              <div className={layoutMode === 'grid' ? 'items-grid' : 'items-rows'}>
                {layoutMode === 'row' && (
                  <div className="items-table-header">
                    <div>상품명</div>
                    <div>업체명</div>
                    <div>키워드</div>
                    <div>상태</div>
                    <div>1일 수량</div>
                    <div>주 수</div>
                    <div>총 수량</div>
                    <div>단가</div>
                    <div>항목 금액</div>
                    <div>상세</div>
                  </div>
                )}
                {flattenedItems.map((item, index) => (
                  <div key={`${item.order_id}-${item.id}-${index}`} className="item-card">
                    {layoutMode === 'row' ? (
                      // 로우 뷰: 그리드 셀로 직접 배치
                      <>
                        <div className="item-cell">{item.product_name}</div>
                        <div className="item-cell">{item.client_name}</div>
                        <div className="item-cell">{item.item_details?.keyword || '-'}</div>
                        <div className="item-cell">
                          <span className="status-badge" data-status={item.status}>
                            {STATUS_LABELS[item.status]}
                          </span>
                        </div>
                        <div className="item-cell">{item.daily_qty}{item.unit || '건'}</div>
                        <div className="item-cell">{item.weeks}주 ({item.weeks * 7}일)</div>
                        <div className="item-cell">{item.total_qty}{item.unit || '건'}</div>
                        <div className="item-cell">{formatCurrency(item.unit_price)}</div>
                        <div className="item-cell price">{formatCurrency(item.item_price)}</div>
                        <div className="item-cell">
                          <button
                            className="item-detail-button"
                            onClick={() => router.push(`/orderDetail/${item.id}`)}
                          >
                            상세보기
                          </button>
                        </div>
                      </>
                    ) : (
                      // 그리드 뷰: 카드 형태
                      <>
                        <div className="item-card-header">
                          <div className="item-card-top">
                            <div className="item-card-main-info">
                              <div className="item-product-name">{item.product_name}</div>
                              <div className="item-client-keyword">
                                <span className="item-client">{item.client_name}</span>
                                <span className="item-keyword">{item.item_details?.keyword || '-'}</span>
                              </div>
                            </div>
                            <span 
                              className="status-badge"
                              data-status={item.status}
                            >
                              {STATUS_LABELS[item.status]}
                            </span>
                          </div>
                          <div className="item-card-date">
                            {formatDate(item.created_at)}
                          </div>
                        </div>
                        
                        <div className="item-card-body">
                          <div className="item-card-row">
                            <span className="item-label">주문서 ID</span>
                            <span className="item-value mono">{item.order_number}</span>
                          </div>
                          <div className="item-card-row">
                            <span className="item-label">항목 ID</span>
                            <span className="item-value mono">#{item.id.slice(0, 8)}</span>
                          </div>
                          <div className="item-card-row">
                            <span className="item-label">1일 수량</span>
                            <span className="item-value">{item.daily_qty}{item.unit || '건'}</span>
                          </div>
                          <div className="item-card-row">
                            <span className="item-label">주 수</span>
                            <span className="item-value">{item.weeks}주 ({item.weeks * 7}일)</span>
                          </div>
                          <div className="item-card-row">
                            <span className="item-label">총 수량</span>
                            <span className="item-value">{item.total_qty}{item.unit || '건'}</span>
                          </div>
                          <div className="item-card-row">
                            <span className="item-label">단가</span>
                            <span className="item-value">{formatCurrency(item.unit_price)}</span>
                          </div>
                          <div className="item-card-row total">
                            <span className="item-label">항목 금액</span>
                            <span className="item-value price">{formatCurrency(item.item_price)}</span>
                          </div>
                        </div>

                        <div className="item-card-footer">
                          <button
                            className="item-detail-button"
                            onClick={() => router.push(`/orderDetail/${item.id}`)}
                          >
                            상세보기
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
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
                주문 금액: <strong>{formatCurrency(selectedOrder.total_price)}</strong>
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
