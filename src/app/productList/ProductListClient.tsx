// app/productList/ProductListClient.tsx - Client Component
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import "@/styles/productList.css";

type ProductStatus = "fine" | "warn" | "off";
type ProductBadge = "best-seller" | "trending" | "new-item";

type ProductHash = {
  tag_text: string;
};

type ProductCategory = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  description: string | null;
  status: ProductStatus;
  vendor_base_price: number;
  currency: string;
  cutoff_time: string | null;
  created_at: string | null;
  updated_at: string | null;
  unavailable_reason: string | null;
  unit: string | null;
  min_order: number | null;
  badge: ProductBadge | null;
  badge_text: string | null;
  status_text: string | null;
  product_hashes?: ProductHash[];
  product_category_map?: {
    product_categories: ProductCategory;
  }[];
};

export default function ProductListClient({
  initialProducts,
  categories,
  userTier,
  tierMultipliers,
}: {
  initialProducts: Product[];
  categories: string[];
  userTier: string;
  tierMultipliers: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("전체");
  const [allCatOpen, setAllCatOpen] = useState(false);
  const [products] = useState<Product[]>(initialProducts);

  // 티어별 가격 계산 헬퍼 함수
  const calculateTierPrice = (basePrice: string | number): number => {
    const base = typeof basePrice === 'string' ? parseFloat(basePrice) : basePrice;
    const multiplier = tierMultipliers[userTier] || 1.0;
    return Math.round(base * multiplier);
  };

  // Helper function to get tags from product_hashes
  const getTags = (product: Product): string[] => {
    return product.product_hashes?.map(h => h.tag_text) || [];
  };

  // Helper function to get categories from product_category_map
  const getCategories = (product: Product): string[] => {
    return product.product_category_map?.map(m => m.product_categories.name) || [];
  };

  // Helper function to format price (티어별 계산된 가격)
  const formatPrice = (product: Product): string => {
    const tierPrice = calculateTierPrice(product.vendor_base_price);
    const formattedPrice = tierPrice.toLocaleString('ko-KR');
    return `${formattedPrice}${product.currency === 'KRW' ? ' 원' : product.currency}`;
  };

  const filtered = useMemo(() => {
    const byCat = activeCat === "전체" 
      ? products 
      : products.filter(p => {
          const cats = getCategories(p);
          return cats.includes(activeCat);
        });
    
    const q = query.trim().toLowerCase();
    if (!q) return byCat;
    
    return byCat.filter(p => {
      const tags = getTags(p);
      const searchText = `${p.name} ${p.description || ''} ${tags.join(" ")}`.toLowerCase();
      return searchText.includes(q);
    });
  }, [products, activeCat, query]);

  const getStatusText = (status: ProductStatus, statusText?: string | null) => {
    if (statusText) return statusText;
    switch (status) {
      case 'fine': return '구동 정상';
      case 'warn': return '구동 주의';
      case 'off': return '구동 중단';
      default: return status;
    }
  };

  return (
    <main className="catalog-wrapper">
      {/* === 상단 검색바 === */}
      <div className="catalog-header">
        <div className="search-container">
          <svg 
            className="search-icon" 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="search-bar"
            placeholder="상품명, 태그 등으로 검색.."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* === 카테고리 필터 === */}
      <div className="category-filter">
        <div className="visible-categories">
          {categories.slice(0, 5).map((cat) => (
            <button
              key={cat}
              className={`cat-btn ${activeCat === cat ? "active" : ""}`}
              onClick={() => setActiveCat(cat)}
            >
              {cat}
            </button>
          ))}
          {categories.length > 5 && (
            <button
              className="cat-btn cat-more-btn"
              onClick={() => setAllCatOpen(!allCatOpen)}
            >
              {allCatOpen ? "숨기기" : "전체 보기"}
            </button>
          )}
        </div>
        {allCatOpen && categories.length > 5 && (
          <div className="all-categories">
            {categories.slice(5).map((cat) => (
              <button
                key={cat}
                className={`cat-btn ${activeCat === cat ? "active" : ""}`}
                onClick={() => setActiveCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* === 상품 카드 목록 === */}
      <div className="product-grid">
        {filtered.length === 0 ? (
          <p className="no-products">조건에 맞는 상품이 없습니다.</p>
        ) : (
          filtered.map((product) => {
            const tags = getTags(product);
            const priceText = formatPrice(product);
            
            return (
              <div key={product.id} className="product-card">
                {/* 뱃지 영역 */}
                <div className="badge-container">
                  {product.badge && (
                    <div className={`badge badge-${product.badge}`}>
                      {product.badge_text || product.badge}
                    </div>
                  )}
                  {product.status && (
                    <div className={`status-badge status-${product.status}`}>
                      {getStatusText(product.status, product.status_text)}
                    </div>
                  )}
                </div>

                {/* 상품명 + 설명 */}
                <div className="product-header">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-desc">{product.description || ''}</p>
                </div>

                {/* 태그 */}
                {tags.length > 0 && (
                  <div className="product-tags">
                    {tags.map((tag, idx) => (
                      <span key={idx} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 가격 & 최소주문 */}
                <div className="product-price">
                  <div className="price-main">
                    <div className="tier-price">{priceText}</div>
                    {product.unit && (
                      <div className="price-unit">/ {product.unit}</div>
                    )}
                  </div>
                  {product.min_order && (
                    <div className="min-order">
                      <svg className="icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                      </svg>
                      최소 주문: {product.min_order}{product.unit || '건'}
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="product-actions">
                  <Link href={`/productDetail?id=${product.id}`}>
                    <button className="btn-order">주문하기</button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
