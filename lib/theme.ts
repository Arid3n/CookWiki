export type AppTheme = {
  bg: string;
  surface: string;
  border: string;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
  tabBarBg: string;
  tabBarBorder: string;
  destructive: string;
};

const dark: AppTheme = {
  bg: '#1C1917',          // deep rich espresso/charcoal base
  surface: '#292524',     // slightly elevated dark stone
  border: '#44403C',      // rustic dark border
  accent: '#D97757',      // warm terracotta accent
  accentSoft: '#D9775720',
  textPrimary: '#F5F5F4', // bright warm off-white for contrast
  textSecondary: '#A8A29E',// warm taupe gray
  tabBarBg: '#292524',
  tabBarBorder: '#44403C',
  destructive: '#EF4444',
};

const light: AppTheme = {
  bg: '#FDF4EB',           // extremely pale soft beige for empty space
  surface: '#FAE8D4',      // richer peach/cream for cards
  border: '#F5CD9F',       // extracted Neutral color for boundaries
  accent: '#6E3A2F',       // Primary Dark Brown as main action accent
  accentSoft: '#6E3A2F1A',
  textPrimary: '#3A2019',  // deep warm brown for readable headers
  textSecondary: '#6A4F46',// subdued brown/taupe for subtitles
  tabBarBg: '#FAE8D4',
  tabBarBorder: '#F5CD9F',
  destructive: '#6E2010',  // Secondary Dark Rust Red for destructive
};

export const getTheme = (isDarkMode: boolean): AppTheme =>
  isDarkMode ? dark : light;
