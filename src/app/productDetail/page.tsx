import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import ProductDetailClient from "./ProductDetailClient";

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ProductDetailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const productId = params.id;

  if (!productId) {
    return (
      <>
        <Header pageTitle="상품을 찾을 수 없습니다" />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>상품 ID가 제공되지 않았습니다</p>
        </div>
      </>
    );
  }

  const supabase = await createClient();

  // 현재 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();

  let userTier = 'T4'; // 기본값 (비로그인 사용자)
  let userBalance = 0; // 기본값 (비로그인 사용자)
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, balance')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      userTier = profile.tier;
      userBalance = parseFloat(profile.balance || '0');
    }
  }

  // 티어별 가격 규칙 가져오기
  const { data: pricingRules } = await supabase
    .from('tier_pricing_rules')
    .select('tier, value')
    .eq('active', true);

  // 티어 -> 배율 매핑 생성
  const tierMultipliers = pricingRules?.reduce((acc: Record<string, number>, rule: any) => {
    acc[rule.tier] = parseFloat(rule.value);
    return acc;
  }, {} as Record<string, number>) || {
    'T1': 1.10,
    'T2': 1.30,
    'T3': 1.50,
    'T4': 1.70,
  };

  // 상품 상세 정보 가져오기
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      product_hashes(tag_text),
      product_category_map(
        product_categories(id, name)
      )
    `)
    .eq('id', productId)
    .single();

  if (error || !product) {
    console.error('상품 데이터 로드 실패:', error);
    return (
      <>
        <Header pageTitle="상품을 찾을 수 없습니다" />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>요청하신 상품을 찾을 수 없습니다.</p>
        </div>
      </>
    );
  }

  // 상품 입력 필드 정의 가져오기 (템플릿 조인)
  const { data: inputDefsRaw } = await supabase
    .from('product_input_defs')
    .select(`
      id,
      product_id,
      required,
      sort_order,
      validation,
      min_select,
      max_select,
      input_field_templates (
        id,
        field_key,
        label,
        field_type,
        help_text,
        description
      )
    `)
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  // 중첩 객체를 평면화
  const inputDefs = inputDefsRaw?.map(def => {
    const template = Array.isArray(def.input_field_templates) 
      ? def.input_field_templates[0] 
      : def.input_field_templates;
    
    return {
      id: def.id,
      product_id: def.product_id,
      field_key: template?.field_key || '',
      label: template?.label || '',
      field_type: template?.field_type || 'TEXT',
      help_text: template?.help_text || '',
      description: template?.description || '',
      required: def.required,
      sort_order: def.sort_order,
      validation: def.validation,
      min_select: def.min_select,
      max_select: def.max_select
    };
  }) || [];

  // 카테고리 이름 추출
  const categoryName = product.product_category_map?.[0]?.product_categories?.name || '';

  // 티어 가격 계산
  const basePrice = typeof product.vendor_base_price === 'string' 
    ? parseFloat(product.vendor_base_price) 
    : product.vendor_base_price;
  const multiplier = tierMultipliers[userTier] || 1.0;
  const tierPrice = Math.round(basePrice * multiplier);

  // 공지사항 (임시 데이터 - 추후 DB 연동 가능)
  const notices = [
    {
      date: '2025-11-08',
      text: '금일 15시 이후 접수분은 모두 익일 처리됩니다'
    },
    {
      date: '2025-11-05',
      text: '일부 업종(의료/술집)은 리뷰 문구 사전 협의가 필요합니다'
    }
  ];

  return (
    <>
      <Header pageTitle="상품 상세" />
      <ProductDetailClient
        product={{ ...product, category: categoryName }}
        tierPrice={tierPrice}
        userTier={userTier}
        userBalance={userBalance}
        notices={notices}
        inputDefs={inputDefs || []}
        userId={user?.id}
      />
    </>
  );
}
