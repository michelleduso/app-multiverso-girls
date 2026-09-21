/** Linhas do banco usadas pela aplicação (tipadas à mão até o `supabase gen types`). */

export type ProfileLite = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city?: string | null;
  state?: string | null;
};

export type RideRow = {
  id: string;
  organizer_id: string;
  group_id: string | null;
  title: string;
  description: string | null;
  city: string;
  state: string;
  starts_at: string;
  ride_type: string;
  max_participants: number | null;
  image_url: string | null;
  visibility: "public" | "private";
  requires_approval: boolean;
  status: "open" | "closed" | "cancelled";
  confirmed_count: number;
  organizer?: ProfileLite | null;
};

export type ParticipationStatus = "pending" | "confirmed" | "declined" | "removed";

export type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  city: string | null;
  state: string | null;
  region: string | null;
  category: string;
  visibility: "public" | "private";
  rules: string | null;
  status: "active" | "suspended";
  member_count: number;
  created_by: string | null;
};

export type GroupMemberRow = {
  group_id: string;
  user_id: string;
  role: "admin" | "member";
  status: "active" | "pending";
  profile?: ProfileLite | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string | null;
  image_path: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type ConversationSummary = {
  id: string;
  type: "direct" | "group" | "ride";
  title: string;
  avatar_url: string | null;
  ref_id: string | null;
  last_body: string | null;
  last_at: string | null;
  last_has_image: boolean;
  last_deleted: boolean;
  unread_count: number;
};

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type ReportRow = {
  id: string;
  reporter_id: string | null;
  reported_user_id: string | null;
  target_type: "profile" | "message" | "group" | "ride" | "behavior";
  target_id: string;
  reason: string;
  description: string | null;
  snapshot: string | null;
  priority: "alta" | "media" | "baixa";
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
};

export type ModerationActionRow = {
  id: string;
  admin_id: string | null;
  action: string;
  affected_user_id: string | null;
  report_id: string | null;
  target_type: string | null;
  target_snapshot: string | null;
  reason: string;
  suspended_until: string | null;
  created_at: string;
};

export type PartnerRow = {
  id: string;
  owner_id: string;
  legal_name: string;
  trade_name: string;
  cnpj: string | null;
  responsible: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  website: string | null;
  city: string;
  state: string;
  description: string | null;
  logo_url: string | null;
  category: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  review_note: string | null;
  created_at: string;
};

/** Colunas da view `public_partners` (o que as motoqueiras enxergam). */
export type PublicPartner = {
  id: string;
  trade_name: string;
  description: string | null;
  logo_url: string | null;
  category: string;
  city: string;
  state: string;
  whatsapp: string | null;
  instagram: string | null;
  website: string | null;
  in_spotlight: boolean;
};

export type PlanRow = {
  id: string;
  name: string;
  sort: number;
  max_products: number;
  can_feature: boolean;
  can_promote: boolean;
  in_spotlight: boolean;
  full_metrics: boolean;
  description: string | null;
};

export type SubscriptionRow = {
  partner_id: string;
  plan_id: string;
  status: "trial" | "active" | "expired" | "suspended";
  starts_at: string;
  ends_at: string | null;
};

export type ProductRow = {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number | null;
  sale_price: number | null;
  image_url: string | null;
  external_url: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  status: "draft" | "active" | "paused" | "blocked";
  is_featured: boolean;
  campaign_start: string;
  campaign_end: string | null;
  created_at: string;
};
