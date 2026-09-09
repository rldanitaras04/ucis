import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'admin@ucis.local';
const ADMIN_PASSWORD = 'SuperAdmin123!';
const SETUP_SECRET = process.env.SETUP_SECRET || 'ucis-setup-2024';

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();

    if (secret !== SETUP_SECRET) {
      return NextResponse.json(
        { error: 'Invalid setup secret' },
        { status: 403 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .limit(1);

    if (existingAdmin && existingAdmin.length > 0) {
      return NextResponse.json(
        { message: 'Admin already exists' },
        { status: 200 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json(
        { error: 'Failed to create auth user', details: authError.message },
        { status: 500 }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        auth_user_id: authData.user.id,
        first_name: 'Super',
        last_name: 'Admin',
        email: ADMIN_EMAIL,
        status: 'active',
      });

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to create profile', details: profileError.message },
        { status: 500 }
      );
    }

    // Get super_admin role ID
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'super_admin')
      .single();

    if (roleData) {
      // Assign super_admin role
      await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role_id: roleData.id,
          is_active: true,
        });
    }

    return NextResponse.json({
      message: 'Superadmin created successfully',
      credentials: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
