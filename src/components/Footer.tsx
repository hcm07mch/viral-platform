'use client';

import { useState } from 'react';
import "@/styles/footer.css";

export default function Footer() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <footer className="global-footer">
      <div className="footer-container">
        <div className="footer-compact">
          <div className="footer-compact-content">
            <span className="footer-logo-compact">KINGKONG AD</span>
            <span className="footer-copyright-compact">
              © {new Date().getFullYear()} All rights reserved.
            </span>
          </div>
          <button 
            className="footer-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "상세 정보 닫기" : "상세 정보 보기"}
          >
            {isExpanded ? '▲ 닫기' : '▼ 상세 정보'}
          </button>
        </div>

        {isExpanded && (
          <div className="footer-expanded">
            <div className="footer-content">
              <div className="footer-info-grid">
                <div className="footer-info-item">
                  <span className="footer-label">주소</span>
                  <span className="footer-value">
                    경기 화성시 동탄기흥로 594-7, 1214호<br/>(루체스타비즈)
                  </span>
                </div>

                <div className="footer-info-item">
                  <span className="footer-label">대표자</span>
                  <span className="footer-value">권종철</span>
                </div>

                <div className="footer-info-item">
                  <span className="footer-label">사업자 번호</span>
                  <span className="footer-value">105-24-16481</span>
                </div>

                <div className="footer-info-item">
                  <span className="footer-label">대표전화</span>
                  <span className="footer-value">031-xxxx-xxxx</span>
                </div>

                <div className="footer-info-item">
                  <span className="footer-label">이메일</span>
                  <span className="footer-value">
                    <a href="mailto:chief@kingkongfnb.com" className="footer-email">
                      chief@kingkongfnb.com
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
