import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function calculateAlgorithmicScore(userQ: any, candidateQ: any): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let totalScore = 0;

  const instruments = Array.isArray(userQ.instruments) ? userQ.instruments : [];
  const candidateInstruments = Array.isArray(candidateQ.instruments) ? candidateQ.instruments : [];
  const instrumentOverlap = instruments.filter((i: string) => candidateInstruments.includes(i));
  const instrumentScore = instruments.length > 0 ? (instrumentOverlap.length / instruments.length) * 100 : 0;
  totalScore += instrumentScore * 0.3;
  if (instrumentOverlap.length > 0) reasons.push(`Both share interest in ${instrumentOverlap.join(', ')}`);

  const genres = Array.isArray(userQ.genres) ? userQ.genres : [];
  const candidateGenres = Array.isArray(candidateQ.genres) ? candidateQ.genres : [];
  const genreOverlap = genres.filter((g: string) => candidateGenres.includes(g));
  const genreScore = genres.length > 0 ? (genreOverlap.length / genres.length) * 100 : 0;
  totalScore += genreScore * 0.2;
  if (genreOverlap.length > 0) reasons.push(`Shared genres: ${genreOverlap.join(', ')}`);

  if (userQ.role === 'Student' && candidateQ.teaching_levels?.length) {
    const levelMatch = candidateQ.teaching_levels.includes(userQ.skill_level);
    totalScore += (levelMatch ? 100 : 20) * 0.15;
    if (levelMatch) reasons.push(`Teaches at your ${userQ.skill_level} level`);
  } else if (userQ.role === 'Creator' && candidateQ.skill_level) {
    const teachingLevels = Array.isArray(userQ.teaching_levels) ? userQ.teaching_levels : [];
    const levelMatch = teachingLevels.includes(candidateQ.skill_level);
    totalScore += (levelMatch ? 100 : 20) * 0.15;
    if (levelMatch) reasons.push(`Student is at ${candidateQ.skill_level} level, which you teach`);
  }

  const userStyles = userQ.learning_style || userQ.teaching_style || [];
  const candidateStyles = candidateQ.teaching_style || candidateQ.learning_style || [];
  const styleOverlap = userStyles.filter((s: string) => candidateStyles.includes(s));
  const styleScore = userStyles.length > 0 ? (styleOverlap.length / userStyles.length) * 100 : 50;
  totalScore += styleScore * 0.15;
  if (styleOverlap.length > 0) reasons.push(`Compatible teaching style: ${styleOverlap.join(', ')}`);

  const availability = Array.isArray(userQ.availability) ? userQ.availability : [];
  const candidateAvailability = Array.isArray(candidateQ.availability) ? candidateQ.availability : [];
  const scheduleOverlap = availability.filter((a: string) => candidateAvailability.includes(a));
  const scheduleScore = availability.length > 0 ? (scheduleOverlap.length / availability.length) * 100 : 0;
  totalScore += scheduleScore * 0.15;
  if (scheduleOverlap.length > 0) reasons.push(`Available at the same times`);

  totalScore += (userQ.bio && candidateQ.bio ? 50 : 25) * 0.05;

  if (reasons.length === 0) reasons.push('Potential match based on overall profile');

  return { score: Math.round(Math.min(totalScore, 100)), reasons: reasons.slice(0, 3) };
}

