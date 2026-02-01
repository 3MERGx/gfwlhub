export type FAQSubmissionStatus = "pending" | "approved" | "rejected";

export interface FAQSubmission {
  id: string;
  question: string;
  answer: string;
  submittedBy: string;
  submittedByName: string;
  submittedAt: Date;
  status: FAQSubmissionStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  adminNotes?: string;
}
