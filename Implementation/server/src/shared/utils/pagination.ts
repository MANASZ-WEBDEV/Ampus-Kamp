import type { FilterQuery, Model, Document, SortOrder } from 'mongoose';

export interface CursorPageOptions {
  cursor?: string;
  limit?: number;
}

export interface CursorPageResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

/**
 * Cursor-based pagination using MongoDB `_id` as the cursor.
 * Returns one extra item to determine `hasMore`, then removes it.
 *
 * @param model    Mongoose model
 * @param filter   Base filter (status, type, etc.)
 * @param options  { cursor, limit }
 * @param sort     Default: { _id: -1 } (newest first)
 */
export async function paginateCursor<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T>,
  { cursor, limit = DEFAULT_PAGE_SIZE }: CursorPageOptions,
  sort: Record<string, SortOrder> = { _id: -1 },
): Promise<CursorPageResult<T>> {
  const pageSize = Math.min(limit, MAX_PAGE_SIZE);
  const query: FilterQuery<T> = { ...filter };

  // Use _id as the cursor (stable, indexed, always present)
  if (cursor) {
    const sortKey = Object.keys(sort)[0] ?? '_id';
    const direction = Object.values(sort)[0] === -1 ? '$lt' : '$gt';
    // For _id-based cursor the key is always _id
    if (sortKey === '_id' || sortKey === 'createdAt') {
      query['_id'] = { [direction]: cursor } as FilterQuery<T>['_id'];
    }
  }

  const items = await model
    .find(query)
    .sort(sort)
    .limit(pageSize + 1)
    .exec();

  const hasMore = items.length > pageSize;
  if (hasMore) items.pop();

  const lastItem = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && lastItem ? String(lastItem._id) : undefined,
    hasMore,
  };
}
