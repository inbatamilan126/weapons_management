export type Module = 
  | 'user_management'
  | 'inventory_management'
  | 'issue_management'
  | 'issue_notifications';

export type PermissionLevel = 'view' | 'manage';

export interface UserPermission {
  id: string;
  user_id: string;
  module: Module;
  can_view: boolean;
  can_manage: boolean;
  granted_by?: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  added_by?: string;
  is_active: boolean;
  created_at: string;
}

export type WeaponCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged' | 'retired';
export type TrackingType = 'bulk' | 'individual';
export type WeaponStatus = 'available' | 'out_of_stock' | 'retired';
export type IssueStatus = 'issued' | 'partially_returned' | 'returned' | 'overdue' | 'lost';

export interface Weapon {
  id: string;
  name: string;
  category: string;
  tracking_type: TrackingType;
  total_quantity: number;
  available_quantity: number;
  serial_or_tag?: string | null;
  acquired_date?: string | null;
  photo_url?: string | null;
  current_condition: WeaponCondition;
  status: WeaponStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeaponIssueItem {
  id: string;
  issue_id: string;
  weapon_id: string;
  quantity_issued: number;
  quantity_returned: number;
  condition_on_issue: WeaponCondition;
  condition_on_return_breakdown?: Record<string, number> | null;
  status: 'issued' | 'partially_returned' | 'returned' | 'lost';
  created_at: string;
  updated_at: string;

  // Joined field
  weapon?: Weapon;
}

export interface WeaponIssue {
  id: string;
  student_id: string;
  issued_by: string;
  purpose?: string | null;
  issue_date: string;
  expected_return_date: string;
  actual_return_date?: string | null;
  received_by?: string | null;
  status: IssueStatus;
  created_at: string;
  updated_at: string;

  // Joined fields
  items?: WeaponIssueItem[];
  student?: Student;
  issued_by_profile?: Profile;
  received_by_profile?: Profile;
}

export interface WeaponConditionLog {
  id: string;
  weapon_id: string;
  recorded_by: string;
  condition: WeaponCondition;
  quantity: number;
  note?: string | null;
  related_issue_id?: string | null;
  created_at: string;

  // Joined fields
  recorded_by_profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  weapon_issue_id?: string | null;
  type: 'due_soon' | 'overdue';
  message: string;
  is_read: boolean;
  created_at: string;

  // Joined fields
  weapon_issue?: WeaponIssue;
}
