import { describe, expect, it } from 'vitest';
import {
  mapClerkUserToMigrationUser,
  normalizeClerkListResponse,
  type TClerkUser,
} from '../clerk/export-dev-users';

describe('normalizeClerkListResponse', () => {
  it('handles bare array responses', () => {
    const payload = [{ id: '1' }] satisfies TClerkUser[];
    const result = normalizeClerkListResponse(payload, 0);

    expect(result).toEqual({
      data: payload,
      limit: 1,
      total_count: 1,
      offset: 0,
    });
  });

  it('handles object responses with data property', () => {
    const payload = {
      data: [{ id: '2' }],
      limit: 50,
      total_count: 10,
      offset: 0,
    };
    const result = normalizeClerkListResponse<TClerkUser>(payload, 0);

    expect(result).toEqual({
      data: payload.data,
      limit: 50,
      total_count: 10,
      offset: 0,
    });
  });

  it('falls back to items array when data property is absent', () => {
    const payload = {
      items: [{ id: '3' }],
    };
    const result = normalizeClerkListResponse<TClerkUser>(payload, 200);

    expect(result).toEqual({
      data: [{ id: '3' }],
      limit: 1,
      total_count: 1,
      offset: 200,
    });
  });
});

describe('mapClerkUserToMigrationUser', () => {
  it('returns a migration-friendly user when a primary email exists', () => {
    const user: TClerkUser = {
      id: 'user_123',
      first_name: 'Jane',
      last_name: 'Doe',
      primary_email_address_id: 'idn_primary',
      email_addresses: [
        { id: 'idn_secondary', email_address: 'secondary@example.com' },
        { id: 'idn_primary', email_address: 'primary@example.com' },
      ],
    };

    const result = mapClerkUserToMigrationUser(user);

    expect(result).toEqual({
      userId: 'user_123',
      email: 'primary@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    });
  });

  it('falls back to the first email when no primary id is set', () => {
    const user: TClerkUser = {
      id: 'user_456',
      email_addresses: [{ id: 'idn_only', email_address: 'only@example.com' }],
    };

    const result = mapClerkUserToMigrationUser(user);

    expect(result).toEqual({
      userId: 'user_456',
      email: 'only@example.com',
    });
  });

  it('returns undefined when the user has no email addresses', () => {
    const user: TClerkUser = {
      id: 'user_789',
    };

    const result = mapClerkUserToMigrationUser(user);

    expect(result).toBeUndefined();
  });
});

