// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  TeamPost,
  TeamPostOwner,
  TeamPostStatus,
  TeamLink,
  LinkUser,
  LinkDirection,
  LinkStatus,
  ContactReveal,
  ContactHint,
  CreateTeamPostInput,
  UpdateTeamPostInput,
  SendLinkInput,
  RespondLinkAction,
  TeamPostsResponse,
  TeamLinksPage,
} from './types';

export { isContactReveal } from './types';

// ── API ───────────────────────────────────────────────────────────────────────
export {
  listTeamPosts,
  getMyTeamPosts,
  createTeamPost,
  updateTeamPost,
  getLinks,
  sendLink,
  respondLink,
} from './api/teams.api';

// ── Hooks ─────────────────────────────────────────────────────────────────────
export {
  teamKeys,
  useTeamPosts,
  useMyTeamPosts,
  useCreateTeamPost,
  useUpdateTeamPost,
  useLinks,
  useSendLink,
  useRespondLink,
} from './hooks/useTeams';

// ── Components ────────────────────────────────────────────────────────────────
export { TeamPostCard }       from './components/TeamPostCard';
export { CreateTeamPostForm } from './components/CreateTeamPostForm';
export { RequestToJoinModal } from './components/RequestToJoinModal';
export { LinkCard }           from './components/LinkCard';
