/**
 * Q&A Question Bank — staff-curated questions an applicant answers when sending
 * a proposal. Grouped into categories; the ProposalModal walks one category per
 * step. Answers are submitted as `questionResponses` on the proposal and shown
 * to the recipient + staff.
 *
 * Frontend-static for now (no qnaQuestions collection / staff CRUD yet). The
 * `id` values are stable so stored responses survive copy edits.
 */

export interface QnaQuestion {
  id: string;
  label: string;
  placeholder?: string;
  /** Long answer vs single line. */
  multiline?: boolean;
}

export interface QnaCategory {
  id: string;
  title: string;
  description?: string;
  questions: QnaQuestion[];
}

export const QNA_CATEGORIES: QnaCategory[] = [
  {
    id: 'deen',
    title: 'Deen & Practice',
    description: 'Share where you stand in your practice — honesty here matters most.',
    questions: [
      { id: 'deen_prayer', label: 'How would you describe your prayer (salah) routine?', placeholder: 'e.g. five times daily, working on consistency…' },
      { id: 'deen_expectations', label: 'What level of religious practice do you hope for in a spouse?', placeholder: 'Your honest expectation…', multiline: true },
    ],
  },
  {
    id: 'family',
    title: 'Family & Values',
    description: 'Help the family understand your background and what you value.',
    questions: [
      { id: 'family_living', label: 'What is your expected living arrangement after marriage?', placeholder: 'e.g. joint family, nuclear, flexible…' },
      { id: 'family_values', label: 'Which family values matter most to you?', placeholder: 'A few words on what you hold important…', multiline: true },
    ],
  },
  {
    id: 'future',
    title: 'Lifestyle & Future',
    description: 'A short note on the life you hope to build.',
    questions: [
      { id: 'future_goals', label: 'What are your goals for the next five years?', placeholder: 'Career, education, family…', multiline: true },
      { id: 'future_note', label: 'Anything else you would like to share with this match?', placeholder: 'Optional — a respectful introduction…', multiline: true },
    ],
  },
];
