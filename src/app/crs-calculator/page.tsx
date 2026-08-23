import type { Metadata } from "next";
import CrsCalculatorPage from "./calculator-client";
import { getOrgBranding, OrgBrandHeader, OrgBrandFooter, type OrgBranding } from "@/components/branding/OrgBrand";

interface PageProps {
  searchParams: Promise<{ org?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { org: slug } = await searchParams;
  const branding = await getOrgBranding(slug);
  const name = branding?.name ?? "Immigration Services";
  return {
    title: `${name} — CRS Score Calculator`,
    description: `Calculate your Comprehensive Ranking System (CRS) score for Express Entry with ${name}.`,
  };
}

export default async function Page({ searchParams }: PageProps) {
  const { org: slug } = await searchParams;
  const branding = await getOrgBranding(slug);
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {branding && <OrgBrandHeader branding={branding} />}

      <CrsCalculatorPage branding={branding as OrgBranding | undefined} />

      {branding && (
        <OrgBrandFooter
          branding={branding}
          disclaimer="This calculator is an estimate based on public IRCC criteria and does not constitute legal advice."
        />
      )}
    </div>
  );
}
