# Feature Toggle System

## Overview

This application now includes an admin-controlled feature toggle system that allows administrators to enable/disable features globally. The features currently supported are:

- **AuraVoice**: Cognitive assessment feature
- **Worksheets**: Worksheet generation feature

## Architecture

### Database Schema

The feature toggles are stored in a `feature_toggles` table:

```sql
CREATE TABLE feature_toggles (
  id UUID PRIMARY KEY,
  feature_name VARCHAR(100) UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  description TEXT,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Location**: [supabase/migrations/create_feature_toggles.sql](supabase/migrations/create_feature_toggles.sql)

### Components

1. **FeatureToggleContext** ([contexts/FeatureToggleContext.tsx](contexts/FeatureToggleContext.tsx))
   - Provides global state for feature toggles
   - Fetches toggle states from the API
   - Exposes `isFeatureEnabled(featureName)` hook

2. **FeatureGate** ([components/FeatureGate.tsx](components/FeatureGate.tsx))
   - Component wrapper to protect routes/features
   - Shows fallback UI or redirects when feature is disabled
   - Handles loading states gracefully

3. **AdminFeatureToggles** ([components/AdminFeatureToggles.tsx](components/AdminFeatureToggles.tsx))
   - Admin UI component with toggle switches
   - Only visible to users with `admin` role
   - Displays in Settings page

### API Routes

**GET /api/feature-toggles**
- Returns all feature toggles
- No authentication required (toggles are public)

**POST /api/feature-toggles**
- Updates a feature toggle
- Requires admin role
- Body: `{ feature_name: string, is_enabled: boolean }`

**Location**: [app/api/feature-toggles/route.ts](app/api/feature-toggles/route.ts)

## Setup Instructions

### 1. Run Database Migration

Execute the migration to create the `feature_toggles` table:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the SQL in Supabase dashboard
```

The migration will automatically:
- Create the `feature_toggles` table
- Insert default entries for `aura_voice` and `worksheets` (both enabled by default)
- Set up Row Level Security (RLS) policies
- Create indexes for performance

### 2. Assign Admin Role

To enable feature management, you need to assign the `admin` role to at least one user:

```sql
-- Update a user to have admin role
UPDATE users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

### 3. Access Admin Controls

1. Sign in as an admin user
2. Navigate to Settings page ([/settings](http://localhost:3000/settings))
3. The **Feature Management** card will appear at the top
4. Toggle features on/off as needed

## Usage

### For Developers

#### Using FeatureGate Component

Wrap any feature/page content with `FeatureGate`:

```tsx
import FeatureGate from '@/components/FeatureGate';

export default function MyFeaturePage() {
  return (
    <FeatureGate featureName="aura_voice" redirectTo="/dashboard">
      <div>Your feature content here</div>
    </FeatureGate>
  );
}
```

#### Using the Hook Directly

```tsx
import { useFeatureToggles } from '@/contexts/FeatureToggleContext';

export default function MyComponent() {
  const { isFeatureEnabled, isLoading } = useFeatureToggles();

  if (isLoading) return <Loading />;
  if (!isFeatureEnabled('worksheets')) return null;

  return <div>Feature content</div>;
}
```

#### Conditionally Show Menu Items

The sidebar automatically filters menu items based on toggles:

```tsx
const items = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  {
    name: "AuraVoice",
    path: "/cognitive-assessment",
    icon: Brain,
    featureFlag: 'aura_voice' // Will be filtered if disabled
  },
];
```

### For Administrators

1. **Enabling/Disabling Features**
   - Go to Settings → Feature Management
   - Use the toggle switches to enable/disable features
   - Changes take effect immediately for all users

2. **What Happens When a Feature is Disabled**
   - Menu item is hidden from sidebar
   - Direct access to the route shows "Feature Unavailable" message
   - Users are redirected to dashboard
   - Feature remains in the codebase (not deleted)

## Current Feature Flags

| Feature Name | Description | Default State |
|-------------|-------------|---------------|
| `aura_voice` | AuraVoice cognitive assessment system | Enabled |
| `worksheets` | Worksheet generation feature | Enabled |

## Adding New Features

To add a new feature toggle:

1. **Add to Database**
```sql
INSERT INTO feature_toggles (feature_name, is_enabled, description)
VALUES ('new_feature', true, 'Description of the new feature');
```

2. **Update TypeScript Types**

In [contexts/FeatureToggleContext.tsx](contexts/FeatureToggleContext.tsx):
```tsx
export type FeatureName = 'aura_voice' | 'worksheets' | 'new_feature';
```

3. **Add to Admin UI**

In [components/AdminFeatureToggles.tsx](components/AdminFeatureToggles.tsx):
```tsx
const features: FeatureToggleItem[] = [
  // ... existing features
  {
    name: 'new_feature',
    label: 'New Feature',
    description: 'Description for admins',
  },
];
```

4. **Protect the Route**

In your feature page:
```tsx
<FeatureGate featureName="new_feature">
  {/* Your feature content */}
</FeatureGate>
```

5. **Update Sidebar** (if adding menu item)

In [components/RoleBasedSidebar.tsx](components/RoleBasedSidebar.tsx):
```tsx
{
  name: "New Feature",
  path: "/new-feature",
  icon: YourIcon,
  featureFlag: 'new_feature'
}
```

## Security

- **RLS Policies**: Everyone can read toggles, only admins can update
- **API Authorization**: POST endpoint validates admin role via Clerk
- **Client-Side Filtering**: Menu items and routes are protected
- **Graceful Fallback**: Users see friendly message instead of errors

## Files Modified/Created

### Created
- `supabase/migrations/create_feature_toggles.sql` - Database schema
- `contexts/FeatureToggleContext.tsx` - React context for toggles
- `components/FeatureGate.tsx` - Route protection component
- `components/AdminFeatureToggles.tsx` - Admin UI controls
- `app/api/feature-toggles/route.ts` - API endpoints

### Modified
- `app/providers.tsx` - Added FeatureToggleProvider
- `app/settings/page.tsx` - Added admin controls
- `contexts/AuthContext.tsx` - Added admin role support
- `components/RoleBasedSidebar.tsx` - Added toggle-based filtering
- `app/cognitive-assessment/page.tsx` - Added FeatureGate wrapper
- `app/worksheets/page.tsx` - Added FeatureGate wrapper

## Benefits

1. **No Code Deployment**: Toggle features without redeploying
2. **Gradual Rollout**: Enable features for testing before full launch
3. **Quick Rollback**: Disable problematic features instantly
4. **Maintenance Mode**: Temporarily disable features during updates
5. **A/B Testing**: Enable features for specific conditions (future enhancement)

## Future Enhancements

- Per-user or per-organization feature toggles
- Scheduled feature releases
- Feature toggle analytics
- Role-based feature access (beyond admin)
- Feature toggle history/audit log
