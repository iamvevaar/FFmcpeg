import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { VideoSection } from '@/components/VideoSection';
import { ValueProps } from '@/components/ValueProps';
import { AIModeSection } from '@/components/AIModeSection';
import { ManualModeSection } from '@/components/ManualModeSection';
import { CapabilitiesGrid } from '@/components/CapabilitiesGrid';
import { HowItWorks } from '@/components/HowItWorks';
import { SettingsSection } from '@/components/SettingsSection';
import { DownloadSection } from '@/components/DownloadSection';
import { FAQ } from '@/components/FAQ';
import { Footer } from '@/components/Footer';

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <VideoSection />
        <ValueProps />
        <AIModeSection />
        <ManualModeSection />
        <CapabilitiesGrid />
        <HowItWorks />
        <SettingsSection />
        <DownloadSection />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
