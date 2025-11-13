# Card Types Management Feature

## Overview
This feature adds comprehensive CRUD (Create, Read, Update, Delete) operations for managing card types with associated percentage rates in the Payment-Track application.

## Components

### 1. Database Migration
**File:** `/supabase/migrations/20251113_create_card_types_table.sql`

Creates the `card_types` table with the following schema:
- `id`: Serial primary key (auto-incrementing integer)
- `name`: Text, unique, not null - the name of the card type
- `percentage`: Numeric(5,2), not null - percentage value between 0 and 100
- `created_at`: Timestamp with timezone - auto-set on creation
- `updated_at`: Timestamp with timezone - auto-updated on modification

**Security:**
- Row Level Security (RLS) enabled
- All authenticated users can view card types
- Only admin users can create, update, or delete card types

**Default Data:**
- Credit Card (2.50%)
- Debit Card (1.50%)
- UPI (0.00%)

### 2. React Admin Component
**File:** `/src/components/admin/AdminCardTypes.tsx`

A full-featured admin interface for managing card types:

**Features:**
- List all card types in a responsive table
- Add new card types via dialog form
- Edit existing card types
- Delete card types with confirmation
- Input validation (percentage must be 0-100)
- Unique name constraint handling
- Real-time data refresh after operations
- Mobile-responsive design
- Success/error toast notifications

### 3. Type Definitions
**File:** `/src/integrations/supabase/types.ts`

TypeScript type definitions for the `card_types` table:
- `Row`: Complete card type record
- `Insert`: Fields for creating a new card type
- `Update`: Fields for updating an existing card type

### 4. Admin Page Integration
**File:** `/src/pages/Admin.tsx`

- Added new "Card Types" tab to the admin dashboard
- Integrated alongside existing tabs (Overview, Users, Transactions, Portals)
- Protected by admin role check

## Usage

### For Admins
1. Navigate to `/admin` in the application
2. Click on the "Card Types" tab
3. Use the interface to:
   - **Add**: Click "Add Card Type" button, fill form, and save
   - **Edit**: Click edit icon on any card type row
   - **Delete**: Click delete icon and confirm

### For Developers

#### Applying the Migration
Using Supabase CLI:
```bash
supabase db push
```

Or manually in Supabase SQL Editor:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration file content
4. Execute the SQL

#### Accessing Card Types in Code
```typescript
import { supabase } from "@/integrations/supabase/client";

// Fetch all card types
const { data, error } = await supabase
  .from("card_types")
  .select("*")
  .order("created_at", { ascending: false });

// Create a card type (admin only)
const { error } = await supabase
  .from("card_types")
  .insert({ name: "Virtual Card", percentage: 1.75 });

// Update a card type (admin only)
const { error } = await supabase
  .from("card_types")
  .update({ percentage: 2.00 })
  .eq("id", cardTypeId);

// Delete a card type (admin only)
const { error } = await supabase
  .from("card_types")
  .delete()
  .eq("id", cardTypeId);
```

## Architecture Notes

### Supabase Integration
- This project uses Supabase as the backend
- REST APIs are auto-generated from PostgreSQL tables
- Authentication and authorization handled via RLS policies
- No separate Express/Node.js server needed

### Security Model
- Admin role required for CUD operations (Create, Update, Delete)
- All authenticated users can read card types
- Enforced at database level via RLS policies

## Future Enhancements
- [ ] Add card type usage analytics
- [ ] Link card types to transactions for reporting
- [ ] Add default card type configuration per portal
- [ ] Export card types to CSV
- [ ] Bulk import via CSV upload
- [ ] Card type history/audit log

## Testing
- Component follows existing patterns in the codebase
- Uses same UI components and styling as other admin features
- Build passes successfully with no new errors
- TypeScript types ensure type safety

## Related Files
- Transaction model uses `card_type` field (added in migration `20251105090500_transactions_add_card_type.sql`)
- Can be integrated with transaction creation/editing forms
