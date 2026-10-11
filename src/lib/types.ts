export type Role = "admin" | "member";
export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
}
export interface Team {
  id: string;
  name: string;
  description: string;
  category: string;
}
export interface Membership {
  teamId: string;
  userId: string;
  role: Role;
}
export interface Invite {
  id: string;
  teamId: string;
  email: string;
  token: string;
  status: "pending" | "accepted";
  expiresAt: string;
}
export interface PersonalEvent {
  id: string;
  userId: string;
  title: string;
  start: string;
  end: string;
  source: "manual" | "google";
  allDay?: boolean;
}
export interface CalendarStatus {
  userId: string;
  connected: boolean;
  syncState: "idle" | "success" | "error";
  lastSync?: string;
  confirmed: boolean;
  from: string;
  to: string;
}
export interface Draft {
  teamId: string;
  title: string;
  from: string;
  to: string;
  duration: number;
  weekdays: number[];
  startTime: string;
  endTime: string;
  mode: "all" | "required";
  requiredIds: string[];
}
export interface Attendance {
  userId: string;
  status: "available" | "busy" | "unknown";
}
export interface Candidate {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  dates: string[];
  attendance: Attendance[][];
}
export interface Recommendation {
  draft: Draft;
  candidates: Candidate[];
  revision: number;
  createdAt: string;
  missingIds: string[];
}
export interface Occurrence {
  id: string;
  teamId: string;
  seriesId: string;
  title: string;
  start: string;
  end: string;
  index: number;
  total: number;
  attendance: Attendance[];
  revision: number;
}
export interface Video {
  id: string;
  occurrenceId: string;
  title: string;
  url: string;
  authorId: string;
  createdAt: string;
}
export interface Feedback {
  id: string;
  videoId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}
export interface Data {
  users: User[];
  teams: Team[];
  memberships: Membership[];
  invites: Invite[];
  events: PersonalEvent[];
  calendars: CalendarStatus[];
  occurrences: Occurrence[];
  videos: Video[];
  feedback: Feedback[];
  drafts: Record<string, Draft>;
  recommendations: Record<string, Recommendation>;
  sessionUserId: string | null;
  revision: number;
  failNext: boolean;
}
