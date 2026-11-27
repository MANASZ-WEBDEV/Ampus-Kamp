import { Router, type Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { EventProposal } from '@/models/proposal.model';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import { asyncHandler } from '@/shared/utils';
import { ForbiddenError, NotFoundError } from '@/shared/errors';
import type { AuthRequest } from '@/shared/types';

export const proposalsRouter = Router();

const createProposalSchema = z.object({
  body: z.object({
    title:           z.string().trim().min(3).max(160),
    type:            z.enum(['hackathon', 'competition', 'sports', 'workshop', 'seminar', 'other']).default('hackathon'),
    proposedDate:    z.string().trim().max(80).optional(),
    description:     z.string().trim().min(10).max(1500),
    resourcesNeeded: z.string().trim().max(500).optional(),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'under_review', 'approved', 'declined']),
  }),
});

const addCommentSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1).max(500),
  }),
});

// GET /api/v1/proposals — students see own; faculty/dept_head/admin see all
proposalsRouter.get(
  '/',
  requireAuth,
  asyncHandler<AuthRequest>(async (req, res: Response) => {
    const isReviewer = ['faculty', 'dept_head', 'admin'].includes(req.user.role);
    const filter = isReviewer ? {} : { proposedBy: new mongoose.Types.ObjectId(req.user.id) };

    const docs = await EventProposal.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate<{ proposedBy: { _id: mongoose.Types.ObjectId; name: string } }>('proposedBy', 'name')
      .lean();

    res.status(200).json({ data: docs });
  }),
);

// POST /api/v1/proposals — submit a new proposal
proposalsRouter.post(
  '/',
  requireAuth,
  validate(createProposalSchema),
  asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { title, type, proposedDate, description, resourcesNeeded } = req.body;
    const created = await EventProposal.create({
      title,
      type,
      proposedDate:    proposedDate || undefined,
      description,
      resourcesNeeded: resourcesNeeded || undefined,
      proposedBy:      new mongoose.Types.ObjectId(req.user.id),
      department:      req.user.department ? new mongoose.Types.ObjectId(req.user.department) : undefined,
      status:          'pending',
    });

    const populated = await EventProposal.findById(created._id)
      .populate('proposedBy', 'name')
      .lean();

    res.status(201).json({ data: populated });
  }),
);

// PATCH /api/v1/proposals/:id/status — faculty/dept_head/admin update review status
proposalsRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  validate(updateStatusSchema),
  asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { id } = req.params as { id: string };
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Proposal');

    const updated = await EventProposal.findByIdAndUpdate(
      id,
      { $set: { status: req.body.status } },
      { new: true },
    )
      .populate('proposedBy', 'name')
      .lean();

    if (!updated) throw new NotFoundError('Proposal');
    res.status(200).json({ data: updated });
  }),
);

// POST /api/v1/proposals/:id/comments — proposer or faculty/dept_head/admin discuss
proposalsRouter.post(
  '/:id/comments',
  requireAuth,
  validate(addCommentSchema),
  asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { id } = req.params as { id: string };
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Proposal');

    const proposal = await EventProposal.findById(id).select('proposedBy').lean();
    if (!proposal) throw new NotFoundError('Proposal');

    const isReviewer = ['faculty', 'dept_head', 'admin'].includes(req.user.role);
    if (!isReviewer && proposal.proposedBy.toString() !== req.user.id) {
      throw new ForbiddenError('You can only comment on your own proposal.');
    }

    const updated = await EventProposal.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: {
            userId:    new mongoose.Types.ObjectId(req.user.id),
            name:      req.user.name,
            role:      req.user.role,
            text:      req.body.text,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    )
      .populate('proposedBy', 'name')
      .lean();

    res.status(201).json({ data: updated });
  }),
);
