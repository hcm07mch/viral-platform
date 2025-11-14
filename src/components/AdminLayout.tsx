'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import '@/styles/adminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      category: '대시보드',
      items: [
        { icon: '📊', label: '통계', path: '/admin/dashboard', badge: null },
      ]
    },
    {
      category: '주문 관리',
      items: [
        { icon: '📦', label: '전체 주문', path: '/admin/orders', badge: null },
        { icon: '⚙️', label: '중단 신청 관리', path: '/admin/cancellation-requests', badge: 'new' },
      ]
    },
    {
      category: '사용자 관리',
      items: [
        { icon: '👥', label: '회원 목록', path: '/admin/users', badge: null },
        { icon: '💰', label: '포인트 관리', path: '/admin/points', badge: null },
      ]
    },
    {
      category: '상품 관리',
      items: [
        { icon: '🛍️', label: '상품 목록', path: '/admin/products', badge: null },
        { icon: '📝', label: '상품 등록', path: '/admin/products/new', badge: null },
      ]
    },
    {
      category: '설정',
      items: [
        { icon: '⚙️', label: '시스템 설정', path: '/admin/settings', badge: null },
      ]
    }
  ];

  return (
    <div className="admin-layout">
      {/* 사이드바 */}
      <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            {!isCollapsed && (
              <>
                <span className="logo-icon">👑</span>
                <span className="logo-text">Admin</span>
              </>
            )}
            {isCollapsed && <span className="logo-icon">👑</span>}
          </div>
          <button 
            className="collapse-btn" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? '펼치기' : '접기'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((section, idx) => (
            <div key={idx} className="nav-section">
              {!isCollapsed && <div className="section-title">{section.category}</div>}
              <ul className="nav-items">
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx}>
                    <button
                      className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                      onClick={() => router.push(item.path)}
                      title={isCollapsed ? item.label : ''}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {!isCollapsed && (
                        <>
                          <span className="nav-label">{item.label}</span>
                          {item.badge && (
                            <span className="nav-badge">{item.badge}</span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button 
            className="footer-btn"
            onClick={() => router.push('/dashboard')}
            title={isCollapsed ? '사용자 페이지로' : ''}
          >
            <span className="nav-icon">🏠</span>
            {!isCollapsed && <span>사용자 페이지로</span>}
          </button>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
