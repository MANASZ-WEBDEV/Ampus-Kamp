import { Schema, model, type Types } from 'mongoose';
import type { EventType } from './event.model';

export type ProposalStatus = 'pending' | 'under_review' | 'approved' | 'declined';

export interface IProposalComment {
  userId:    Types.ObjectId;
  name:      string;
  role:      string;
  text:      string;
  createdAt: Date;
}

export interface IEventProposal {
  _id:             Types.ObjectId;
  title:           string;
  type:            EventType;
  proposedDate?:   string;
  description:     string;
  resourcesNeeded?: string;
  proposedBy:      Types.ObjectId;
  department?:     Types.ObjectId;
  status:          ProposalStatus;
  comments:        IProposalComment[];
  createdAt:       Date;
  updatedAt:       Date;
}

const commentSchema = new Schema<IProposalComment>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:      { type: String, required: true, trim: true },
    role:      { type: String, required: true, trim: true },
    text:      { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const eventProposalSchema = new Schema<IEventProposal>(
  {
    title:           { type: String, required: true, trim: true, maxlength: 160 },
    type: {
      type: String,
      enum: ['hackathon', 'competition', 'sports', 'workshop', 'seminar', 'other'],
      default: 'hackathon',
    },
    proposedDate:    { type: String, trim: true, maxlength: 80, default: undefined },
    description:     { type: String, required: true, trim: true, maxlength: 1500 },
    resourcesNeeded: { type: String, trim: true, maxlength: 500, default: undefined },
    proposedBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    department:      { type: Schema.Types.ObjectId, ref: 'Dept', default: undefined },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'declined'],
      default: 'pending',
      index: true,
    },
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true },
);

export const EventProposal = model<IEventProposal>('EventProposal', eventProposalSchema);
