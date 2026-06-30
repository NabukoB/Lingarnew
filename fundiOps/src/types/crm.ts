export type LeadStage =
  | "new"
  | "contacted"
  | "warm"
  | "hot"
  | "closed_won"
  | "closed_lost";

export type ConversationType =
  | "new_lead"
  | "existing_customer"
  | "support"
  | "spam"
  | "unknown";

export type MessageDirection = "inbound" | "outbound";
export type FollowUpStatus = "pending" | "sent" | "dismissed";
export type UrgencyLevel = "low" | "medium" | "high";

export interface WaContact {
  id: string;
  user_id: string;
  wa_id: string;
  phone: string;
  display_name: string | null;
  business_name: string | null;
  email: string | null;
  interest_summary: string | null;
  urgency: UrgencyLevel | null;
  tags: string[];
  auto_reply: boolean;
  created_at: string;
  updated_at: string;
}

export interface WaMessage {
  id: string;
  user_id: string;
  contact_id: string;
  wa_message_id: string | null;
  direction: MessageDirection;
  body: string;
  media_type: string | null;
  media_url: string | null;
  is_ai_generated: boolean;
  processed: boolean;
  processing_error: string | null;
  received_at: string;
}

export interface CrmLead {
  id: string;
  user_id: string;
  contact_id: string;
  stage: LeadStage;
  conv_type: ConversationType;
  ai_summary: string | null;
  ai_next_action: string | null;
  value_estimate: number | null;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmFollowUp {
  id: string;
  user_id: string;
  contact_id: string;
  lead_id: string | null;
  message_id: string | null;
  due_at: string;
  note: string;
  status: FollowUpStatus;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmSettings {
  user_id: string;
  auto_reply_global: boolean;
  greeting_template: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmAnalysis {
  conv_type: ConversationType;
  contact_name: string | null;
  business_name: string | null;
  email: string | null;
  interest_summary: string | null;
  urgency: UrgencyLevel | null;
  tags: string[];
  lead_stage: LeadStage | null;
  ai_summary: string;
  ai_next_action: string;
  follow_up_hours: number;
  follow_up_note: string | null;
  auto_reply_message: string | null;
}

export interface CrmLeadWithContact extends CrmLead {
  contact: WaContact;
  last_message_at: string | null;
  last_message_direction: MessageDirection | null;
  message_count: number;
}

export interface CrmContactDetail extends WaContact {
  lead: CrmLead | null;
  messages: WaMessage[];
  follow_ups: CrmFollowUp[];
}
