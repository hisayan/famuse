/**
 * Demo household bootstrap accounts.
 *
 * These credentials exist so reviewers can join the seeded Miller household
 * with one click. They are demo-only values, shared with the browser on
 * purpose, and must never guard real data.
 */
export const DEMO_HOUSEHOLD_ID = 'miller-hearth';
export const DEMO_HOUSEHOLD_NAME = 'The Miller Hearth';
export const DEMO_PASSWORD = 'FamuseDemo2026!';

export interface DemoAccount {
  memberId: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  status: string;
  blurb: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    memberId: 'mom',
    name: 'Mom',
    email: 'mom@millerhearth.demo',
    role: 'admin',
    status: 'Home',
    blurb: 'Running the evening shift from the clinic.',
  },
  {
    memberId: 'dad',
    name: 'Dad',
    email: 'dad@millerhearth.demo',
    role: 'admin',
    status: 'Commuting',
    blurb: 'On dinner duty and Buddy patrol.',
  },
  {
    memberId: 'leo',
    name: 'Leo',
    email: 'leo@millerhearth.demo',
    role: 'member',
    status: 'At Soccer Practice',
    blurb: 'Will be home hungry after practice.',
  },
];

export function findDemoAccountByEmail(email: string): DemoAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email === normalized);
}
