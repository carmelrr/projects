import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class OrganizationsService {
  constructor(private firebase: FirebaseService) {}

  async getOrg(orgId: string): Promise<Record<string, unknown>> {
    const doc = await this.firebase.organizations().doc(orgId).get();
    if (!doc.exists) throw new NotFoundException('Organization not found');
    const org = doc.data()!;
    return {
      id: doc.id,
      name: org.name,
      slug: org.slug,
      timezone: org.timezone,
      logoUrl: org.logoUrl,
      website: org.website ?? null,
      address: org.address ?? null,
      primaryColor: org.primaryColor ?? null,
      brandingTheme: org.brandingTheme,
      createdAt: org.createdAt,
    };
  }

  async updateOrg(
    orgId: string,
    data: {
      name?: string;
      timezone?: string;
      logoUrl?: string | null;
      website?: string | null;
      address?: string | null;
      primaryColor?: string | null;
      brandingTheme?: Record<string, string>;
    },
  ): Promise<Record<string, unknown>> {
    const doc = await this.firebase.organizations().doc(orgId).get();
    if (!doc.exists) throw new NotFoundException('Organization not found');

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) update.name = data.name;
    if (data.timezone !== undefined) update.timezone = data.timezone;
    if (data.logoUrl !== undefined) update.logoUrl = data.logoUrl;
    if (data.website !== undefined) update.website = data.website;
    if (data.address !== undefined) update.address = data.address;
    if (data.primaryColor !== undefined) update.primaryColor = data.primaryColor;
    if (data.brandingTheme !== undefined) update.brandingTheme = data.brandingTheme;

    await this.firebase.organizations().doc(orgId).update(update);

    return this.getOrg(orgId);
  }

  async listCoaches(orgId: string): Promise<Array<Record<string, unknown>>> {
    // Users with a coachProfile belonging to this org
    const snap = await this.firebase
      .users()
      .where('coachProfile.orgId', '==', orgId)
      .get();

    const coaches = snap.docs
      .map((d) => {
        const u = d.data();
        const cp = u.coachProfile;
        if (!cp) return null;
        const membership = (u.orgs || []).find(
          (o: { orgId: string }) => o.orgId === orgId,
        ) as { role?: string } | undefined;
        const firstName = (u.firstName as string) ?? '';
        const lastName = (u.lastName as string) ?? '';
        const email = (u.email as string) ?? '';
        const avatarUrl = (u.avatarUrl as string | null) ?? null;
        return {
          id: cp.id || d.id,
          userId: d.id,
          role: membership?.role ?? 'COACH',
          firstName,
          lastName,
          email,
          avatarUrl,
          bio: (cp.bio as string | null) ?? null,
          specialties: (cp.specialties as string[]) ?? [],
          capacity: (cp.capacity as number | null) ?? null,
          user: {
            id: d.id,
            email,
            firstName,
            lastName,
            avatarUrl,
          },
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // Sort by first name
    coaches.sort((a, b) => {
      const na = (a.firstName as string) || '';
      const nb = (b.firstName as string) || '';
      return na.localeCompare(nb);
    });

    return coaches;
  }
}
