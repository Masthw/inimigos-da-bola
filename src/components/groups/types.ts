export interface GroupMemberUser {
  name: string | null;
  avatar_url: string | null;
}

export interface PendingMember {
  user_id: string;
  group_id: string;
  role: string;
  status: string;
  joined_at: string;
  users: GroupMemberUser | null;
}

export interface Member {
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  users: GroupMemberUser | null;
}
