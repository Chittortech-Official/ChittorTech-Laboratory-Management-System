import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedSession } from '@/lib/auth/session';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    throw new Error('Supabase environment variables missing');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  try {
    const auth = requireAuthenticatedSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    const supabase = getSupabase();

    const [articlesRes, revisionsRes, attemptsRes, checklistsRes, progressRes] = await Promise.all([
      supabase.from('knowledge_articles').select('*').order('updated_at', { ascending: false }).limit(50),
      supabase.from('knowledge_article_revisions').select('*').order('created_at', { ascending: false }).limit(100),
      userId
        ? supabase.from('knowledge_quiz_attempts').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(25)
        : Promise.resolve({ data: [], error: null }),
      userId
        ? supabase.from('knowledge_checklist_responses').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
        : Promise.resolve({ data: [], error: null }),
      userId
        ? supabase.from('knowledge_user_progress').select('*').eq('user_id', userId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const migrationRequired =
      articlesRes.error?.code === 'PGRST205' ||
      attemptsRes.error?.code === 'PGRST205' ||
      checklistsRes.error?.code === 'PGRST205';

    return NextResponse.json({
      success: true,
      migrationRequired,
      articles: articlesRes.data || [],
      revisions: revisionsRes.data || [],
      quizAttempts: attemptsRes.data || [],
      checklistResponses: checklistsRes.data || [],
      userProgress: progressRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load Knowledge Centre data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuthenticatedSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action, userId } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    if (action === 'save_article') {
      const { article } = body;
      if (!article?.title || !article?.categorySlug || !article?.detailedContent) {
        return NextResponse.json(
          { success: false, error: 'Title, category, and detailed content are required.' },
          { status: 400 }
        );
      }

      const articleCode =
        article.articleCode?.trim() ||
        `KC-${article.categorySlug.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      const { data: savedArticle, error: insertErr } = await supabase
        .from('knowledge_articles')
        .insert([
          {
            article_code: articleCode,
            category_slug: article.categorySlug,
            subcategory: article.subcategory || 'General Reference',
            title: article.title.trim(),
            short_description: article.shortDescription?.trim() || article.title.trim(),
            detailed_content: article.detailedContent.trim(),
            related_standards: article.relatedStandards?.trim() || null,
            related_clauses: article.relatedClauses?.trim() || null,
            related_equipment: article.relatedEquipment?.trim() || null,
            related_parameters: article.relatedParameters?.trim() || null,
            official_source_url: article.officialSourceUrl?.trim() || null,
            edition_revision: article.editionRevision?.trim() || 'v1.0',
            last_verified_date: article.lastVerifiedDate || null,
            reviewer: article.reviewer?.trim() || null,
            content_status: article.contentStatus || 'Draft',
            created_by: userId || 'admin',
          },
        ])
        .select('*')
        .single();

      if (insertErr || !savedArticle) {
        return NextResponse.json({ success: false, error: insertErr?.message || 'Failed to save article' }, { status: 400 });
      }

      await supabase.from('knowledge_article_revisions').insert([
        {
          article_id: savedArticle.id,
          revision_number: 1,
          title: savedArticle.title,
          short_description: savedArticle.short_description,
          detailed_content: savedArticle.detailed_content,
          edition_revision: savedArticle.edition_revision,
          content_status: savedArticle.content_status,
          change_summary: 'Initial article creation',
          edited_by: userId || 'admin',
        },
      ]);

      return NextResponse.json({ success: true, article: savedArticle });
    }

    if (action === 'update_article') {
      const { articleId, updates, changeSummary } = body;
      if (!articleId || !updates) {
        return NextResponse.json({ success: false, error: 'articleId and updates are required' }, { status: 400 });
      }

      const { data: existingRevs } = await supabase
        .from('knowledge_article_revisions')
        .select('revision_number')
        .eq('article_id', articleId)
        .order('revision_number', { ascending: false })
        .limit(1);

      const nextRev = ((existingRevs?.[0]?.revision_number as number) || 0) + 1;

      const { data: updated, error: updateErr } = await supabase
        .from('knowledge_articles')
        .update({
          title: updates.title,
          short_description: updates.shortDescription,
          detailed_content: updates.detailedContent,
          edition_revision: updates.editionRevision,
          content_status: updates.contentStatus,
          reviewer: updates.reviewer || null,
          last_verified_date: updates.lastVerifiedDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', articleId)
        .select('*')
        .single();

      if (updateErr || !updated) {
        return NextResponse.json({ success: false, error: updateErr?.message || 'Failed to update article' }, { status: 400 });
      }

      await supabase.from('knowledge_article_revisions').insert([
        {
          article_id: updated.id,
          revision_number: nextRev,
          title: updated.title,
          short_description: updated.short_description,
          detailed_content: updated.detailed_content,
          edition_revision: updated.edition_revision,
          content_status: updated.content_status,
          change_summary: changeSummary || `Updated to revision ${nextRev}`,
          edited_by: userId || 'admin',
        },
      ]);

      return NextResponse.json({ success: true, article: updated });
    }

    if (action === 'save_quiz_attempt') {
      const { topicSlug, score, totalQuestions, answers } = body;
      if (!userId || !topicSlug || score === undefined || !totalQuestions) {
        return NextResponse.json({ success: false, error: 'Missing quiz attempt fields' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('knowledge_quiz_attempts')
        .insert([
          {
            user_id: userId,
            topic_slug: topicSlug,
            score,
            total_questions: totalQuestions,
            answers: answers || [],
          },
        ])
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, attempt: data });
    }

    if (action === 'save_checklist') {
      const { checklistSlug, checklistTitle, responsiblePerson, completionDate, reviewStatus, items, remarks } = body;
      if (!userId || !checklistSlug || !checklistTitle || !responsiblePerson || !completionDate) {
        return NextResponse.json({ success: false, error: 'Missing required checklist fields' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('knowledge_checklist_responses')
        .insert([
          {
            user_id: userId,
            checklist_slug: checklistSlug,
            checklist_title: checklistTitle,
            responsible_person: responsiblePerson.trim(),
            completion_date: completionDate,
            review_status: reviewStatus || 'Completed',
            items: items || [],
            remarks: remarks?.trim() || null,
          },
        ])
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, response: data });
    }

    if (action === 'toggle_progress') {
      const { itemType, itemKey, completed } = body;
      if (!userId || !itemType || !itemKey) {
        return NextResponse.json({ success: false, error: 'Missing progress fields' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('knowledge_user_progress')
        .upsert(
          [
            {
              user_id: userId,
              item_type: itemType,
              item_key: itemKey,
              completed: Boolean(completed),
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'user_id,item_type,item_key' }
        )
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, progress: data });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Knowledge Centre API error' },
      { status: 500 }
    );
  }
}

