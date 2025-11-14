import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 관리자용: 중단 신청 승인/거절 처리
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.tier !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    const body = await request.json();
    const { action, admin_notes } = body; // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '유효하지 않은 액션입니다' }, { status: 400 });
    }

    const { id } = await params;
    const requestId = id; // UUID 그대로 사용

    // 중단 신청 정보 조회
    const { data: cancelRequest, error: fetchError } = await supabase
      .from('cancellation_requests')
      .select('*, order_items(status)')
      .eq('id', requestId)
      .single();

    if (fetchError || !cancelRequest) {
      return NextResponse.json({ error: '중단 신청을 찾을 수 없습니다' }, { status: 404 });
    }

    if (cancelRequest.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 신청입니다' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // 승인인 경우 order_items 상태도 변경
    if (action === 'approve') {
      const targetStatus = cancelRequest.request_type === 'pause' ? 'pause' :
                          cancelRequest.request_type === 'cancel' ? 'cancelled' : 'refunded';

      const { error: updateItemError } = await supabase
        .from('order_items')
        .update({ status: targetStatus })
        .eq('id', cancelRequest.order_item_id);

      if (updateItemError) throw updateItemError;
    }

    // 중단 신청 상태 업데이트
    const { data, error: updateError } = await supabase
      .from('cancellation_requests')
      .update({
        status: newStatus,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        admin_note: admin_notes
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ 
      data,
      message: action === 'approve' ? '신청이 승인되었습니다' : '신청이 거절되었습니다'
    });

  } catch (error) {
    console.error('중단 신청 처리 오류:', error);
    return NextResponse.json(
      { error: '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
