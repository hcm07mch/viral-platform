import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const supabase = await createClient();
    const { messageId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 메시지 조회 (작성자 확인용)
    const { data: message, error: fetchError } = await supabase
      .from('order_item_messages')
      .select('author_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return NextResponse.json(
        { error: '메시지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 작성자 본인만 삭제 가능
    if (message.author_id !== user.id) {
      return NextResponse.json(
        { error: '본인이 작성한 메시지만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 메시지 삭제
    const { error: deleteError } = await supabase
      .from('order_item_messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      console.error('메시지 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '메시지 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('메시지 삭제 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
