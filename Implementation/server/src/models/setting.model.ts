import { Schema, model } from 'mongoose';

// ── Interface ─────────────────────────────────────────────────────────────────

export interface ISetting {
  key: string;             // unique identifier
  value: unknown;          // JSON-serializable value
  description?: string;   // human-readable explanation
}

// ── Schema ────────────────────────────────────────────────────────────────────

const settingSchema = new Schema<ISetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  { timestamps: true },
);

// ── Model ─────────────────────────────────────────────────────────────────────

export const Setting = model<ISetting>('Setting', settingSchema);

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * getSetting — fetch a setting by key with a typed default fallback.
 * If the key doesn't exist in the database, the default is returned without
 * inserting a document — this makes it safe to call in any environment.
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const doc = await Setting.findOne({ key }).lean();
  if (!doc) return defaultValue;
  return doc.value as T;
}
