export interface Member {
  membershipId: string;
  userId: string;
  displayName: string;
  role: "OWNER" | "MEMBER";
}
export interface Invitation {
  id: string;
  email: string;
  status: string;
  deliveryStatus: string;
  expiresAt: string;
}
export interface PersonalEvent {
  id: string;
  title: string | null;
  description: string | null;
  allDay: boolean;
  startsAt: string;
  endsAt: string;
  startDate: string | null;
  endDateExclusive: string | null;
  version: number;
}
export interface Confirmation {
  id: string;
  dateFrom: string;
  dateTo: string;
  confirmedAt: string;
}
export interface Conditions {
  title: string;
  dateFrom: string;
  dateTo: string;
  durationMinutes: number;
  windows: { weekday: number; start: string; end: string }[];
  attendanceMode: "ALL" | "REQUIRED";
  requiredMemberIds: string[];
}
export interface SchedulingRequest {
  id: string;
  createdBy: string;
  conditions: Conditions;
  selectedCandidateId: string | null;
  status: "OPEN" | "SELECTED" | "CONFIRMED";
  version: number;
}
export interface MemberStatus {
  membershipId: string;
  userId: string;
  required: boolean;
  availability: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
}
export interface Slot {
  startsAt: string;
  endsAt: string;
  members: MemberStatus[];
}
export interface Candidate {
  id: string;
  weekday: number;
  localStart: string;
  occurrences: Slot[];
  score: { minimumAvailableMembers: number; totalAvailableMembers: number };
}
export interface Occurrence extends Slot {
  id: string;
  title: string;
  sequence: number;
  status: "SCHEDULED" | "CANCELLED";
  version: number;
}
export interface Video {
  id: string;
  occurrenceId: string;
  authorId: string;
  authorDisplayName: string;
  title: string;
  sourceUrl: string;
  playbackType: "DIRECT_MP4" | "DIRECT_WEBM" | "ORIGINAL_LINK";
  everReceivedFeedback: boolean;
  version: number;
}
export interface Feedback {
  id: string;
  videoId: string;
  authorId: string;
  authorDisplayName: string;
  body: string;
  version: number;
}
