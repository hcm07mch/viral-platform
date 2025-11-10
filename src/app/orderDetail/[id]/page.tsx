'use client';

import { useMemo, useState } from 'react';
import '@/styles/orderDetail.css'; // 주신 CSS 그대로 이동 후 임포트

type TimelineItem = { time: string; text: string; badge?: string };
type ChatItem = { author: 'Client' | 'Ops'; text: string };
type LogItem = { time: string; text: string };
type ProductFlags = {
  isNaverPlace: boolean;
  showStoreUrl: boolean;
  showReceipt: boolean;
};

type RankPoint = { date: string; rank: number };

export default function OrderDetailPage() {
  // ─────────────────────────────────────────────────────────────
  // 더미 데이터 (실서비스에선 서버 fetch로 대체)
  // ─────────────────────────────────────────────────────────────
  const orderNo = '#2025-00123';
  const [status, setStatus] = useState<'접수중' | '구동중' | '완료'>('구동중');
  const periodText = '2025.10.30 ~ 2025.11.12';
  const totalSummary = { qty: 70, amountText: 'xxx,xxx원' };

  const productFlags: ProductFlags = {
    isNaverPlace: true,
    showStoreUrl: true,
    showReceipt: true,
  };

  const dynamicFields = {
    media: '네이버 플레이스',
    keywords: '홍대 미용실 추천, 가을 염색, 헤어케어',
    placeUrl: 'https://place.naver.com/...',
    storeUrl: 'https://smartstore.naver.com/...',
    receiptImage: '첨부됨 (영수증_231031.jpg)',
    quantityText: '5건/1일 · 2주 (총 70)',
  };

  const timeline: TimelineItem[] = [
    { time: '2025-10-30 09:12', text: '원청 전달 완료', badge: '담당자: Admin A' },
    { time: '2025-10-31 10:00', text: '구동 시작', badge: 'Batch #NVP-31' },
    { time: '2025-11-02 18:30', text: '중간 점검(등록 18/70)', badge: '보고서 v0.2' },
  ];

  const chats: ChatItem[] = [
    { author: 'Client', text: '키워드 2개 추가 부탁드립니다. (“가을 염색”, “헤어케어”).' },
    { author: 'Ops', text: '11/1 배치에 반영하겠습니다. 일정 지연 시 별도 안내드릴게요.' },
  ];

  const logs: LogItem[] = [
    { time: '2025-10-29 21:02', text: '주수 1→2 (by Client)' },
    { time: '2025-10-30 08:55', text: '키워드 추가 “헤어케어” (by Client)' },
    { time: '2025-10-31 09:10', text: '상태 “구동중” (by Admin)' },
  ];

  const rankSeries: RankPoint[] = [
    { date: '10/30', rank: 18 },
    { date: '11/01', rank: 16 },
    { date: '11/03', rank: 12 },
    { date: '11/05', rank: 9 },
    { date: '11/07', rank: 7 },
    { date: '11/09', rank: 8 },
    { date: '11/11', rank: 6 },
  ];
  const maxRank = 50;

  // ─────────────────────────────────────────────────────────────
  // UI 상태
  // ─────────────────────────────────────────────────────────────
  // 아코디언: 0=타임라인, 1=커뮤니케이션, 2=감사 로그
  const [openAcc, setOpenAcc] = useState<Set<number>>(new Set([0]));
  const toggleAcc = (i: number) =>
    setOpenAcc(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  // 환불 모달
  const [refundOpen, setRefundOpen] = useState(false);
  const openRefund = () => setRefundOpen(true);
  const closeRefund = () => setRefundOpen(false);
  const confirmRefund = () => {
    console.log('환불 신청 확정 → refundRequest 제출/라우팅');
    setRefundOpen(false);
  };

  // 순위 스파크라인 바 높이 계산 (rank가 낮을수록 높게)
  const sparkBars = useMemo(
    () =>
      rankSeries.map(pt => {
        const h = Math.max(8, ((maxRank - pt.rank + 1) / maxRank) * 100);
        return { ...pt, heightPct: h };
      }),
    [rankSeries]
  );

  // ─────────────────────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* 헤더 */}
      <header className="global-header">
        <div className="header-left">
          <div className="logo-box">LOGO</div>
          <div className="header-service-name">
            Viral Ad Platform<br />주문 상세
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

      {/* 페이지 */}
      <main className="page">
        {/* 상단 요약바 */}
        <section className="summary-bar">
          <div className="summary-card">
            <div className="summary-label">주문번호</div>
            <div className="summary-value">{orderNo}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">상태</div>
            <div className="summary-value">
              <span className="status-chip" aria-live="polite">
                {status}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">기간</div>
            <div className="summary-value">{periodText}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">총량 / 총액</div>
            <div className="summary-value">
              {totalSummary.qty}건 / {totalSummary.amountText}
            </div>
          </div>
        </section>

        {/* 좌측: 타임라인/커뮤니케이션/감사로그 */}
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">상태 타임라인</div>
            <div className="subtxt">접수→원청전달→구동시작→중간점검→완료</div>
          </div>

          {/* 아코디언 0: 타임라인 */}
          <div className={`accordion ${openAcc.has(0) ? 'active' : ''}`}>
            <button className="acc-head" onClick={() => toggleAcc(0)} aria-expanded={openAcc.has(0)}>
              <div>타임라인</div>
              <div className="pill">최근 30일</div>
            </button>
            <div className="acc-body">
              {timeline.map((t, idx) => (
                <div className="timeline-item" key={idx}>
                  <div>{t.time}</div>
                  <div>
                    {t.text} {t.badge && <span className="badge">{t.badge}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 아코디언 1: 커뮤니케이션 */}
          <div className={`accordion ${openAcc.has(1) ? 'active' : ''}`}>
            <button className="acc-head" onClick={() => toggleAcc(1)} aria-expanded={openAcc.has(1)}>
              <div>커뮤니케이션</div>
              <div className="pill">파일 첨부 가능</div>
            </button>
            <div className="acc-body">
              {chats.map((c, i) => (
                <div className="chat" key={i}>
                  <div className="author">{c.author}</div>
                  <div className="bubble">{c.text}</div>
                </div>
              ))}
              <div className="cta-row">
                <button className="btn">파일 첨부</button>
                <button className="btn primary">메시지 보내기</button>
              </div>
            </div>
          </div>

          {/* 아코디언 2: 감사 로그 */}
          <div className={`accordion ${openAcc.has(2) ? 'active' : ''}`}>
            <button className="acc-head" onClick={() => toggleAcc(2)} aria-expanded={openAcc.has(2)}>
              <div>감사 로그 (이력)</div>
              <div className="pill">필드 변경</div>
            </button>
            <div className="acc-body">
              {logs.map((lg, i) => (
                <div className="log-row" key={i}>
                  {lg.time} — {lg.text}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 우측: 동적 필드/순위추적/증빙/정산 */}
        <aside className="panel">
          {/* 동적 필드 */}
          <div className="panel-header">
            <div className="panel-title">주문 파라미터</div>
            <div className="subtxt">상품 설정에 따른 동적 필드</div>
          </div>

          <div className="form-grid" id="dynamicFields">
            {/* 매체 */}
            <div className="form-field" data-field="media">
              <div className="field-label-row">
                <div className="field-label">매체</div>
                <div className="help-icon">?</div>
                <div className="help-tooltip">광고/콘텐츠를 노출할 플랫폼.</div>
              </div>
              <div>{dynamicFields.media}</div>
            </div>

            {/* 키워드 */}
            <div className="form-field" data-field="keywords">
              <div className="field-label-row">
                <div className="field-label">키워드</div>
                <div className="help-icon">?</div>
                <div className="help-tooltip">노출/검색을 노리는 문구.</div>
              </div>
              <div>{dynamicFields.keywords}</div>
            </div>

            {/* 플레이스 URL */}
            <div className="form-field" data-field="placeUrl">
              <div className="field-label-row">
                <div className="field-label">플레이스 URL</div>
                <div className="help-icon">?</div>
                <div className="help-tooltip">매장/지점 링크.</div>
              </div>
              <div>{dynamicFields.placeUrl}</div>
            </div>

            {/* 스토어 URL (플래그) */}
            {productFlags.showStoreUrl && (
              <div className="form-field" data-field="storeUrl">
                <div className="field-label-row">
                  <div className="field-label">스토어 URL</div>
                  <div className="help-icon">?</div>
                  <div className="help-tooltip">상품 판매 페이지.</div>
                </div>
                <div>{dynamicFields.storeUrl}</div>
              </div>
            )}

            {/* 영수증 (플래그) */}
            {productFlags.showReceipt && (
              <div className="form-field" data-field="receiptImage">
                <div className="field-label-row">
                  <div className="field-label">영수증 이미지</div>
                  <div className="help-icon">?</div>
                  <div className="help-tooltip">방문/구매 인증 자료.</div>
                </div>
                <div className="proof-item" style={{ minHeight: 48 }}>{dynamicFields.receiptImage}</div>
              </div>
            )}

            {/* 발행수/기간 */}
            <div className="form-field" data-field="quantity">
              <div className="field-label-row">
                <div className="field-label">발행수(1일)</div>
                <div className="help-icon">?</div>
                <div className="help-tooltip">하루 기준 수량. 청구는 ×7×주수.</div>
              </div>
              <div>{dynamicFields.quantityText}</div>
            </div>
          </div>

          {/* 네이버 플레이스 순위 추적 (플래그) */}
          {productFlags.isNaverPlace && (
            <div className="panel rank-panel" id="naverRankPanel">
              <div className="panel-header">
                <div className="panel-title">키워드 노출 순위 추적 (네이버 플레이스)</div>
                <div className="subtxt">구동기간 동안의 순위 변화</div>
              </div>

              <div className="filters">
                <div className="pill">기간: {periodText}</div>
                <div className="pill">키워드: 홍대 미용실 추천</div>
                <div className="pill">측정: 1일 1회</div>
              </div>

              <div className="rank-legend">
                <div className="legend-item"><span className="dot"></span> 순위(1=최상)</div>
                <div className="legend-item"><span className="dot"></span> 낮을수록 상위</div>
              </div>

              {/* 스파크라인 막대 */}
              <div className="sparkline" role="img" aria-label="키워드 순위 변화 스파크라인">
                {sparkBars.map(pt => (
                  <div key={pt.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      className="bar"
                      style={{ height: `${pt.heightPct}%` }}
                      title={`순위 ${pt.rank}`}
                      aria-label={`${pt.date} 순위 ${pt.rank}`}
                    >
                      {/* 막대 안에 값 표시는 생략 */}
                    </div>
                    <div className="bar-label">{pt.date}</div>
                  </div>
                ))}
              </div>
              <div className="subtxt">* 예시 데이터. 실제에선 수집 API/배치 결과로 갱신됩니다.</div>
            </div>
          )}

          {/* 증빙/리포트 */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">증빙 & 리포트</div>
              <div className="subtxt">링크/이미지/CSV/PDF</div>
            </div>
            <div className="proof-list">
              <div className="proof-item">링크 모음.csv</div>
              <div className="proof-item">스크린샷_1.png</div>
              <div className="proof-item">보고서_v0.3.pdf</div>
            </div>
          </div>

          {/* 정산/포인트 & 액션 */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">정산 정보</div>
              <div className="subtxt">포인트 트랜잭션 요약</div>
            </div>
            <table className="calc-table">
              <tbody>
                <tr><th>항목</th><th>수량</th><th>단가</th><th>금액</th></tr>
                <tr><td>1일 발행</td><td>5</td><td>xx 원</td><td>xx 원</td></tr>
                <tr><td>× 7일</td><td>35</td><td>-</td><td>-</td></tr>
                <tr><td>× 주수(2)</td><td>70</td><td>-</td><td>xxx,xxx 원</td></tr>
                <tr><td colSpan={3} style={{ textAlign: 'right' }}><b>총합</b></td><td><b>xxx,xxx 원</b></td></tr>
              </tbody>
            </table>
            <div className="cta-row" style={{ marginTop: 10 }}>
              <button className="btn">포인트 내역 보기</button>
              <button className="btn">재주문(복제)</button>
              <button className="btn">일시중지</button>
              <button className="btn primary" onClick={openRefund}>환불 신청</button>
            </div>
          </div>
        </aside>
      </main>

      {/* 환불 확인 모달 */}
      <div className={`modal-backdrop ${refundOpen ? 'active' : ''}`} role="presentation" onClick={(e) => e.currentTarget === e.target && closeRefund()}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="refundTitle">
          <h3 id="refundTitle">환불 신청을 진행할까요?</h3>
          <div>
            주문번호: <b>{orderNo}</b><br />
            현재상태: <b>{status}</b><br />
            <div className="subtxt" style={{ marginTop: 8 }}>
              이미 집행된 부분은 환불되지 않을 수 있습니다. 계속 진행하시겠습니까?
            </div>
          </div>
          <div className="footer">
            <button className="btn" onClick={closeRefund}>취소</button>
            <button className="btn primary" onClick={confirmRefund}>환불 신청 확정</button>
          </div>
        </div>
      </div>
    </>
  );
}
