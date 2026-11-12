import { StatusBar } from 'expo-status-bar';
import { usePathname } from 'expo-router';
import { useHeroScrolledOff } from '@/lib/ui/heroScrollState';

/** Dark icons over the light pistachio header, light icons over the dark background (scrolled-off header). */
export default function AppStatusBar() {
  const pathname = usePathname();
  const scrolledOff = useHeroScrolledOff((s) => s.off);
  const overHero = !(pathname.startsWith('/food/') && scrolledOff);
  return <StatusBar style={overHero ? 'dark' : 'light'} />;
}
