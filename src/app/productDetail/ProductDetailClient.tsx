'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/productDetail.css';
import FormField from '@/components/FormField';
import { useAlert } from '@/contexts/AlertContext';

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

interface InputDef {
  id: number;
  product_id: number;
  field_key: string;
  label: string;
  field_type: string;
  required: boolean;
  sort_order: number;
  validation: string | null;
  help_text: string | null;
  description: string | null;
  min_select: number | null;
  max_select: number | null;
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
  userBalance: number;
  notices?: Notice[];
  inputDefs: InputDef[];
}

export default function ProductDetailClient({ 
  product, 
  tierPrice, 
  userTier,
  userBalance,
  notices = [],
  inputDefs = []
}: Props) {
  const router = useRouter();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, any>>({});
  const { showAlert } = useAlert();

  // orderConfirm에서 돌아왔을 때 주문 데이터 복원
  useEffect(() => {
    const pendingOrderStr = sessionStorage.getItem('pendingOrder');
    if (pendingOrderStr) {
      try {
        const pendingOrder = JSON.parse(pendingOrderStr);
        if (pendingOrder.productId === product.id && pendingOrder.items) {
          // 주문 항목 복원
          const restoredOrders: OrderItem[] = pendingOrder.items.map((item: any, index: number) => ({
            id: `order-${Date.now()}-${index}`,
            clientName: item.clientName,
            dailyCount: item.dailyCount,
            weeks: item.weeks,
            totalCount: item.totalCount,
            estimatedPrice: item.estimatedPrice,
            details: item.details
          }));
          setOrders(restoredOrders);
        }
      } catch (err) {
        console.error('주문 데이터 복원 오류:', err);
      }
    }
  }, [product.id]);

  // 수량 관련 필드와 일반 필드 분리
  const quantityFields = inputDefs.filter(def => 
    def.field_key === 'daily_qty' || def.field_key === 'weeks'
  );
  const generalFields = inputDefs.filter(def => 
    def.field_key !== 'daily_qty' && def.field_key !== 'weeks'
  );

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
    if (editingOrderId === orderId) {
      setEditingOrderId(null);
      setEditingData({});
    }
  };

  const startEditOrder = (order: OrderItem) => {
    setEditingOrderId(order.id);
    setEditingData({ ...order.details });
  };

  const cancelEditOrder = () => {
    setEditingOrderId(null);
    setEditingData({});
  };

  const saveEditOrder = (orderId: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        const dailyCount = parseInt(editingData.daily_qty || '0');
        const weeks = parseInt(editingData.weeks || '0');
        const totalCount = dailyCount * 7 * weeks;
        const estimatedPrice = totalCount * tierPrice;
        
        return {
          ...order,
          clientName: editingData.store_name || editingData.clientName || order.clientName,
          dailyCount,
          weeks,
          totalCount,
          estimatedPrice,
          details: { ...editingData }
        };
      }
      return order;
    });
    
    setOrders(updatedOrders);
    setEditingOrderId(null);
    setEditingData({});
    showAlert('주문 정보가 수정되었습니다', 'success');
  };

  const handleAddOrder = () => {
    // 필수 항목 검증
    const requiredFields = inputDefs.filter(def => def.required);
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      const value = formData[field.field_key];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field.label);
      }
    }
    
    if (missingFields.length > 0) {
      showAlert(`다음 필수 항목을 입력해주세요:\n${missingFields.join(', ')}`, 'error');
      return;
    }

    const dailyCount = parseInt(formData.daily_qty || formData.dailyCount || '0');
    const weeks = parseInt(formData.weeks || '0');
    const totalCount = dailyCount * 7 * weeks;
    const estimatedPrice = totalCount * tierPrice;

    const newOrder: OrderItem = {
      id: `order-${Date.now()}`,
      clientName: formData.store_name || formData.clientName || '미입력',
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
    if (orders.length === 0) {
      showAlert('주문할 항목이 없습니다.', 'warn');
      return;
    }

    if (userBalance < totalPrice) {
      showAlert('포인트가 부족합니다.', 'error');
      return;
    }

    // 주문 데이터를 세션 스토리지에 저장
    const orderData = {
      productId: product.id,
      productName: product.name,
      unitPrice: tierPrice,
      totalQuantity: totalOrders,
      totalPrice: totalPrice,
      inputDefs: inputDefs, // field_key -> label 매핑을 위해 추가
      items: orders.map(order => ({
        clientName: order.clientName,
        dailyCount: order.dailyCount,
        weeks: order.weeks,
        totalCount: order.totalCount,
        estimatedPrice: order.estimatedPrice,
        details: order.details
      }))
    };

    sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));
    
    // orderConfirm 페이지로 리다이렉트
    router.push('/orderConfirm');
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
                {generalFields.map((field) => (
                  <FormField
                    key={field.id}
                    id={field.field_key}
                    type={field.field_type as any}
                    label={field.label}
                    helpText={field.help_text || undefined}
                    placeholder={field.description || `${field.label}를 입력하세요`}
                    required={field.required}
                    value={formData[field.field_key] || ''}
                    onChange={(value) => setFormData({ ...formData, [field.field_key]: value })}
                  />
                ))}
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <div className="step-badge">STEP 2</div>
                <span className="section-title">수량 및 금액</span>
                <span className="section-subtitle">주문 수량을 입력하고 예상 금액을 확인하세요</span>
              </div>

              <div className="order-form-row quantity-row">
                {quantityFields.map((field) => (
                  <FormField
                    key={field.id}
                    id={field.field_key}
                    type={field.field_type as any}
                    label={field.label}
                    helpText={field.help_text || undefined}
                    placeholder={field.description || `${field.label}를 입력하세요`}
                    required={field.required}
                    value={formData[field.field_key] || ''}
                    onChange={(value) => setFormData({ ...formData, [field.field_key]: value })}
                  />
                ))}
                
                <div className="calc-preview-box">
                  <div><strong>계산 방식</strong></div>
                  <div>(1일 수량) × 7일 × (주수)</div>
                  <div className="calc-amount" style={{ marginTop: '6px' }}>
                    예: {formData.daily_qty || 0}건 × 7일 × {formData.weeks || 0}주 = 총 {(parseInt(formData.daily_qty || '0') * 7 * parseInt(formData.weeks || '0'))}건
                  </div>
                  <div style={{ fontSize: '11px', color: '#777', marginTop: '6px' }}>
                    예상 발주 금액: {((parseInt(formData.daily_qty || '0') * 7 * parseInt(formData.weeks || '0')) * tierPrice).toLocaleString('ko-KR')}원
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="add-order-btn" onClick={handleAddOrder}>
            + 이 내용으로 주문 추가
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
              orders.map((order) => {
                const isEditing = editingOrderId === order.id;
                const displayData = isEditing ? editingData : order.details;
                
                return (
                  <div 
                    key={order.id} 
                    className={`acc-order ${expandedOrders.has(order.id) ? 'active' : ''}`}
                  >
                    <div className="acc-delete-btn" onClick={() => deleteOrder(order.id)}>
                      삭제
                    </div>
                    {!isEditing && (
                      <div 
                        className="acc-edit-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          // active가 아니면 펼치기
                          if (!expandedOrders.has(order.id)) {
                            const newExpanded = new Set(expandedOrders);
                            newExpanded.add(order.id);
                            setExpandedOrders(newExpanded);
                          }
                          startEditOrder(order);
                        }}
                      >
                        수정
                      </div>
                    )}
                    {!isEditing && (
                      <div 
                        className="acc-detail-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOrderExpand(order.id);
                        }}
                      >
                        {expandedOrders.has(order.id) ? '접기' : '더보기'}
                      </div>
                    )}
                    <div className="acc-order-head">
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
                      {isEditing ? (
                        <div className="edit-order-inline">
                          {inputDefs.map((field) => {
                            const value = displayData[field.field_key];
                            
                            return (
                              <div key={field.id} className="inline-field-row">
                                <span className="field-label">{field.label}:</span>
                                <input
                                  type="text"
                                  className="inline-input"
                                  value={value || ''}
                                  onChange={(e) => setEditingData({ ...editingData, [field.field_key]: e.target.value })}
                                  placeholder={`${field.label} 입력`}
                                />
                              </div>
                            );
                          })}
                          <div className="inline-actions">
                            <button 
                              className="save-edit-btn"
                              onClick={() => saveEditOrder(order.id)}
                            >
                              저장
                            </button>
                            <button 
                              className="cancel-edit-btn"
                              onClick={cancelEditOrder}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {inputDefs.map((field) => {
                            const value = order.details[field.field_key];
                            return (
                              <div key={field.id}>
                                <strong>{field.label}:</strong> {value || '-'}<br/>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
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
            <div className="balance-item">
              <span className="balance-label">보유 포인트</span>
              <span className="balance-value">{userBalance.toLocaleString('ko-KR')} P</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">차감 예상</span>
              <span className="balance-value deduct">-{totalPrice.toLocaleString('ko-KR')} P</span>
            </div>
            <div className="balance-item balance-after">
              <span className="balance-label">차감 후 잔여</span>
              <span className={`balance-value ${(userBalance - totalPrice) < 0 ? 'insufficient' : 'sufficient'}`}>
                {(userBalance - totalPrice).toLocaleString('ko-KR')} P
              </span>
            </div>
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