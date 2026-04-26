import { PerformanceOverview } from '../../components/dashboard/PerformanceOverview';
import { OfferApprovalQueue } from '../../components/dashboard/OfferApprovalQueue';
import { CampaignRulesList } from '../../components/campaigns/CampaignRulesList';
import { DeclineInsights } from '../../components/dashboard/DeclineInsights';
import { AuthGuard } from '../../components/nav/AuthGuard';

export default function DashboardPage(): JSX.Element {
  return (
    <AuthGuard>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1A1A2E', marginBottom: 24 }}>
        Merchant Dashboard
      </h1>
      <PerformanceOverview />
      <OfferApprovalQueue />
      <DeclineInsights />
      <CampaignRulesList />
    </AuthGuard>
  );
}
