'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '@/styles/customerDetail.css';

interface Customer {
  id: string;
  user_id: string;
  client_name: string;
  place_id?: string;
  place_url?: string;
  contact?: string;
  created_at: string;
  updated_at: string;
}

interface Keyword {
  id: string;
  customer_id: string;
  keyword: string;
  created_at: string;
}

interface CustomerDetailClientProps {
  customer: Customer;
  userId: string;
  displayAccount: string;
  displayTier: string;
}

export default function CustomerDetailClient({
  customer: initialCustomer,
  userId,
  displayAccount,
  displayTier,
}: CustomerDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [formData, setFormData] = useState({
    client_name: customer.client_name,
    place_id: customer.place_id || '',
    place_url: customer.place_url || '',
    contact: customer.contact || '',
  });

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_keywords')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeywords(data || []);
    } catch (error) {
      console.error('키워드 조회 실패:', error);
      alert('키워드 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();

    const input = newKeyword.trim();
    if (!input) {
      alert('키워드를 입력해주세요.');
      return;
    }

    // 쉼표로 구분하여 여러 키워드 처리
    const keywordsToAdd = input
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywordsToAdd.length === 0) {
      alert('유효한 키워드를 입력해주세요.');
      return;
    }

    // 중복 체크
    const existingKeywordsLower = keywords.map((k) => k.keyword.toLowerCase());
    const duplicates: string[] = [];
    const newKeywordsToAdd: string[] = [];

    keywordsToAdd.forEach((keyword) => {
      if (existingKeywordsLower.includes(keyword.toLowerCase())) {
        duplicates.push(keyword);
      } else {
        newKeywordsToAdd.push(keyword);
      }
    });

    if (duplicates.length > 0) {
      alert(`이미 등록된 키워드가 있습니다: ${duplicates.join(', ')}`);
    }

    if (newKeywordsToAdd.length === 0) {
      return;
    }

    try {
      // 여러 키워드 일괄 등록
      const insertData = newKeywordsToAdd.map((keyword) => ({
        customer_id: customer.id,
        keyword: keyword,
      }));

      const { data, error } = await supabase
        .from('customer_keywords')
        .insert(insertData)
        .select();

      if (error) throw error;

      setKeywords([...data, ...keywords]);
      setNewKeyword('');
      setShowKeywordModal(false);
      
      const successMsg = newKeywordsToAdd.length === 1
        ? '키워드가 등록되었습니다.'
        : `${newKeywordsToAdd.length}개의 키워드가 등록되었습니다.`;
      alert(successMsg);
    } catch (error) {
      console.error('키워드 등록 실패:', error);
      alert('키워드 등록에 실패했습니다.');
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    if (!confirm('이 키워드를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_keywords')
        .delete()
        .eq('id', keywordId);

      if (error) throw error;

      setKeywords(keywords.filter((k) => k.id !== keywordId));
      alert('키워드가 삭제되었습니다.');
    } catch (error) {
      console.error('키워드 삭제 실패:', error);
      alert('키워드 삭제에 실패했습니다.');
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_name.trim()) {
      alert('상호명을 입력해주세요.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          client_name: formData.client_name,
          place_id: formData.place_id || null,
          place_url: formData.place_url || null,
          contact: formData.contact || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer.id)
        .select()
        .single();

      if (error) throw error;

      setCustomer(data);
      setEditingCustomer(false);
      alert('고객 정보가 수정되었습니다.');
    } catch (error) {
      console.error('고객 수정 실패:', error);
      alert('고객 정보 수정에 실패했습니다.');
    }
  };

  const handlePlaceUrlChange = (url: string) => {
    const trimmedUrl = url.trim();

    if (trimmedUrl) {
      const match = trimmedUrl.match(/\/place\/([0-9]+)/);
      if (match && match[1]) {
        const placeId = match[1];
        const cleanUrl = `https://map.naver.com/p/entry/place/${placeId}`;
        setFormData({
          ...formData,
          place_url: cleanUrl,
          place_id: placeId,
        });
        return;
      }
    }

    setFormData({ ...formData, place_url: trimmedUrl });
  };

  const handleDelete = async () => {
    if (!confirm('이 고객을 삭제하시겠습니까? 관련된 모든 키워드도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      alert('고객이 삭제되었습니다.');
      router.push('/customerList');
    } catch (error) {
      console.error('고객 삭제 실패:', error);
      alert('고객 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="customer-detail-wrapper">
      <div className="customer-detail-container">
        {/* 뒤로 가기 */}
        <div className="back-button-wrapper">
          <Link href="/customerList" className="back-button">
            ← 고객 목록으로
          </Link>
        </div>

        {/* 고객 기본 정보 */}
        <div className="info-panel">
          <div className="panel-header">
            <h2 className="panel-title">고객 기본 정보</h2>
            <div className="panel-actions">
              {!editingCustomer ? (
                <>
                  <button
                    className="edit-btn"
                    onClick={() => setEditingCustomer(true)}
                  >
                    ✏️ 수정
                  </button>
                  <button className="delete-btn" onClick={handleDelete}>
                    🗑️ 삭제
                  </button>
                </>
              ) : (
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setEditingCustomer(false);
                    setFormData({
                      client_name: customer.client_name,
                      place_id: customer.place_id || '',
                      place_url: customer.place_url || '',
                      contact: customer.contact || '',
                    });
                  }}
                >
                  취소
                </button>
              )}
            </div>
          </div>

          {!editingCustomer ? (
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">고객사명</span>
                <span className="info-value">{customer.client_name}</span>
              </div>
              {customer.place_id && (
                <div className="info-item">
                  <span className="info-label">플레이스 ID</span>
                  <span className="info-value">{customer.place_id}</span>
                </div>
              )}
              {customer.place_url && (
                <div className="info-item">
                  <span className="info-label">플레이스 URL</span>
                  <a
                    href={customer.place_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="info-link"
                  >
                    {customer.place_url}
                  </a>
                </div>
              )}
              {customer.contact && (
                <div className="info-item">
                  <span className="info-label">연락처</span>
                  <span className="info-value">{customer.contact}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">등록일</span>
                <span className="info-value">
                  {new Date(customer.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
              {customer.updated_at !== customer.created_at && (
                <div className="info-item">
                  <span className="info-label">수정일</span>
                  <span className="info-value">
                    {new Date(customer.updated_at).toLocaleString('ko-KR')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleUpdateCustomer} className="edit-form">
              <div className="form-group">
                <label className="form-label">
                  상호명 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="고객사명"
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
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
                  placeholder="N사 지도 URL"
                />
              </div>

              <div className="form-group">
                <label className="form-label">플레이스 ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.place_id}
                  readOnly
                  placeholder="자동 추출됨"
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

              <div className="form-actions">
                <button type="submit" className="save-btn">
                  저장
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 키워드 관리 */}
        <div className="keywords-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">키워드 관리</h2>
              <p className="panel-subtitle">
                고객사의 검색 키워드를 등록하고 관리하세요
              </p>
            </div>
            <button
              className="add-keyword-btn"
              onClick={() => setShowKeywordModal(true)}
            >
              + 키워드 추가
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>키워드를 불러오는 중...</p>
            </div>
          ) : keywords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏷️</div>
              <h3>등록된 키워드가 없습니다</h3>
              <p>첫 번째 키워드를 등록해보세요</p>
              <button
                className="empty-add-btn"
                onClick={() => setShowKeywordModal(true)}
              >
                키워드 추가하기
              </button>
            </div>
          ) : (
            <div className="keywords-grid">
              {keywords.map((keyword) => (
                <div key={keyword.id} className="keyword-card">
                  <div className="keyword-content">
                    <span className="keyword-text">{keyword.keyword}</span>
                    <span className="keyword-date">
                      {new Date(keyword.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <button
                    className="keyword-delete-btn"
                    onClick={() => handleDeleteKeyword(keyword.id)}
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 키워드 추가 모달 */}
      {showKeywordModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowKeywordModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">키워드 추가</h2>
              <button
                className="modal-close"
                onClick={() => setShowKeywordModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddKeyword} className="modal-form">
              <div className="form-group">
                <label className="form-label">
                  키워드 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="예: 강남 맛집, 서울 카페, 논현동 레스토랑"
                  autoFocus
                  required
                />
                <small className="form-helper">
                  💡 쉼표(,)로 구분하여 여러 키워드를 한 번에 등록할 수 있습니다
                </small>
                <small className="form-helper form-helper-example">
                  예시: "강남 맛집, 서울 카페" 입력 시 2개의 키워드가 등록됩니다
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowKeywordModal(false);
                    setNewKeyword('');
                  }}
                >
                  취소
                </button>
                <button type="submit" className="submit-btn">
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
