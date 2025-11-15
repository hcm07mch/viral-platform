'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import '@/styles/productDetail.css';
import FormField from '@/components/FormField';
import { useAlert } from '@/contexts/AlertContext';
import { useConfirm } from '@/contexts/ConfirmContext';

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

interface Customer {
  id: string;
  client_name: string;
  place_id?: string;
  place_url?: string;
  contact?: string;
  extra_fields?: Record<string, any>;
}

interface Keyword {
  id: string;
  keyword: string;
}

interface Props {
  product: Product;
  tierPrice: number;
  userTier: string;
  userBalance: number;
  notices?: Notice[];
  inputDefs: InputDef[];
  userId?: string;
}

export default function ProductDetailClient({ 
  product, 
  tierPrice, 
  userTier,
  userBalance,
  notices = [],
  inputDefs = [],
  userId
}: Props) {
  const router = useRouter();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerKeywords, setCustomerKeywords] = useState<Keyword[]>([]);
  const [showKeywordModal, setShowKeywordModal] = useState<boolean>(false);
  const [customKeywordInput, setCustomKeywordInput] = useState<string>('');
  const [isCustomKeywordMode, setIsCustomKeywordMode] = useState<boolean>(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>('');
  const [keywordSearchTerm, setKeywordSearchTerm] = useState<string>('');
  const [isCustomerSearchFocused, setIsCustomerSearchFocused] = useState<boolean>(false);
  
  // DATE 필드의 초기값을 오늘 날짜로 설정
  const getInitialFormData = () => {
    const initialData: Record<string, any> = {};
    inputDefs.forEach(def => {
      if (def.field_type === 'DATE') {
        // 오늘 날짜를 YYYY-MM-DD 형식으로 설정
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        initialData[def.field_key] = `${year}-${month}-${day}`;
      }
    });
    return initialData;
  };
  
  const [formData, setFormData] = useState<Record<string, any>>(getInitialFormData());
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, any>>({});
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();

  // 상품 주문 가능 여부 확인
  const isProductActive = product.status === 'fine';
  const isDiscontinued = product.status === 'off';

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

  // 고객 목록 불러오기
  useEffect(() => {
    if (!userId) return;

    const fetchCustomers = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customers')
        .select('id, client_name, place_id, place_url, contact, extra_fields')
        .eq('user_id', userId)
        .order('client_name', { ascending: true });

      if (error) {
        console.error('고객 목록 조회 오류:', error);
        return;
      }

      setCustomers(data || []);
    };

    fetchCustomers();
  }, [userId]);

  // 고객 선택 시 폼 데이터 자동 입력
  const handleCustomerSelect = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setShowKeywordModal(false);
    setCustomerKeywords([]);

    if (!customerId) {
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const autoFillData: Record<string, any> = {};

    // 기본 필드 매핑
    if (customer.client_name) {
      autoFillData['client_name'] = customer.client_name;
    }
    if (customer.place_id) {
      autoFillData['place_id'] = customer.place_id;
    }
    if (customer.contact) {
      autoFillData['contact'] = customer.contact;
    }

    // extra_fields 매핑
    if (customer.extra_fields) {
      Object.keys(customer.extra_fields).forEach(key => {
        autoFillData[key] = customer.extra_fields![key];
      });
    }

    // 기존 formData와 병합 (기존 값 유지하면서 고객 정보 덮어쓰기)
    setFormData(prev => ({ ...prev, ...autoFillData }));
    
    // 검색어 초기화
    setCustomerSearchTerm('');

    // keyword 필드가 있는지 확인
    const hasKeywordField = inputDefs.some(def => def.field_key === 'keyword');

    if (hasKeywordField && userId) {
      // 해당 고객의 키워드 목록 가져오기
      const supabase = createClient();
      const { data: keywords, error } = await supabase
        .from('customer_keywords')
        .select('id, keyword')
        .eq('customer_id', customerId)
        .order('keyword', { ascending: true });

      if (error) {
        console.error('키워드 조회 오류:', error);
      } else if (keywords && keywords.length > 0) {
        setCustomerKeywords(keywords);
        setShowKeywordModal(true);
        showAlert(`${customer.client_name} 고객 정보가 입력되었습니다`, 'success');
        return; // 모달을 보여주므로 여기서 리턴
      }
    }

    showAlert(`${customer.client_name} 고객 정보가 입력되었습니다`, 'success');
  };

  // 키워드 필드 포커스 시 모달 표시
  const handleKeywordFocus = () => {
    if (selectedCustomerId && customerKeywords.length > 0) {
      setCustomKeywordInput(formData.keyword || '');
      setIsCustomKeywordMode(false);
      setKeywordSearchTerm('');
      setShowKeywordModal(true);
    }
  };

  // 고객 검색 필터링
  const filteredCustomers = customers.filter(customer =>
    customer.client_name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    (customer.place_id && customer.place_id.includes(customerSearchTerm))
  );

  // 키워드 검색 필터링
  const filteredKeywords = customerKeywords.filter(kw =>
    kw.keyword.toLowerCase().includes(keywordSearchTerm.toLowerCase())
  );

  // 키워드 선택 핸들러
  const handleKeywordSelect = (keyword: string) => {
    // 편집 중인 주문이 있으면 editingData 업데이트
    if (editingOrderId) {
      setEditingData(prev => ({ ...prev, keyword: keyword }));
    } else {
      setFormData(prev => ({ ...prev, keyword: keyword }));
    }
    setShowKeywordModal(false);
  };

  // 직접 입력 모드 활성화
  const handleCustomKeywordMode = () => {
    setIsCustomKeywordMode(true);
    // 편집 중인 주문이 있으면 editingData에서, 없으면 formData에서 가져오기
    const currentKeyword = editingOrderId 
      ? editingData.keyword || '' 
      : formData.keyword || '';
    setCustomKeywordInput(currentKeyword);
  };

  // 커스텀 키워드 저장
  const handleSaveCustomKeyword = () => {
    // 편집 중인 주문이 있으면 editingData 업데이트
    if (editingOrderId) {
      setEditingData(prev => ({ ...prev, keyword: customKeywordInput }));
    } else {
      setFormData(prev => ({ ...prev, keyword: customKeywordInput }));
    }
    setShowKeywordModal(false);
    setIsCustomKeywordMode(false);
  };

  // 모달 닫기 (키워드 선택 안함)
  const handleSkipKeyword = () => {
    setShowKeywordModal(false);
    setIsCustomKeywordMode(false);
  };

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

  const deleteOrder = async (orderId: string) => {
    const confirmed = await showConfirm({
      title: '주문 삭제',
      message: '정말로 삭제하시겠습니까?',
      confirmText: '삭제',
      cancelText: '취소',
      confirmColor: 'danger'
    });

    if (confirmed) {
      setOrders(orders.filter(o => o.id !== orderId));
      if (editingOrderId === orderId) {
        setEditingOrderId(null);
        setEditingData({});
      }
      showAlert('주문이 삭제되었습니다', 'success');
    }
  };

  const startEditOrder = (order: OrderItem) => {
    setEditingOrderId(order.id);
    setEditingData({ ...order.details });
    
    // 선택된 고객 ID가 있고, 키워드 필드가 있는 경우 키워드 목록 다시 가져오기
    const customerId = order.details.customer_id || selectedCustomerId;
    const hasKeywordField = inputDefs.some(def => def.field_key === 'keyword');
    
    if (customerId && hasKeywordField && userId) {
      const supabase = createClient();
      supabase
        .from('customer_keywords')
        .select('id, keyword')
        .eq('customer_id', customerId)
        .order('keyword', { ascending: true })
        .then(({ data: keywords, error }) => {
          if (!error && keywords && keywords.length > 0) {
            setCustomerKeywords(keywords);
          }
        });
    }
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
          clientName: editingData.client_name || editingData.clientName || order.clientName,
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
      clientName: formData.client_name || formData.clientName || '미입력',
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

  // 주문 항목 복제
  const duplicateOrder = (orderId: string) => {
    const orderToDuplicate = orders.find(o => o.id === orderId);
    if (!orderToDuplicate) return;

    const newOrder: OrderItem = {
      id: `order-${Date.now()}`,
      clientName: orderToDuplicate.clientName,
      dailyCount: orderToDuplicate.dailyCount,
      weeks: orderToDuplicate.weeks,
      totalCount: orderToDuplicate.totalCount,
      estimatedPrice: orderToDuplicate.estimatedPrice,
      details: { ...orderToDuplicate.details }
    };

    setOrders([...orders, newOrder]);
    showAlert('주문 항목이 복제되었습니다', 'success');
  };

  // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
                {isDiscontinued && (
                  <div className="badge badge-discontinued">
                    중단됨
                  </div>
                )}
              </div>

              <div className="product-meta-row">
                {product.category && (
                  <div className="meta-chip">카테고리: {product.category}</div>
                )}
                <div className={`meta-chip ${isDiscontinued ? 'status-discontinued' : ''}`}>
                  상태: {product.status_text || product.status}
                </div>
              </div>

              {isDiscontinued && (
                <div className="discontinued-notice">
                  <div className="discontinued-icon">⚠️</div>
                  <div className="discontinued-content">
                    <div className="discontinued-title">주문 불가 상품</div>
                    <div className="discontinued-message">
                      이 상품은 현재 구동이 중단되어 주문하실 수 없습니다.
                      다른 상품을 이용해주세요.
                    </div>
                  </div>
                </div>
              )}

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
                  <div className="tier-price-detail">{tierPrice.toLocaleString('ko-KR')} 🪙</div>
                  {product.unit && (
                    <div className="price-unit-detail">/ {product.unit}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`panel ${isDiscontinued ? 'panel-disabled' : ''}`}>
          <div className="panel-header">
            <span>주문 입력</span>
            <span className="subtxt">
              {isDiscontinued ? '이 상품은 주문하실 수 없습니다.' : '필드는 상품마다 다르게 설정될 수 있습니다.'}
            </span>
          </div>

          <div className="order-form-block">
            <div className="form-section">
              <div className="form-section-header">
                <div className="step-badge">STEP 1</div>
                <span className="section-title">기본 정보</span>
                <span className="section-subtitle">광고를 집행할 업체와 관련된 정보를 입력하세요</span>
              </div>

              {userId && customers.length > 0 && (
                <div className="customer-select-wrapper" style={{ marginBottom: '20px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label htmlFor="customer-search" style={{ fontWeight: '500', fontSize: '14px', color: '#374151', margin: 0 }}>
                      💼 등록된 고객 선택 (선택사항)
                    </label>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      💡 고객을 선택하면 저장된 정보가 자동으로 입력됩니다
                      {customerSearchTerm.trim() !== '' ? (
                        <span style={{ color: '#3b82f6', marginLeft: '8px' }}>
                          ({filteredCustomers.length}건 검색됨)
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', marginLeft: '8px' }}>
                          (전체 {customers.length}건)
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    id="customer-search"
                    type="text"
                    placeholder={isCustomerSearchFocused ? '' : '🔍 고객명 또는 플레이스 ID로 검색...'}
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#111827',
                      backgroundColor: '#f9fafb',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      setIsCustomerSearchFocused(true);
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      setIsCustomerSearchFocused(false);
                      // Delay to allow click on dropdown items
                      setTimeout(() => {
                        if (e.currentTarget) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = '#d1d5db';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }, 200);
                    }}
                    disabled={!isProductActive}
                  />
                  {customerSearchTerm.trim() !== '' && filteredCustomers.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      zIndex: 1000,
                      maxHeight: '280px',
                      overflowY: 'auto'
                    }}>
                      {filteredCustomers.slice(0, 5).map((customer, index) => (
                        <div
                          key={customer.id}
                          onMouseDown={() => handleCustomerSelect(customer.id)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: index < Math.min(4, filteredCustomers.length - 1) ? '1px solid #f3f4f6' : 'none',
                            transition: 'background-color 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827', lineHeight: '1.3' }}>
                            {customer.client_name}
                          </div>
                          {customer.place_id && (
                            <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: '1.3' }}>
                              (ID: {customer.place_id})
                            </div>
                          )}
                        </div>
                      ))}
                      {filteredCustomers.length > 5 && (
                        <div style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          color: '#9ca3af',
                          textAlign: 'center',
                          backgroundColor: '#f9fafb',
                          borderTop: '1px solid #f3f4f6'
                        }}>
                          +{filteredCustomers.length - 5}개 더 있음 (검색어를 구체화하세요)
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 전체 고객 목록 드롭다운 */}
                  {customerSearchTerm.trim() === '' && (
                    <details style={{ marginTop: '12px' }}>
                      <summary style={{
                        padding: '10px 12px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#6b7280',
                        fontWeight: '500',
                        userSelect: 'none',
                        transition: 'all 0.2s'
                      }}>
                        📋 전체 고객 목록 보기
                      </summary>
                      <div style={{
                        marginTop: '8px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        backgroundColor: '#ffffff'
                      }}>
                        {customers.map((customer, index) => (
                          <div
                            key={customer.id}
                            onClick={() => handleCustomerSelect(customer.id)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: index < customers.length - 1 ? '1px solid #f3f4f6' : 'none',
                              transition: 'background-color 0.15s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f9fafb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                            }}
                          >
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827', lineHeight: '1.3' }}>
                              {customer.client_name}
                            </div>
                            {customer.place_id && (
                              <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: '1.3' }}>
                                (ID: {customer.place_id})
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

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
                    onFocus={field.field_key === 'keyword' ? handleKeywordFocus : undefined}
                    min={field.field_type === 'DATE' ? getTodayDate() : undefined}
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
                    예상 발주 금액: {((parseInt(formData.daily_qty || '0') * 7 * parseInt(formData.weeks || '0')) * tierPrice).toLocaleString('ko-KR')} 🪙
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div 
            className={`add-order-btn ${isDiscontinued ? 'disabled' : ''}`} 
            onClick={isDiscontinued ? undefined : handleAddOrder}
            style={isDiscontinued ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
          >
            {isDiscontinued ? '⚠️ 주문 불가 (상품 중단됨)' : '+ 이 내용으로 주문 추가'}
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
                        className="acc-duplicate-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateOrder(order.id);
                        }}
                        title="이 주문 복제하기"
                      >
                        복제
                      </div>
                    )}
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
                          예상 {order.estimatedPrice.toLocaleString('ko-KR')} 🪙
                        </div>
                      </div>
                    </div>
                    <div className="acc-order-body">
                      {isEditing ? (
                        <div className="edit-order-inline">
                          {inputDefs.map((field) => {
                            const value = displayData[field.field_key];
                            
                            // 필드 타입에 따라 적절한 input type 결정
                            const getInputType = () => {
                              switch (field.field_type) {
                                case 'DATE':
                                  return 'date';
                                case 'NUMBER':
                                  return 'number';
                                case 'URL':
                                  return 'url';
                                default:
                                  return 'text';
                              }
                            };

                            return (
                              <div key={field.id} className="inline-field-row">
                                <span className="field-label">{field.label}:</span>
                                {field.field_key === 'keyword' && customerKeywords.length > 0 ? (
                                  <input
                                    type="text"
                                    className="inline-input"
                                    value={value || ''}
                                    onChange={(e) => setEditingData({ ...editingData, [field.field_key]: e.target.value })}
                                    onFocus={() => {
                                      setKeywordSearchTerm('');
                                      setIsCustomKeywordMode(false);
                                      setShowKeywordModal(true);
                                    }}
                                    placeholder={`${field.label} 입력`}
                                    readOnly
                                  />
                                ) : (
                                  <input
                                    type={getInputType()}
                                    className="inline-input"
                                    value={value || ''}
                                    onChange={(e) => setEditingData({ ...editingData, [field.field_key]: e.target.value })}
                                    placeholder={`${field.label} 입력`}
                                    min={field.field_type === 'DATE' ? getTodayDate() : undefined}
                                  />
                                )}
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
            <div className="summary-total">{totalPrice.toLocaleString('ko-KR')} 🪙</div>
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
            주문 확정
          </div>

          <div className="subtxt" style={{ marginTop: '12px' }}>
            주문 확정 후에는 상태가 "접수됨"으로 표시되며,
            관리자가 확인 후 "구동중"으로 전환됩니다
          </div>
        </div>
      </aside>

      {/* 키워드 선택 모달 */}
      {showKeywordModal && (
        <div className="modal-backdrop">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">🔑 등록된 키워드를 선택하시겠습니까?</h2>
              <button className="modal-close" onClick={handleSkipKeyword}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              {!isCustomKeywordMode ? (
                <>
                  <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
                    해당 고객의 등록된 키워드 목록입니다. 선택하면 자동으로 입력됩니다.
                  </p>
                  <input
                    type="text"
                    placeholder="🔍 키워드 검색..."
                    value={keywordSearchTerm}
                    onChange={(e) => setKeywordSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '13px',
                      marginBottom: '12px',
                      color: '#111827',
                      backgroundColor: '#f9fafb',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                  />
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    paddingRight: '4px'
                  }}>
                    {filteredKeywords.length > 0 ? (
                      filteredKeywords.map(kw => (
                        <button
                          key={kw.id}
                          onClick={() => handleKeywordSelect(kw.keyword)}
                          style={{
                            padding: '12px 16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            backgroundColor: '#fff',
                            color: '#1f2937',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#3b82f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          {kw.keyword}
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                        검색 결과가 없습니다
                      </div>
                    )}
                    <button
                      onClick={handleCustomKeywordMode}
                      style={{
                        padding: '12px 16px',
                        border: '2px dashed #9ca3af',
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb',
                        color: '#6b7280',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                        e.currentTarget.style.borderColor = '#6b7280';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                        e.currentTarget.style.borderColor = '#9ca3af';
                      }}
                    >
                      ✏️ 직접 입력하기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
                    키워드를 직접 입력하세요.
                  </p>
                  <input
                    type="text"
                    value={customKeywordInput}
                    onChange={(e) => setCustomKeywordInput(e.target.value)}
                    placeholder="키워드 입력"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#111827',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', justifyContent: isCustomKeywordMode ? 'space-between' : 'flex-end' }}>
              {isCustomKeywordMode ? (
                <>
                  <button
                    onClick={() => setIsCustomKeywordMode(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    ← 뒤로
                  </button>
                  <button
                    onClick={handleSaveCustomKeyword}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    확인
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSkipKeyword}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  나중에 선택하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}