// Server Component - Supabase에서 데이터 패칭
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import ProductListClient from "./ProductListClient";

export default async function ProductListPage() {
  const supabase = await createClient();
  
  // 현재 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  let userTier = 'T4'; // 기본값 (비로그인 사용자)
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('user_id', user.id)
      .single();
    
    if (profile) {
      userTier = profile.tier;
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

  // Supabase에서 상품 데이터 가져오기
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      *,
      product_hashes(tag_text),
      product_category_map(
        product_categories(id, name)
      )
    `)
    .order('id', { ascending: true });

  // 카테고리 목록 가져오기
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('product_categories')
    .select('name');

  // 에러 처리
  if (productsError) {
    console.error('상품 데이터 로드 실패:', productsError);
  }

  if (categoriesError) {
    console.error('카테고리 데이터 로드 실패:', categoriesError);
  }

  // 카테고리 목록 생성 (전체 포함)
  const categories = ['전체', ...(categoriesData?.map((c: any) => c.name) || [])];

  return (
    <>
      <Header active="products" pageTitle="상품 목록" />
      <ProductListClient 
        initialProducts={products || []} 
        categories={categories}
        userTier={userTier}
        tierMultipliers={tierMultipliers}
      />
    </>
  );
}
