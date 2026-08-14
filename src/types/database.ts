export type ProposalStatus = 'active' | 'selected' | 'discussing' | 'done' | 'rejected' | 'blinded'
export type ProposalCategory = '#시설' | '#급식' | '#교칙' | '#학사' | '#수업' | '#복지' | '#기타'
export type ModerationStatus = 'visible' | 'blinded' | 'trashed'
export type AdminProposalScope = 'all' | 'near' | 'open' | 'completed' | 'blinded' | 'trashed'
export type AdminModerationAction = 'blind' | 'unblind' | 'trash' | 'restore' | 'delete'
export type AccountRole = 'student' | 'admin' | 'teacher' | 'parent'

export interface Profile {
  id: string
  email: string
  name: string | null
  grade: number | null
  class: number | null
  is_admin: boolean
  account_role?: AccountRole
  role_updated_at?: string
  role_updated_by?: string | null
  agreed_to_guidelines: boolean
  created_at: string
}

export interface Proposal {
  id: string
  /** Only populated for the author or an administrator. */
  author_id: string | null
  category: ProposalCategory
  title: string
  body: string
  is_anonymous: boolean
  status: ProposalStatus
  /** Absent on schemas predating the moderation columns. */
  moderation_status?: ModerationStatus
  vote_count: number
  view_count: number
  comment_count: number
  created_at: string
  updated_at: string
  // Safe author summary from proposal_feed.
  author_name?: string | null
  author_grade?: number | null
  author_class?: number | null
  author_email?: string | null
  official_replies?: OfficialReply[]
  user_voted?: boolean
  user_saved?: boolean
}

export interface OfficialReply {
  id: string
  proposal_id: string
  content: string
  signed_by: string
  created_at: string
  updated_at?: string
  updated_by?: string | null
}

export interface ProposalStatusEvent {
  id: string
  proposal_id: string
  from_status: Exclude<ProposalStatus, 'blinded'> | null
  to_status: Exclude<ProposalStatus, 'blinded'>
  public_message: string | null
  source: 'admin' | 'system'
  created_at: string
}

export interface Report {
  id: string
  proposal_id: string
  reporter_id: string
  reason: string
  created_at: string
}

export interface Save {
  id: string
  proposal_id: string
  user_id: string
  created_at: string
}

export interface Comment {
  id: string
  proposal_id: string
  /** Only populated for the author or an administrator. */
  author_id: string | null
  content: string
  is_anonymous: boolean
  created_at: string
  author_name?: string | null
  author_grade?: number | null
}

export interface Notification {
  id: string
  user_id: string
  proposal_id: string | null
  kind: 'selected' | 'discussing' | 'done' | 'rejected' | 'reply'
  title: string
  message: string
  created_at: string
  read_at: string | null
  dismissed_at: string | null
}

export interface NotificationSettings {
  user_id: string
  on_selected: boolean
  on_reply: boolean
  on_voted: boolean
  updated_at: string
}

export interface AdminDashboardStats {
  profiles: number
  active: number
  nearThreshold: number
  selected: number
  discussing: number
  doneThisMonth: number
  reportedProposals: number
  totalReports: number
  blinded: number
  trashed: number
  lastActivityAt: string | null
  schemaVersion: string
}

export interface AdminProposal extends Proposal {
  moderation_status: ModerationStatus
  moderation_reason: string | null
  report_count: number
  official_reply_content: string | null
  official_reply_signed_by: string | null
  latest_public_message: string | null
  latest_internal_note: string | null
}

export interface AdminReportReason {
  id: string | null
  reason: string
  created_at: string | null
}

export interface AdminReportItem {
  proposal: AdminProposal
  reportCount: number
  latestAt: string
  reasons: AdminReportReason[]
}

export interface AdminActivityItem {
  id: string
  adminId: string | null
  adminName: string | null
  adminEmail: string | null
  proposalId: string | null
  proposalTitle: string | null
  action: string
  details: Record<string, unknown>
  createdAt: string
}

export interface AdminMember {
  id: string
  email: string
  name: string | null
  grade: number | null
  class: number | null
  accountRole: AccountRole
  isAdmin: boolean
  agreedToGuidelines: boolean
  createdAt: string
  emailConfirmedAt: string | null
  lastSignInAt: string | null
  roleUpdatedAt: string | null
  roleUpdatedBy: string | null
  proposalCount: number
  commentCount: number
  voteCount: number
  reportCount: number
}

export interface AdminMemberSummary {
  total: number
  students: number
  admins: number
  teachers: number
  parents: number
  emailUnverified: number
}
