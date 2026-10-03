export type DailyState = 'good' | 'ok' | 'hard';

export type Difficulty = 'no' | 'a_little' | 'very_difficult';

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  daily_state: DailyState;
  energy: number | null;
  overwhelm: number | null;
  mood: string | null;
  sleep_hours: number | null;
  sleep_quality: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  user_id: string;
  date: string;
  event_key: string;
  event_label: string;
  event_icon: string | null;
  suspected_reason: string | null;
  what_might_have_helped: string | null;
  notes: string | null;
  created_at: string;
}

export interface TrainingWin {
  id: string;
  user_id: string;
  date: string;
  win_type: string | null;
  difficulty: Difficulty | null;
  difficult_day_win: boolean;
  helping_factors: string[];
  notes: string | null;
  created_at: string;
}

export interface NutritionWin {
  id: string;
  user_id: string;
  date: string;
  win_type: string | null;
  difficulty: Difficulty | null;
  difficult_day_win: boolean;
  helping_factors: string[];
  notes: string | null;
  created_at: string;
}

export interface CustomAction {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  category: string | null;
  active: boolean;
  display_order: number;
  counts_as_win: boolean;
  created_at: string;
}

export interface CustomActionLog {
  id: string;
  user_id: string;
  action_id: string;
  date: string;
  difficult_day_win: boolean;
  created_at: string;
}

export interface Reward {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  description: string | null;
  milestone: number;
  active: boolean;
  created_at: string;
}

export interface RewardClaim {
  id: string;
  user_id: string;
  reward_id: string;
  claimed_at: string;
  win_count_at_claim: number;
}

export interface CycleLog {
  id: string;
  user_id: string;
  period_start_date: string;
  cycle_length: number | null;
  period_length: number | null;
  notes: string | null;
  created_at: string;
}

export interface ToolkitCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface ToolkitItem {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  steps: string[];
  checklist: string[];
  links: { label: string; url: string }[];
  sort_order: number;
  created_at: string;
}

export interface ToolkitFile {
  id: string;
  user_id: string;
  item_id: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface MonthlyGoal {
  id: string;
  user_id: string;
  year: number;
  month: number;
  training_goal: number | null;
  nutrition_goal: number | null;
  notes: string | null;
  created_at: string;
}

export interface QuickEventConfig {
  key: string;
  label: string;
  icon: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  checkin_enabled: boolean;
  checkin_time: string;
  last_notification_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  quick_events: QuickEventConfig[];
  mood_options: string[];
  daily_state_labels: Record<string, string>;
  training_win_types: string[];
  nutrition_win_types: string[];
  created_at: string;
  updated_at: string;
}
