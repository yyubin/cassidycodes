import { supabase, Comment } from './supabase';

/**
 * 모든 댓글을 최신순으로 가져옵니다
 */
export async function getComments(): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

/**
 * 새 댓글을 추가합니다
 */
export async function addComment(author: string, content: string): Promise<Comment | null> {
  const { data, error } = await supabase
    .from('comments')
    .insert([{ author, content }])
    .select()
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    return null;
  }

  return data;
}

/**
 * 실시간으로 댓글 변경사항을 구독합니다
 */
export function subscribeToComments(callback: (comment: Comment) => void) {
  const subscription = supabase
    .channel('comments')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'comments' },
      (payload) => {
        callback(payload.new as Comment);
      }
    )
    .subscribe();

  return subscription;
}
