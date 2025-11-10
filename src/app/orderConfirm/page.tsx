'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/orderConfirm.css'; // ← 대표님 경로 기준 (원하시면 styles/로 수정)

type OrderItem = {
  id: number;
  clientName: string;
  productLabel: string; // 예: "(플레이스리뷰)"
  perDay: number;
  weeks: number;
  totalQty: number;
  priceText: string;    // 예: "xxx,xxx원 예상"
  note?: string;        // 예: "익일 접수 가능성 있음"
  body: {
    media: string;      // 매체
    keyword?: string;
    placeUrl?: string;
    storeUrl?: string;
    receipt?: '첨부됨' | '미첨부';
    periodText?: string; // 예: "2025.10.30 ~ 2025.11.12"
  };
};

export default function OrderConfirmPage() {
  const router = useRouter();

  // 와이어프레임의 하드코딩 데이터를 state로 이관
  const [orders] = useState<OrderItem[]>([
    {
      id: 1,
      clientName: 'A지점',
      productLabel: '(플레이스리뷰)',
      perDay: 5,
      weeks: 2,
      totalQty: 70,
      priceText: 'xxx,xxx원 예상',
      note: '익일 접수 가능성 있음',
      body: {
        media: '네이버 플레이스',
        keyword: '홍대 미용실 추천',
        placeUrl: 'https://place...',
        storeUrl: 'https://smartstore...',
        receipt: '첨부됨',
        periodText: '2025.10.30 ~ 2025.11.12',
      },
    },
    {
      id: 2,
      clientName: 'B지점',
      productLabel: '(플레이스리뷰)',
      perDay: 3,
      weeks: 1,
      totalQty: 21,
      priceText: 'xx,xxx원 예상',
      note: '정상 접수',
      body: {
        media: '네이버 플레이스',
        keyword: '강남 염색 이벤트',
        placeUrl: 'https://place...',
        receipt: '미첨부',
        periodText: '2025.10.30 ~ 2025.11.05',
      },
    },
  ]);

  // 아코디언 열림 상태: id 집합으로 관리
  const [openIds, setOpenIds] = useState<Set<number>>(new Set([1])); // 1번만 기본 open

  const toggleOpen = (id: number) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // 상단/하단 요약 수치 (실서비스에선 서버 응답/계산값으로 대체)
  const totalOrders = orders.length;
  const totalQty = useMemo(
    () => orders.reduce((sum, o) => sum + (o.totalQty ?? 0), 0),
    [orders]
  );

  // 포인트/금액은 API 연동 시 계산치로 바꿔주세요
  const finalPointText = 'xxx,xxx P';
  const balancePointText = '1,250,000 P';
  const expectedStart = '2025.10.30';
  const expectedEnd = '2025.11.12';

  const onConfirm = async () => {
    // 실제 제품 로직(예시):
    // 1) 포인트 차감 요청 (POST /points/charge or /orders/confirm)
    // 2) 주문 상태 '접수중'으로 생성
    // 3) 완료 후 주문 목록 화면 이동
    console.log('주문 확정 처리 → 상태: 접수중');
    router.push('/orders'); // 원하는 경로로 변경
  };

  return (
    <>
      {/* 헤더 */}
      <header className="global-header">
        <div className="header-left">
          <div className="logo-box">LOGO</div>
          <div className="header-service-name">
            Viral Ad Platform<br />
            자동 발주 대시보드
          </div>
        </div>
        <div className="header-right">
          <div className="header-link">상품 목록</div>
          <div className="header-link">주문 내역</div>
          <div className="header-link">포인트</div>
          <div className="header-userbox">
            계정: acme_agency<br />등급: VIP
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="confirm-wrapper">
        {/* 상단 요약 패널 */}
        <section className="panel">
          <div className="panel-header">
            <div>주문 최종 요약</div>
            <div className="status-chip">확정 시 상태: 접수중</div>
          </div>

          <div className="summary-grid">
            <div className="summary-box">
              <div className="summary-label">총 주문 건수</div>
              <div className="summary-value">{totalOrders}건</div>
            </div>

            <div className="summary-box">
              <div className="summary-label">총 예상 수량</div>
              <div className="summary-value">{totalQty}건</div>
            </div>

            <div className="summary-box">
              <div className="summary-label">차감될 포인트</div>
              <div className="summary-value">{finalPointText}</div>
            </div>

            <div className="summary-box">
              <div className="summary-label">보유 포인트</div>
              <div className="summary-value">{balancePointText}</div>
            </div>
          </div>

          <div className="subtxt">
            주문 확정 후 각 주문은 &quot;접수중&quot; 상태로 등록되며, 관리자가 원청 전달 후 &quot;구동중&quot;으로 전환됩니다.
          </div>

          <div className="deadline-warning">
            ※ 오늘 15:00 이후 확정 시 일부 주문은 익일 접수로 처리됩니다.
          </div>
        </section>

        {/* 주문 상세 리스트 (아코디언) */}
        <section className="orders-list-panel">
          <div className="orders-list-header">
            <div>개별 주문 상세</div>
            <div className="subtxt">클릭해서 입력값/조건을 다시 확인하세요.</div>
          </div>

          {orders.map(o => {
            const active = openIds.has(o.id);
            return (
              <div
                key={o.id}
                className={`confirm-order ${active ? 'active' : ''}`}
              >
                <button
                  className="confirm-order-head"
                  onClick={() => toggleOpen(o.id)}
                  aria-expanded={active}
                  aria-controls={`order-body-${o.id}`}
                  // 버튼 역할 추가 (접근성)
                >
                  <div className="co-left">
                    <div className="client-name">
                      {o.clientName} {o.productLabel}
                    </div>
                    <div>
                      {o.perDay}건/1일 · {o.weeks}주 진행 · 총 {o.totalQty}건
                    </div>
                  </div>
                  <div className="co-right">
                    <div className="co-price">{o.priceText}</div>
                    {o.note && (
                      <div className="subtxt" style={{ textAlign: 'right' }}>
                        {o.note}
                      </div>
                    )}
                  </div>
                </button>

                <div
                  id={`order-body-${o.id}`}
                  className="confirm-order-body"
                >
                  매체: {o.body.media}<br />
                  {o.body.keyword && <>키워드: {o.body.keyword}<br /></>}
                  {o.body.placeUrl && <>플레이스 URL: {o.body.placeUrl}<br /></>}
                  {o.body.storeUrl && <>스토어 URL: {o.body.storeUrl}<br /></>}
                  {o.body.receipt && <>영수증 이미지: {o.body.receipt}<br /></>}
                  {o.body.periodText && <>진행 기간(예상): {o.body.periodText}</>}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* 하단 확정 CTA */}
      <footer className="final-cta-bar">
        <div className="final-cta-inner">
          <div className="final-cta-summary-row">
            <div className="final-col">
              <div className="final-label">최종 차감 포인트</div>
              <div className="final-value">{finalPointText}</div>
            </div>

            <div className="final-col">
              <div className="final-label">확정 후 상태</div>
              <div className="final-value">접수중</div>
            </div>

            <div className="final-col">
              <div className="final-label">예상 시작일</div>
              <div className="final-value">{expectedStart}</div>
            </div>

            <div className="final-col">
              <div className="final-label">예상 종료일</div>
              <div className="final-value">{expectedEnd}</div>
            </div>
          </div>

          <button className="confirm-btn" onClick={onConfirm}>
            주문 확정 (포인트 차감)
          </button>

          <div className="legal-note">
            주문 확정을 누르면 위 조건에 동의한 것으로 간주됩니다.  
            일부 업종/문구는 별도 심사 후 조정될 수 있습니다.
          </div>
        </div>
      </footer>
    </>
  );
}
