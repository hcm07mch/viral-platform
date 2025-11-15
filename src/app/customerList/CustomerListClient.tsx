'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import '@/styles/customerList.css';

interface Customer {
  id: string;
  user_id: string;
  business_name: string;
  place_id?: string;
  place_url?: string;
  contact?: string;
  created_at: string;
  updated_at: string;
}

interface CustomerListClientProps {
  userId: string;
  displayAccount: string;
  displayTier: string;
}

export default function CustomerListClient({
  userId,
  displayAccount,
  displayTier,
}: CustomerListClientProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formData, setFormData] = useState({
    business_name: '',
    place_id: '',
    place_url: '',
    contact: '',
  });

  const supabase = createClient();

  // URL에서 플레이스 ID 추출 함수
  const extractPlaceId = (url: string): { placeId: string; cleanUrl: string } | null => {
    try {
      // N사 지도 URL 패턴: https://map.naver.com/p/entry/place/1654947922...
      const match = url.match(/\/place\/([0-9]+)/);
      if (match && match[1]) {
        const placeId = match[1];
        const cleanUrl = `https://map.naver.com/p/entry/place/${placeId}`;
        return { placeId, cleanUrl };
      }
      return null;
    } catch (error) {
      console.error('URL 파싱 오류:', error);
      return null;
    }
  };

  // 플레이스 URL 입력 처리
  const handlePlaceUrlChange = (url: string) => {
    const trimmedUrl = url.trim();
    
    if (trimmedUrl) {
      const result = extractPlaceId(trimmedUrl);
      if (result) {
        setFormData({
          ...formData,
          place_url: result.cleanUrl,
          place_id: result.placeId,
        });
        return;
      }
    }
    
    // URL이 없거나 파싱 실패 시
    setFormData({ ...formData, place_url: trimmedUrl });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('고객 목록 조회 실패:', error);
      alert('고객 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        business_name: customer.business_name,
        place_id: customer.place_id || '',
        place_url: customer.place_url || '',
        contact: customer.contact || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        business_name: '',
        place_id: '',
        place_url: '',
        contact: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({
      business_name: '',
      place_id: '',
      place_url: '',
      contact: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.business_name.trim()) {
      alert('상호명을 입력해주세요.');
      return;
    }

    try {
      if (editingCustomer) {
        // 수정
        const { error } = await supabase
          .from('customers')
          .update({
            business_name: formData.business_name,
            place_id: formData.place_id || null,
            place_url: formData.place_url || null,
            contact: formData.contact || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
        alert('고객 정보가 수정되었습니다.');
      } else {
        // 등록
        const { error } = await supabase.from('customers').insert({
          user_id: userId,
          business_name: formData.business_name,
          place_id: formData.place_id || null,
          place_url: formData.place_url || null,
          contact: formData.contact || null,
        });

        if (error) throw error;
        alert('고객이 등록되었습니다.');
      }

      handleCloseModal();
      fetchCustomers();
    } catch (error) {
      console.error('고객 저장 실패:', error);
      alert('고객 정보 저장에 실패했습니다.');
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('이 고객 정보를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      alert('고객 정보가 삭제되었습니다.');
      fetchCustomers();
    } catch (error) {
      console.error('고객 삭제 실패:', error);
      alert('고객 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="customer-list-wrapper">
      <div className="customer-list-container">
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">내 고객 관리</h1>
            <p className="page-subtitle">
              관리 중인 고객사들의 정보를 등록하고 관리하세요
            </p>
          </div>
          <button className="add-customer-btn" onClick={() => handleOpenModal()}>
            <span className="btn-icon">+</span>
            고객 등록
          </button>
        </div>

        <div className="service-notice">
          <div className="notice-icon">📍</div>
          <div className="notice-content">
            <strong>플레이스 전용 서비스</strong>
            <span>현재 N사 플레이스 고객사를 위한 서비스를 제공하고 있습니다. 더 많은 서비스 영역으로 확장 예정입니다.</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>고객 목록을 불러오는 중...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>등록된 고객이 없습니다</h3>
            <p>첫 번째 고객을 등록해보세요</p>
            <button className="empty-add-btn" onClick={() => handleOpenModal()}>
              고객 등록하기
            </button>
          </div>
        ) : (
          <>
            <div className="list-section-header">
              <h2 className="section-title">고객 리스트</h2>
              <div className="view-mode-toggle">
                <button
                  className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="그리드형 보기"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>그리드형</span>
                </button>
                <button
                  className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="리스트형 보기"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="8" y1="6" x2="21" y2="6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="12" x2="21" y2="12" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="18" x2="21" y2="18" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>리스트형</span>
                </button>
              </div>
            </div>

            {viewMode === 'list' && (
              <div className="list-header">
                <div className="list-header-cell">상호명</div>
                <div className="list-header-cell">플레이스 ID</div>
                <div className="list-header-cell">연락처</div>
                <div className="list-header-cell">등록일</div>
                <div className="list-header-cell">관리</div>
              </div>
            )}

            <div className={viewMode === 'grid' ? 'customers-grid' : 'customers-list'}>
              {customers.map((customer) => (
                <div key={customer.id} className={viewMode === 'grid' ? 'customer-card' : 'customer-row'}>
                  {viewMode === 'grid' ? (
                    <>
                      <div className="card-header">
                        <h3 className="customer-name">{customer.business_name}</h3>
                        <div className="card-actions">
                          <button
                            className="edit-btn"
                            onClick={() => handleOpenModal(customer)}
                            title="수정"
                          >
                            ✏️
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(customer.id)}
                            title="삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="card-body">
                        {customer.place_id && (
                          <div className="info-row">
                            <span className="info-label">플레이스 ID:</span>
                            <span className="info-value">{customer.place_id}</span>
                          </div>
                        )}
                        {customer.contact && (
                          <div className="info-row">
                            <span className="info-label">연락처:</span>
                            <span className="info-value">{customer.contact}</span>
                          </div>
                        )}
                      </div>

                      <div className="card-footer">
                        <span className="created-date">
                          등록일: {new Date(customer.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="list-cell list-cell-name">{customer.business_name}</div>
                      <div className="list-cell list-cell-place">{customer.place_id || '-'}</div>
                      <div className="list-cell list-cell-contact">{customer.contact || '-'}</div>
                      <div className="list-cell list-cell-date">
                        {new Date(customer.created_at).toLocaleDateString('ko-KR')}
                      </div>
                      <div className="list-cell list-cell-actions">
                        <button
                          className="edit-btn"
                          onClick={() => handleOpenModal(customer)}
                          title="수정"
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(customer.id)}
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCustomer ? '고객 정보 수정' : '새 고객 등록'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">
                  상호명 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData({ ...formData, business_name: e.target.value })
                  }
                  placeholder="고객사 상호명을 입력하세요"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">플레이스 URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.place_url}
                  onChange={(e) => handlePlaceUrlChange(e.target.value)}
                  placeholder="N사 지도 URL을 붙여넣으세요 (예: https://map.naver.com/p/entry/place/1654947922...)"
                />
                <small className="form-helper">URL에서 플레이스 ID가 자동으로 추출됩니다</small>
              </div>

              <div className="form-group">
                <label className="form-label">플레이스 ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.place_id}
                  onChange={(e) =>
                    setFormData({ ...formData, place_id: e.target.value })
                  }
                  placeholder="자동 추출됨"
                  readOnly
                />
              </div>

              <div className="form-group">
                <label className="form-label">연락처</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                  placeholder="전화번호 또는 이메일"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCloseModal}
                >
                  취소
                </button>
                <button type="submit" className="submit-btn">
                  {editingCustomer ? '수정하기' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
