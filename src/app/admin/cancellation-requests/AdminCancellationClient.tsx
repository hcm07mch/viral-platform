'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/adminCancellation.css';

interface CancellationRequest {
  id: string;
  order_item_id: string;
  user_id: string;
  request_type: 'pause' | 'cancel' | 'refund';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string;
  details: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  order: {
    id: string;
    product_name: string;
    user_id: string;
    total_price: number;
    product_id: number;
    quantity: number;
    order_details: any;
    products: {
      id: number;
      name: string;
    };
  };
  profiles: {
    email: string;
    display_name: string;
  };
  user_profile?: {
    email: string;
    display_name: string;
  };
  processed_by_profile: {
    email: string;
    display_name: string;
  } | null;
}

export default function AdminCancellationClient() {
  const router = useRouter();
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus, filterType]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);

      const response = await fetch(`/api/admin/cancellation-requests?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          alert('로그인이 필요합니다');
          router.push('/login');
          return;
        }
        if (response.status === 403) {
          alert('관리자 권한이 필요합니다');
          router.push('/dashboard');
          return;
        }
        throw new Error('목록 조회 실패');
      }

      const result = await response.json();
      console.log('API Response:', result);
      console.log('First request data:', result.data?.[0]);
      setRequests(result.data || []);
    } catch (error) {
      console.error('목록 조회 오류:', error);
      alert('목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (requestId: string, action: 'approve' | 'reject') => {
    if (!confirm(`이 신청을 ${action === 'approve' ? '승인' : '거절'}하시겠습니까?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/cancellation-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_notes: adminNotes })
      });

      if (!response.ok) throw new Error('처리 실패');

      const result = await response.json();
      alert(result.message);
      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error) {
      console.error('처리 오류:', error);
      alert('처리 중 오류가 발생했습니다');
    } finally {
      setProcessing(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pause': return '일시정지';
      case 'cancel': return '주문취소';
      case 'refund': return '환불요청';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '승인됨';
      case 'rejected': return '거절됨';
      case 'completed': return '완료됨';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'completed': return 'status-completed';
      default: return '';
    }
  };

  return (
    <div className="admin-cancellation-container">
      <div className="admin-header">
        <h1>중단 신청 관리</h1>
        <button onClick={() => router.push('/dashboard')} className="btn-back">
          대시보드로
        </button>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>상태:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">전체</option>
            <option value="pending">대기중</option>
            <option value="approved">승인됨</option>
            <option value="rejected">거절됨</option>
            <option value="completed">완료됨</option>
          </select>
        </div>
        <div className="filter-group">
          <label>유형:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">전체</option>
            <option value="pause">일시정지</option>
            <option value="cancel">주문취소</option>
            <option value="refund">환불요청</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">로딩중...</div>
      ) : (
        <>
          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">전체:</span>
              <span className="stat-value">{requests.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">대기중:</span>
              <span className="stat-value pending">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            </div>
          </div>

          <div className="requests-list">
            {requests.length === 0 ? (
              <div className="empty">신청 내역이 없습니다</div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="request-card">
                  <div className="request-header">
                    <div className="request-title">
                      <span className={`type-badge ${req.request_type}`}>
                        {getTypeLabel(req.request_type)}
                      </span>
                      <span className={`status-badge ${getStatusClass(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </div>
                    <div className="request-date">
                      {new Date(req.created_at).toLocaleString('ko-KR')}
                    </div>
                  </div>

                  <div className="request-body">
                    <div className="info-row" style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>
                      <strong>신청자:</strong> {req.user_profile?.display_name || req.user_profile?.email || '알 수 없음'}
                    </div>
                    {req.order ? (
                      <>
                        <div className="info-row">
                          <strong>상품명:</strong> {req.order.products?.name || req.order.product_name || '알 수 없음'}
                        </div>
                        <div className="info-row">
                          <strong>주문 수량:</strong> {req.order.quantity || 0}개
                        </div>
                        <div className="info-row">
                          <strong>총 가격:</strong> {(req.order.total_price || 0).toLocaleString('ko-KR')} 🪙
                        </div>
                        {req.order.order_details?.items && Array.isArray(req.order.order_details.items) && (
                          <div className="info-row">
                            <strong>상세 내역:</strong>
                            <div style={{ marginTop: '6px' }}>
                              {req.order.order_details.items.map((item: any, idx: number) => (
                                <div key={idx} style={{ marginLeft: '12px', marginBottom: '4px', fontSize: '0.9rem' }}>
                                  • {item.clientName}: {item.dailyCount}건/일 × {item.weeks}주 = {item.totalCount}건
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="info-row">
                        <strong>주문 정보:</strong> <span style={{ color: '#dc2626' }}>주문 항목을 찾을 수 없음 (삭제됨)</span>
                      </div>
                    )}
                    <div className="info-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                      <strong>신청 사유:</strong> {req.reason}
                    </div>
                    {req.details && (
                      <div className="info-row">
                        <strong>상세 내용:</strong>
                        <div className="notes">{req.details}</div>
                      </div>
                    )}
                    {req.admin_note && (
                      <div className="info-row">
                        <strong>관리자 메모:</strong>
                        <div className="notes admin">{req.admin_note}</div>
                      </div>
                    )}
                    {req.processed_at && (
                      <div className="info-row">
                        <strong>처리일시:</strong> {new Date(req.processed_at).toLocaleString('ko-KR')}
                        {req.processed_by_profile && ` (by ${req.processed_by_profile.email})`}
                      </div>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="request-actions">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="btn-detail"
                      >
                        처리하기
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>중단 신청 처리</h2>
            <div className="modal-body">
              <div className="modal-info">
                <p><strong>유형:</strong> {getTypeLabel(selectedRequest.request_type)}</p>
                <p><strong>사용자:</strong> {selectedRequest.user_profile?.email || '알 수 없음'}</p>
                <p><strong>상품:</strong> {selectedRequest.order?.product_name || '알 수 없음'}</p>
                <p><strong>사유:</strong> {selectedRequest.reason}</p>
                {selectedRequest.details && (
                  <p><strong>상세:</strong> {selectedRequest.details}</p>
                )}
              </div>
              <div className="form-group">
                <label>관리자 메모:</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="처리 내용을 기록하세요..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => handleProcess(selectedRequest.id, 'approve')}
                className="btn-approve"
                disabled={processing}
              >
                {processing ? '처리중...' : '승인'}
              </button>
              <button
                onClick={() => handleProcess(selectedRequest.id, 'reject')}
                className="btn-reject"
                disabled={processing}
              >
                {processing ? '처리중...' : '거절'}
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="btn-cancel"
                disabled={processing}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