async function generateAIMatches(userQ: any, candidates: any[]): Promise<{ email: string; score: number; reasons: string[] }[]> {
  const candidateSummaries = candidates.map((c, i) => {
    const instruments = Array.isArray(c.instruments) ? c.instruments : [];
    const genres = Array.isArray(c.genres) ? c.genres : [];
    const availability = Array.isArray(c.availability) ? c.availability : [];
    const fields = [
      `Candidate ${i + 1} (${c.email}):`,
      `Instruments: ${instruments.join(', ')}`,
      `Genres: ${genres.join(', ')}`,
      c.teaching_levels?.length ? `Teaching levels: ${c.teaching_levels.join(', ')}` : `Skill level: ${c.skill_level}`,
      c.teaching_style?.length ? `Teaching style: ${c.teaching_style.join(', ')}` : `Learning style: ${(c.learning_style || []).join(', ')}`,
      `Availability: ${availability.join(', ')}`,
      c.bio ? `Bio: ${c.bio}` : '',
    ];
    return fields.filter(Boolean).join('\n');
  }).join('\n\n');

  const userFields = [
    `Instruments: ${(userQ.instruments || []).join(', ')}`,
    `Genres: ${(userQ.genres || []).join(', ')}`,
    userQ.skill_level ? `Skill level: ${userQ.skill_level}` : `Teaching levels: ${(userQ.teaching_levels || []).join(', ')}`,
    userQ.learning_style?.length ? `Learning style: ${userQ.learning_style.join(', ')}` : `Teaching style: ${(userQ.teaching_style || []).join(', ')}`,
    userQ.goals ? `Goals: ${(userQ.goals || []).join(', ')}` : '',
    `Availability: ${(userQ.availability || []).join(', ')}`,
    userQ.bio ? `Bio: ${userQ.bio}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are a music education matching assistant. Score compatibility between a ${userQ.role === 'Student' ? 'student' : 'teacher'} and each candidate.

${userQ.role === 'Student' ? 'STUDENT' : 'TEACHER'} PROFILE:
${userFields}

CANDIDATES:
${candidateSummaries}

For each candidate, score compatibility 0-100 based on:
- Instrument overlap (30% weight)
- Genre overlap (20% weight)
- Level compatibility (15% weight)
- Style match (15% weight)
- Schedule overlap (15% weight)
- Overall fit (5% weight)

Respond ONLY with a JSON array (no markdown, no explanation):
[{"email": "candidate-email", "score": <number>, "reasons": ["reason1", "reason2", "reason3"]}]`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Moonriver Music Education',
      },
      body: JSON.stringify({
        model: 'nousresearch/deephermes-3-llama-3-8b-preview:free',
        messages: [
          { role: 'system', content: 'You are a matching algorithm. Respond only with valid JSON arrays. No markdown code fences.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(content);
  } catch (error) {
    console.error('AI matching error:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const role = searchParams.get('role');
    const refresh = searchParams.get('refresh');

    if (!email || !role) return NextResponse.json({ error: 'email and role required' }, { status: 400 });

    const [userQ] = await sql`SELECT * FROM questionnaires WHERE email = ${email}`;
    if (!userQ) return NextResponse.json({ success: true, matches: [], needsOnboarding: true });

    const userQNormalized = {
      ...userQ,
      instruments: userQ.instruments || [],
      genres: userQ.genres || [],
      availability: userQ.availability || [],
      teachingLevels: userQ.teaching_levels,
      teachingStyle: userQ.teaching_style,
      skillLevel: userQ.skill_level,
      learningStyle: userQ.learning_style,
      goals: userQ.goals,
    };

    const oppositeRole = role === 'Student' ? 'Creator' : 'Student';

    if (!refresh) {
      const cached = await sql`
        SELECT m.* FROM matches m
        JOIN questionnaires q ON q.email = m.match_email
        WHERE m.user_email = ${email}
        AND m.match_email != ${email}
        AND q.role = ${oppositeRole}
        AND m.generated_at > NOW() - INTERVAL '7 days'
        ORDER BY m.compatibility_score DESC
      `;
      if (cached.length > 0) {
        const matches = cached.map((m: any) => ({
          id: m.id,
          userEmail: m.user_email,
          matchEmail: m.match_email,
          compatibilityScore: m.compatibility_score,
          reasons: m.reasons || [],
          matchProfile: m.match_profile || {},
          generatedAt: m.generated_at,
        }));
        return NextResponse.json({ success: true, matches });
      }
    }

    const candidates = await sql`SELECT * FROM questionnaires WHERE role = ${oppositeRole} AND email != ${email}`;

    if (candidates.length === 0) return NextResponse.json({ success: true, matches: [] });

    const candidatesNormalized = candidates.map((c: any) => ({
      ...c,
      instruments: c.instruments || [],
      genres: c.genres || [],
      availability: c.availability || [],
      teachingLevels: c.teaching_levels,
      teachingStyle: c.teaching_style,
      skillLevel: c.skill_level,
      learningStyle: c.learning_style,
    }));

    let matchResults = await generateAIMatches(userQNormalized, candidatesNormalized);

    if (matchResults.length === 0) {
      matchResults = candidatesNormalized.map((c: any) => {
        const { score, reasons } = calculateAlgorithmicScore(userQNormalized, c);
        return { email: c.email, score, reasons };
      });
    }

    const creators = await sql`SELECT * FROM creators`;
    const students = await sql`SELECT * FROM students`;
    const userProfiles = await sql`SELECT * FROM user_profiles`;

    await sql`DELETE FROM matches WHERE user_email = ${email}`;

    const now = new Date().toISOString();
    const enrichedMatches = matchResults.map((m: any) => {
      const candidateQ = candidates.find((c: any) => c.email === m.email);
      const creator = creators.find((c: any) => c.email === m.email);
      const student = students.find((s: any) => s.email === m.email);
      const userProfile = userProfiles.find((p: any) => p.email === m.email || p.user_id === m.email);
      const profile = creator || student;

      const matchProfile = {
        name: userProfile?.display_name || profile?.name || candidateQ?.bio?.split('.')[0] || m.email.split('@')[0],
        email: m.email,
        image: profile?.profile_image || '',
        bio: candidateQ?.bio || profile?.bio || '',
        instruments: candidateQ?.instruments || [],
        genres: candidateQ?.genres || [],
        specialties: profile?.specialties || [],
        experience: profile?.experience || '',
        rating: profile?.rating || null,
        skillLevel: candidateQ?.skill_level || null,
      };

      return {
        id: `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userEmail: email,
        matchEmail: m.email,
        compatibilityScore: m.score,
        reasons: m.reasons || [],
        matchProfile,
        generatedAt: now,
      };
    });

    for (const m of enrichedMatches) {
      await sql`
        INSERT INTO matches (id, user_email, match_email, compatibility_score, reasons, match_profile, generated_at)
        VALUES (${m.id}, ${m.userEmail}, ${m.matchEmail}, ${m.compatibilityScore}, ${JSON.stringify(m.reasons)}, ${JSON.stringify(m.matchProfile)}, ${m.generatedAt})
      `;
    }

    return NextResponse.json({
      success: true,
      matches: enrichedMatches.sort((a: any, b: any) => b.compatibilityScore - a.compatibilityScore),
    });
  } catch (error) {
    console.error('Matches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
