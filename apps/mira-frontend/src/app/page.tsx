import CompanyEnrichment from '@/app/company-enrichment/company-enrichment';
import DashboardLayout from '@/components/dashboard-layout';
import { getAuth, protectDashboardPage } from '@/lib/supabase/auth';
import { getWorkspaces } from '@/lib/supabase/orm';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const HomePage = async () => {
  const { status, authUser } = await getAuth();
  protectDashboardPage(status);

  const supabase = await createSupabaseServerClient();
  const workspaces = await getWorkspaces(supabase, authUser!.id);

  return (
    <DashboardLayout>
      <CompanyEnrichment workspaces={workspaces} authUser={authUser!} />
    </DashboardLayout>
  );
};

export default HomePage;
