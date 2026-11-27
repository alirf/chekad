/**
 * Product configuration only.
 * Values below are internal proposal defaults and must not be presented
 * as a public package until the service owner approves them.
 */
export const mentorshipPackageProposal = {
  durationDays: 30,
  sessionsTotal: 8,
  sessionsPerWeek: 2,
  sessionDurationMinutes: 20,
  approvedForPublicDisplay: false,
} as const;

export type MentorshipPackageProposal = typeof mentorshipPackageProposal;
