import { Course } from '@/models/course.model';
import { NotFoundError, ConflictError } from '@/shared/errors';
import type { CreateCourseBody, AppendAliasesBody } from './course.schema';

// ── Search catalog ────────────────────────────────────────────────────────────

/**
 * searchCourses — full-text search on name + aliases using MongoDB text index.
 * Falls back to regex scan when no search term is provided.
 */
export async function searchCourses(
  q?: string,
  category?: string,
  limit = 20,
) {
  const filter: Record<string, unknown> = { active: true };

  if (q && q.trim()) {
    filter['$text'] = { $search: q.trim() };
  }
  if (category) {
    filter['category'] = category;
  }

  const projection = q?.trim()
    ? { score: { $meta: 'textScore' } }
    : {};

  const sort = q?.trim()
    ? { score: { $meta: 'textScore' } }
    : { issuer: 1, name: 1 };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Course
    .find(filter, projection)
    .sort(sort as any)   // sort object shape varies between text-score and index sorts
    .limit(limit)
    .lean();
}

// ── Add course ────────────────────────────────────────────────────────────────

export async function createCourse(body: CreateCourseBody) {
  try {
    const course = await Course.create(body);
    return course.toObject();
  } catch (err: unknown) {
    // MongoDB duplicate key on (issuer, name)
    if ((err as { code?: number }).code === 11000) {
      throw new ConflictError(`Course '${body.name}' already exists for issuer '${body.issuer}'.`);
    }
    throw err;
  }
}

// ── Append aliases ────────────────────────────────────────────────────────────

export async function appendAliases(courseId: string, body: AppendAliasesBody) {
  const course = await Course.findByIdAndUpdate(
    courseId,
    { $addToSet: { aliases: { $each: body.aliases } } },
    { new: true, runValidators: true },
  ).lean();

  if (!course) throw new NotFoundError('Course');
  return course;
}
