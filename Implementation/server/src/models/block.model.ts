import { Schema, model, type Types } from 'mongoose';

// ── Interface ─────────────────────────────────────────────────────────────────
// Minimal Block model created in F-4 so the link service can query it.
// Full Block API (POST /blocks, DELETE /blocks/:id) is added in F-5.

export interface IBlock {
  _id: Types.ObjectId;
  userId:        Types.ObjectId;  // the user who blocked
  blockedUserId: Types.ObjectId;  // the user who was blocked
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const blockSchema = new Schema<IBlock>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blockedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Enforce one block per pair (either direction is a separate document)
blockSchema.index({ userId: 1, blockedUserId: 1 }, { unique: true });

// Fast lookup: "is this user blocked by me OR have they blocked me?"
blockSchema.index({ blockedUserId: 1 });

// ── Model ────────────────────────────────────────────────────────────────────

export const Block = model<IBlock>('Block', blockSchema);
