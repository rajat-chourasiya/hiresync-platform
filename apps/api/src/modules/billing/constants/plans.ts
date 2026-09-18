export const PLANS: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 999, yearly: 9990 },
  pro: { monthly: 2999, yearly: 29990 },
  enterprise: { monthly: 9999, yearly: 99990 },
};

export function getPlanAmount(planId: string, cycle: string): number {
  const plan = PLANS[planId];
  if (!plan) throw new Error('Invalid plan');
  return cycle === 'yearly' ? plan.yearly : plan.monthly;
}