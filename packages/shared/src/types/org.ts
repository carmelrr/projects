export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  logoUrl?: string | null;
  brandingTheme?: Record<string, string> | null;
}
