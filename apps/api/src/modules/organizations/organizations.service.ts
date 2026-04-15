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
      brandingTheme: org.brandingTheme,
      createdAt: org.createdAt,
    };
  }

  async updateOrg(orgId: string, data: { name?: string; timezone?: string; logoUrl?: string; brandingTheme?: Record<string, string> }): Promise<Record<string, unknown>> {
    const doc = await this.firebase.organizations().doc(orgId).get();
    if (!doc.exists) throw new NotFoundException('Organization not found');

    await this.firebase.organizations().doc(orgId).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    const updated = await this.firebase.organizations().doc(orgId).get();
    const org = updated.data()!;
    return {
      id: updated.id,
      name: org.name,
      slug: org.slug,
      timezone: org.timezone,
      logoUrl: org.logoUrl,
      brandingTheme: org.brandingTheme,
    };
  }
}
