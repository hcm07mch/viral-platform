'use client';

import { useState } from 'react';
import '@/styles/productDetail.css';
import FormField from '@/components/FormField';

interface Product {
  id: string;
  name: string;
  description: string;
  vendor_base_price: string | number;
  currency: string;
  status: string;
  status_text?: string;
  badge?: string;
  badge_text?: string;
  min_order?: string;
  unit?: string;
  category?: string;
}

interface Notice {
  date: string;
  text: string;
}

interface OrderItem {
  id: string;
  clientName: string;
  dailyCount: number;
  weeks: number;
  totalCount: number;
  estimatedPrice: number;
  details: Record<string, any>;
}

interface Props {
  product: Product;
  tierPrice: number;
  userTier: string;
  notices?: Notice[];
}

export default function ProductDetailClient({ 
  product, 
  tierPrice, 
  userTier,
  notices = []
}: Props) {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, any>>({});

  const toggleNotice = () => {
    setNoticeOpen(!noticeOpen);
  };

  const toggleOrderExpand = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const deleteOrder = (orderId: string) => {
    setOrders(orders.filter(o => o.id !== orderId));
  };

  const handleAddOrder = () => {
    const dailyCount = parseInt(formData.dailyCount || '0');
    const weeks = parseInt(formData.weeks || '0');
    const totalCount = dailyCount * 7 * weeks;
    const estimatedPrice = totalCount * tierPrice;

    const newOrder: OrderItem = {
      id: `order-${Date.now()}`,
      clientName: formData.clientName || '미입력',
      dailyCount,
      weeks,
      totalCount,
      estimatedPrice,
      details: { ...formData }
    };

    setOrders([...orders, newOrder]);
    setFormData({});
  };

  const totalOrders = orders.reduce((sum, o) => sum + o.totalCount, 0);
  const totalPrice = orders.reduce((sum, o) => sum + o.estimatedPrice, 0);

  const handleConfirmOrder = () => {
    alert(`총 ${totalOrders}건, ${totalPrice.toLocaleString('ko-KR')}원의 주문을 확정합니다`);
  };

  return (
    <main className="detail-wrapper">
      <section className="left-column">
        <div className="panel">
          <div className="panel-content">
            <div>
              <div className="product-headline">
                <span>{product.name}</span>
                {product.badge && (
                  <div className={`badge badge-${product.badge}`}>
                    {product.badge_text || product.badge}
                  </div>
                )}
              </div>

              <div className="product-meta-row">
                {product.category && (
                  <div className="meta-chip">카테고리: {product.category}</div>
                )}
                <div className="meta-chip">
                  상태: {product.status_text || product.status}
                </div>
              </div>

              <div className="subtxt">
                {product.description || '상품 설명이 없습니다.'}
              </div>

              {notices.length > 0 && (
                <>
                  <div className="notice-toggle-btn" onClick={toggleNotice}>
                    {noticeOpen ? '공지 숨기기' : '공지 확인하기'}
                  </div>
                  <div className={`notice-panel ${noticeOpen ? 'active' : ''}`}>
                    {notices.map((notice, idx) => (
                      <div key={idx} className="notice-item">
                        <div className="notice-date">{notice.date}</div>
                        <div className="notice-text">{notice.text}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="panel-side">
              <div className="deadline-hint">
                오늘 15:00 이후 접수분은 익일 처리
              </div>
              <div className="product-price-highlight">
                <div className="price-main-detail">
                  <div className="tier-price-detail">{tierPrice.toLocaleString('ko-KR')}원</div>
                  {product.unit && (
                    <div className="price-unit-detail">/ {product.unit}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span>주문 입력</span>
            <span className="subtxt">
              필드는 상품마다 다르게 설정될 수 있습니다.
            </span>
          </div>

          <div className="order-form-block">
            <div className="form-section">
              <div className="form-section-header">
                <div className="step-badge">STEP 1</div>
                <span className="section-title">기본 정보</span>
                <span className="section-subtitle">광고를 집행할 업체와 관련된 정보를 입력하세요</span>
              </div>

              <div className="order-form-row">
                <FormField
                  id="clientName"
                  type="TEXT"
                  label="상호명"
                  helpText="주문하실 상호명을 입력해주세요."
                  placeholder="예: 콩콩드 서탄지점"
                  value={formData.clientName || ''}
                  onChange={(value) => setFormData({ ...formData, clientName: value })}
                />

                <FormField
                  id="platform"
                  type="TEXT"
                  label="매체"
                  helpText="광고를 노출할 플랫폼 채널입니다"
                  placeholder="예: 네이버 플레이스"
                  value={formData.platform || ''}
                  onChange={(value) => setFormData({ ...formData, platform: value })}
                />

                <FormField
                  id="keywords"
                  type="TEXT"
                  label="키워드"
                  helpText="노출용 키워드 또는 검색어/문구입니다"
                  placeholder="예: 강릉맛집, 가족 외식 이벤트"
                  value={formData.keywords || ''}
                  onChange={(value) => setFormData({ ...formData, keywords: value })}
                />
              </div>

              <div className="order-form-row">
                <FormField
                  id="placeUrl"
                  type="URL"
                  label="플레이스 URL"
                  helpText="리뷰/콘텐츠를 연결할 실제 매장 위치 링크입니다"
                  placeholder="https://place.naver.com/..."
                  value={formData.placeUrl || ''}
                  onChange={(value) => setFormData({ ...formData, placeUrl: value })}
                />

                <FormField
                  id="storeUrl"
                  type="URL"
                  label="스토어 URL"
                  helpText="상품 판매 페이지 또는 점포 주소입니다"
                  placeholder="https://smartstore.naver.com/..."
                  value={formData.storeUrl || ''}
                  onChange={(value) => setFormData({ ...formData, storeUrl: value })}
                />
              </div>

              <div className="order-form-row">
                <FormField
                  id="receiptImage"
                  type="FILE"
                  label="영수증 이미지"
                  helpText="실제 방문/구매 인증용 자료입니다\nJPG/PNG 파일 권장."
                  accept="image/*"
                  value={formData.receiptImage || ''}
                  onChange={(value) => setFormData({ ...formData, receiptImage: value })}
                />
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <div className="step-badge">STEP 2</div>
                <span className="section-title">수량 및 금액</span>
                <span className="section-subtitle">주문 수량을 입력하고 예상 금액을 확인하세요</span>
              </div>

              <div className="order-form-row">
                <FormField
                  id="dailyCount"
                  type="NUMBER"
                  label="발행량 (1일 기준 수량)"
                  helpText="하루에 진행할 게시/리뷰 수량입니다"
                  placeholder="예: 5"
                  value={formData.dailyCount || ''}
                  onChange={(value) => setFormData({ ...formData, dailyCount: value })}
                />

                <FormField
                  id="weeks"
                  type="NUMBER"
                  label="주수"
                  helpText="캠페인을 몇 주간 집행할지 입니다"
                  placeholder="예: 2"
                  value={formData.weeks || ''}
                  onChange={(value) => setFormData({ ...formData, weeks: value })}
                />
              </div>

              <div className="order-form-row">
                <div className="calc-preview-box">
                  <div><strong>계산 방식</strong></div>
                  <div>(1일 수량) × 7일 × (주수)</div>
                  <div className="calc-amount" style={{ marginTop: '6px' }}>
                    예: {formData.dailyCount || 0}건 × 7일 × {formData.weeks || 0}주 = 총 {(parseInt(formData.dailyCount || '0') * 7 * parseInt(formData.weeks || '0'))}건
                  </div>
                  <div style={{ fontSize: '11px', color: '#777', marginTop: '6px' }}>
                    예상 발주 금액: {((parseInt(formData.dailyCount || '0') * 7 * parseInt(formData.weeks || '0')) * tierPrice).toLocaleString('ko-KR')}원
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="add-order-btn" onClick={handleAddOrder}>
            + 이 내용으로 주문 추가
          </div>
          <div className="subtxt" style={{ marginTop: '8px' }}>
            여러 고객사의 주문을 한번에 추가할 수 있습니다.
          </div>
        </div>
      </section>

      <aside className="right-column">
        <div className="orders-accumulated">
          <div className="orders-accumulated-header">
            <div>누적 주문 목록</div>
            <div style={{ fontSize: '11px', color: '#777', lineHeight: '1.4', textAlign: 'right' }}>
              총 {orders.length}건<br/>클릭하면 상세 펼침
            </div>
          </div>
          <div className="acc-order-box">
            {orders.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                주문을 추가해주세요
              </div>
            ) : (
              orders.map((order) => (
                <div 
                  key={order.id} 
                  className={`acc-order ${expandedOrders.has(order.id) ? 'active' : ''}`}
                >
                  <div className="acc-delete-btn" onClick={() => deleteOrder(order.id)}>
                    삭제
                  </div>
                  <div className="acc-order-head" onClick={() => toggleOrderExpand(order.id)}>
                    <div className="acc-summary-left">
                      <div className="client-name">{order.clientName} ({product.name})</div>
                      <div>{order.dailyCount}건/1일 · {order.weeks}주 진행</div>
                    </div>
                    <div className="acc-summary-right">
                      <div>총 {order.totalCount}건</div>
                      <div className="acc-summary-price">
                        예상 {order.estimatedPrice.toLocaleString('ko-KR')}원
                      </div>
                    </div>
                  </div>
                  <div className="acc-order-body">
                    매체: {order.details.platform || '-'}<br/>
                    키워드: {order.details.keywords || '-'}<br/>
                    플레이스 URL: {order.details.placeUrl || '-'}<br/>
                    스토어 URL: {order.details.storeUrl || '-'}<br/>
                    마감 규칙: 15:00 이후 익일 접수
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="checkout-summary">
          <div className="summary-row">
            <div>총 주문 수량 합계</div>
            <div>{totalOrders}건</div>
          </div>

          <div className="summary-row">
            <div>예상 총 금액</div>
            <div className="summary-total">{totalPrice.toLocaleString('ko-KR')}원</div>
          </div>

          <div className="balance-row">
            보유 포인트 조회 중..<br/>
            차감 예상: {totalPrice.toLocaleString('ko-KR')} P
          </div>

          <div className="deadline-warning">
            ⚠ 오늘 15:00 이후 확정 시 익일 주문은 익일 접수로 처리됩니다
          </div>

          <div className="confirm-btn" onClick={handleConfirmOrder}>
            주문 확정 (포인트 차감)
          </div>

          <div className="subtxt" style={{ marginTop: '12px' }}>
            주문 확정 후에는 상태가 "접수됨"으로 표시되며,
            관리자가 확인 후 "구동중"으로 전환됩니다
          </div>
        </div>
      </aside>
    </main>
  );
}