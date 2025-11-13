import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: itemId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 메시지 조회
    const { data: messages, error: messagesError } = await supabase
      .from('order_item_messages')
      .select(`
        id,
        message,
        message_type,
        author_role,
        is_read,
        created_at,
        author_id,
        profiles!order_item_messages_author_id_fkey (
          email
        )
      `)
      .eq('order_item_id', itemId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('메시지 조회 오류:', messagesError);
      return NextResponse.json(
        { error: '메시지를 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    // 읽지 않은 메시지를 읽음 처리
    const unreadMessages = messages?.filter(
      m => !m.is_read && m.author_id !== user.id
    ) || [];

    if (unreadMessages.length > 0) {
      const { error: updateError } = await supabase
        .from('order_item_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadMessages.map(m => m.id));
      
      if (updateError) {
        console.error('읽음 상태 업데이트 오류:', updateError);
      } else {
        console.log('읽음 처리 완료:', unreadMessages.length, '개');
      }
    }

    return NextResponse.json({ messages: messages || [] });

  } catch (error) {
    console.error('메시지 목록 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: itemId } = await params;
    const body = await request.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 사용자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    const authorRole = profile?.tier === 'admin' ? 'admin' : 'user';

    // 메시지 작성
    const { data: newMessage, error: insertError } = await supabase
      .from('order_item_messages')
      .insert({
        order_item_id: itemId,
        author_id: user.id,
        author_role: authorRole,
        message: body.message,
        message_type: body.message_type || 'general'
      })
      .select(`
        id,
        message,
        message_type,
        author_role,
        is_read,
        created_at,
        profiles!order_item_messages_author_id_fkey (
          email
        )
      `)
      .single();

    if (insertError) {
      console.error('메시지 작성 오류:', insertError);
      return NextResponse.json(
        { error: '메시지를 작성할 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: newMessage });

  } catch (error) {
    console.error('메시지 작성 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
