import { Schema, model, type Types } from 'mongoose';

// ── Interface ────────────────────────────────────────────────────────────────

export interface IBookmark {
  _id: Types.ObjectId;
  userId: Types.ObjectId;   // ref → User
  eventId: Types.ObjectId;  // ref → Event
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const bookmarkSchema = new Schema<IBookmark>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// One bookmark per user per event (toggle semantics: delete if exists, create if not)
bookmarkSchema.index({ userId: 1, eventId: 1 }, { unique: true });

// "My bookmarks" list — user's bookmarks sorted by newest first
bookmarkSchema.index({ userId: 1, createdAt: -1 });

// ── Model ────────────────────────────────────────────────────────────────────

export const Bookmark = model<IBookmark>('Bookmark', bookmarkSchema);
