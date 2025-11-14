'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import '@/styles/orderDetail.css';

type OrderStatus = 'received' | 'pause' | 'running' | 'done' | 'cancelled' | 'refunded';

type InputDef = {
  id: number;
  field_key: string;
  label: string;
  field_type: string;
};

type OrderItemDetail = {
  item_id: string;
  order_id: string;
  order_number: string;
  product_name: string;
  client_name: string;
  daily_qty: number;
  weeks: number;
  total_qty: number;
  unit_price: number;
  item_price: number;
  status: OrderStatus;
  created_at: string;
  item_details: Record<string, any>;
  unit?: string;
};

type Message = {
  id: string;
  message: string;
  message_type: string;
  author_role: 'user' | 'admin';
  is_read: boolean;
  created_at: string;
  profiles: {
    email: string;
  };
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
  const itemId = params.id as string;

  const [itemDetail, setItemDetail] = useState<OrderItemDetail | null>(null);
  const [inputDefs, setInputDefs] = useState<InputDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAccordions, setActiveAccordions] = useState<Set<string>>(new Set(['details', 'timeline', 'messages']));
  const [showRefundModal, setShowRefundModal] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (itemId) {
      fetchItemDetail();
      fetchMessages();
    }
  }, [itemId]);

  // 1분마다 현재 시간 업데이트하여 상대 시간 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60초

    return () => clearInterval(interval);
  }, []);

  // Realtime 구독
  useEffect(() => {
    if (!itemId) return;

    let channel: any = null;

    const setupRealtime = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      console.log('=== Realtime 구독 시작 ===');
      console.log('Item ID:', itemId);

      // 메시지 실시간 구독
      channel = supabase
        .channel(`order_item_messages:${itemId}`, {
          config: {
            broadcast: { self: true },
            presence: { key: itemId }
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_item_messages',
            filter: `order_item_id=eq.${itemId}`
          },
          (payload) => {
            console.log('🔥 메시지 변경 감지:', payload.eventType);
            console.log('Payload:', payload);
            
            if (payload.eventType === 'INSERT') {
              console.log('✅ 새 메시지 추가');
              const newMsg = payload.new as any;
              
              // 새 메시지를 추가하되, 작성자 정보를 다시 fetch하거나 현재 사용자 정보 사용
              setMessages(prev => [...prev, {
                id: newMsg.id,
                message: newMsg.message,
                message_type: newMsg.message_type,
                author_role: newMsg.author_role,
                is_read: newMsg.is_read,
                created_at: newMsg.created_at,
                profiles: { email: newMsg.author_role === 'admin' ? '관리자' : '사용자' }
              }]);
              
              // 전체 메시지 목록을 다시 가져와서 정확한 정보 표시
              setTimeout(() => fetchMessages(), 500);
            } else if (payload.eventType === 'UPDATE') {
              console.log('✅ 메시지 업데이트');
              const updatedMsg = payload.new as any;
              setMessages(prev => 
                prev.map(msg =>
                  msg.id === updatedMsg.id 
                    ? { ...msg, is_read: updatedMsg.is_read } 
                    : msg
                )
              );
            } else if (payload.eventType === 'DELETE') {
              console.log('✅ 메시지 삭제');
              const deletedMsg = payload.old as any;
              setMessages(prev => prev.filter(msg => msg.id !== deletedMsg.id));
            }
          }
        )
        .subscribe((status, err) => {
          console.log('📡 구독 상태:', status);
          if (err) {
            console.error('❌ 구독 에러:', err);
            // 에러 발생 시 재연결 시도
            if (err.message?.includes('mismatch')) {
              console.warn('⚠️ Realtime 바인딩 불일치 - SQL 스크립트 실행 필요');
              console.warn('실행: sql/fix_realtime_mismatch.sql');
            }
          }
          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime 구독 완료!');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('❌ 구독 실패:', status);
          }
        });
    };

    setupRealtime();

    return () => {
      console.log('=== Realtime 구독 해제 ===');
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [itemId]);

  const fetchItemDetail = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/items/${itemId}`);
      if (!response.ok) {
        throw new Error('주문 항목 정보를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      setItemDetail(data.item);
      setInputDefs(data.inputDefs || []);
    } catch (error) {
      console.error('주문 항목 조회 오류:', error);
      alert('주문 항목 정보를 불러올 수 없습니다.');
      router.push('/orderList');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/orders/items/${itemId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('메시지 조회 오류:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsSendingMessage(true);
    try {
      const response = await fetch(`/api/orders/items/${itemId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() })
      });
      
      if (response.ok) {
        // Realtime으로 자동 업데이트되므로 수동 fetch 제거
        setNewMessage('');
        // 선택사항: 메시지 전송 성공 피드백
        console.log('✅ 메시지 전송 성공');
      } else {
        throw new Error('메시지 전송 실패');
      }
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('이 메시지를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/orders/items/${itemId}/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        alert('메시지 삭제에 실패했습니다.');
      }
      // Realtime으로 자동 업데이트됨
    } catch (error) {
      console.error('메시지 삭제 오류:', error);
      alert('메시지 삭제 중 오류가 발생했습니다.');
    }
  };

  const formatMessageTime = (dateString: string) => {
    const messageDate = new Date(dateString);
    const diffInSeconds = Math.floor((currentTime.getTime() - messageDate.getTime()) / 1000);
    
    // 1분 미만
    if (diffInSeconds < 60) {
      return '방금 전';
    }
    
    // 1시간 미만
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}분 전`;
    }
    
    // 24시간 미만
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}시간 전`;
    }
    
    // 오늘인지 확인
    const isToday = currentTime.getFullYear() === messageDate.getFullYear() &&
                    currentTime.getMonth() === messageDate.getMonth() &&
                    currentTime.getDate() === messageDate.getDate();
    
    if (isToday) {
      return messageDate.toLocaleString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // 오늘이 아니면 날짜 포함
    return messageDate.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 메시지를 분(minute) 단위로 그룹화하는 함수
  const groupMessagesByMinute = (messages: Message[]) => {
    const groups: { key: string; time: string; messages: Message[] }[] = [];
    
    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at);
      // 연-월-일-시-분-작성자 단위로 그룹화 키 생성
      const groupKey = `${msgDate.getFullYear()}-${msgDate.getMonth()}-${msgDate.getDate()}-${msgDate.getHours()}-${msgDate.getMinutes()}-${msg.author_role}`;
      
      // 마지막 그룹이 같은 키를 가지고 있으면 추가
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.key === groupKey) {
        lastGroup.messages.push(msg);
      } else {
        // 새로운 그룹 생성
        groups.push({
          key: groupKey,
          time: formatMessageTime(msg.created_at),
          messages: [msg]
        });
      }
    });
    
    return groups;
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
    console.log('환불 신청:', itemDetail?.item_id);
    setShowRefundModal(false);
    router.push('/refundRequest');
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <main style={{ padding: '100px 24px', textAlign: 'center' }}>
        로딩 중...
      </main>
    );
  }

  if (!itemDetail) {
    return (
      <main style={{ padding: '100px 24px', textAlign: 'center' }}>
        주문 항목 정보를 찾을 수 없습니다.
      </main>
    );
  }

  return (
    <>
      <main className="page">
        {/* 상단 요약바 */}
        <section className="summary-bar">
          <div className="summary-card">
            <div className="summary-label">업체명</div>
            <div className="summary-value highlight">{itemDetail.client_name}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">키워드</div>
            <div className="summary-value highlight">
              {itemDetail.item_details?.keyword || '-'}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">상품명</div>
            <div className="summary-value">{itemDetail.product_name}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">상태</div>
            <div className="summary-value">
              <span className="status-chip" data-status={itemDetail.status}>
                {STATUS_LABELS[itemDetail.status]}
              </span>
            </div>
          </div>
        </section>

        {/* 메인 콘텐츠 */}
        <div className="detail-content">
          {/* 타임라인 */}
          <section className="detail-section">
            <div 
              className="section-header"
              onClick={() => toggleAccordion('timeline')}
            >
              <h2>상태 타임라인</h2>
              <span className="toggle-icon">{activeAccordions.has('timeline') ? '▲' : '▼'}</span>
            </div>
            <div className={`section-content-wrapper ${activeAccordions.has('timeline') ? 'open' : ''}`}>
              <div className="section-content">
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-date">{formatDate(itemDetail.created_at)}</div>
                      <div className="timeline-text">주문 항목 생성</div>
                      <div className="timeline-badge">{STATUS_LABELS.received}</div>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-date">진행중</div>
                      <div className="timeline-text">현재 상태</div>
                      <div className="timeline-badge">{STATUS_LABELS[itemDetail.status]}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 관리자 소통 */}
          <section className="detail-section">
            <div 
              className="section-header"
              onClick={() => toggleAccordion('messages')}
            >
              <h2>관리자 소통</h2>
              <span className="toggle-icon">{activeAccordions.has('messages') ? '▲' : '▼'}</span>
            </div>
            <div className={`section-content-wrapper ${activeAccordions.has('messages') ? 'open' : ''}`}>
              <div className="section-content">
                <div className="messages-container">
                  {messages.length > 0 ? (
                    <div className="messages-list">
                      {groupMessagesByMinute(messages).map((group, groupIndex) => (
                        <div key={group.key} className={`message-group ${group.messages[0].author_role}`}>
                          <div className="message-header">
                            <span className="message-author">
                              {group.messages[0].author_role === 'admin' ? '관리자' : '나'}
                            </span>
                            <span className="message-time">{group.time}</span>
                          </div>
                          {group.messages.map((msg) => (
                            <div key={msg.id} className="message-wrapper">
                              {msg.is_read && msg.author_role === 'user' && (
                                <div className="message-read-status">읽음</div>
                              )}
                              <div className="message-content">
                                <div className={`message-bubble ${msg.author_role}`}>
                                  <div className="message-text">{msg.message}</div>
                                  {msg.author_role === 'user' && (
                                    <button
                                      className="message-delete-btn"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      title="삭제"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-message">아직 메시지가 없습니다.</div>
                  )}
                  
                  <div className="message-input-area">
                    <div className="message-input-wrapper">
                      <textarea
                        className="message-input"
                        placeholder="메시지를 입력하세요..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        rows={3}
                      />
                      <button 
                        className="send-message-btn"
                        onClick={handleSendMessage}
                        disabled={isSendingMessage || !newMessage.trim()}
                        title={isSendingMessage ? '전송중...' : '전송'}
                      >
                        {isSendingMessage ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" opacity="0.3"/>
                            <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round">
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                from="0 12 12"
                                to="360 12 12"
                                dur="1s"
                                repeatCount="indefinite"
                              />
                            </path>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 기본 정보 */}
          <section className="detail-section">
            <div 
              className="section-header"
              onClick={() => toggleAccordion('basic')}
            >
              <h2>기본 정보</h2>
              <span className="toggle-icon">{activeAccordions.has('basic') ? '▲' : '▼'}</span>
            </div>
            <div className={`section-content-wrapper ${activeAccordions.has('basic') ? 'open' : ''}`}>
              <div className="section-content">
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">항목 ID</span>
                    <span className="info-value mono">#{itemDetail.item_id.slice(0, 8)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">주문서 ID</span>
                    <span className="info-value mono">{itemDetail.order_number}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">1일 수량</span>
                    <span className="info-value">{itemDetail.daily_qty}{itemDetail.unit || '건'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">진행 주 수</span>
                    <span className="info-value">{itemDetail.weeks}주 ({itemDetail.weeks * 7}일)</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">총 수량</span>
                    <span className="info-value">{itemDetail.total_qty}{itemDetail.unit || '건'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">단가</span>
                    <span className="info-value">{formatCurrency(itemDetail.unit_price)}</span>
                  </div>
                  <div className="info-row total-row">
                    <span className="info-label">항목 금액</span>
                    <span className="info-value price">{formatCurrency(itemDetail.item_price)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">주문 일시</span>
                    <span className="info-value">{formatDate(itemDetail.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 상세 입력 정보 */}
          <section className="detail-section">
            <div 
              className="section-header"
              onClick={() => toggleAccordion('details')}
            >
              <h2>상세 입력 정보</h2>
              <span className="toggle-icon">{activeAccordions.has('details') ? '▲' : '▼'}</span>
            </div>
            <div className={`section-content-wrapper ${activeAccordions.has('details') ? 'open' : ''}`}>
              <div className="section-content">
                {Object.keys(itemDetail.item_details).length > 0 ? (
                  <div className="details-grid">
                    {Object.entries(itemDetail.item_details).map(([key, value]) => {
                      const def = inputDefs.find(d => d.field_key === key);
                      const label = def?.label || key;
                      
                      // 키워드 필드 렌더링
                      if (key === 'keyword') {
                        return (
                          <div key={key} className="detail-item keyword-item">
                            <span className="detail-label">{label}</span>
                            <span className="detail-value keyword-value">{String(value)}</span>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={key} className="detail-item">
                          <span className="detail-label">{label}</span>
                          <span className="detail-value">{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-message">추가 입력 정보가 없습니다.</div>
                )}
              </div>
            </div>
          </section>

          {/* 액션 버튼 */}
          <section className="action-buttons">
            <button 
              className="back-button"
              onClick={() => router.push('/orderList')}
            >
              ← 목록으로
            </button>
            <button 
              className="refund-button"
              onClick={() => setShowRefundModal(true)}
            >
              중단 신청
            </button>
          </section>
        </div>
      </main>

      {/* 환불/중단 신청 모달 */}
      {showRefundModal && (
        <div className="modal-backdrop" onClick={() => setShowRefundModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>주문 항목 중단 신청</h3>
            <p>항목번호: <strong>#{itemDetail.item_id.slice(0, 8)}</strong></p>
            <p>업체명: <strong>{itemDetail.client_name}</strong></p>
            <p>금액: <strong>{formatCurrency(itemDetail.item_price)}</strong></p>
            <div className="modal-warning">
              중단 신청 후 관리자 검토가 진행됩니다.<br/>
              이미 진행된 부분은 환불이 제한될 수 있습니다.
            </div>
            <div className="modal-buttons">
              <button 
                className="cancel-btn"
                onClick={() => setShowRefundModal(false)}
              >
                취소
              </button>
              <button 
                className="confirm-btn"
                onClick={handleRefundConfirm}
              >
                중단 신청 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
