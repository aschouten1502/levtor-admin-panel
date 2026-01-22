import { NextResponse } from 'next/server';
import {
  getCustomerUserById,
  updateCustomerUser,
  deleteCustomerUser,
} from '@/lib/portal/customer-service';

/**
 * ========================================
 * ADMIN CUSTOMER DETAIL API
 * ========================================
 *
 * GET    /api/admin/customers/[id] - Haal customer op
 * PUT    /api/admin/customers/[id] - Update customer
 * DELETE /api/admin/customers/[id] - Verwijder customer
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Haal specifieke customer op
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const customer = await getCustomerUserById(id);

    if (!customer) {
      return NextResponse.json(
        { error: 'Klant niet gevonden' },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('❌ [Admin Customer API] GET error:', error);
    return NextResponse.json(
      { error: 'Kon klant niet ophalen' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update customer
 *
 * Body: {
 *   name?: string,
 *   role?: 'admin' | 'user',
 *   is_active?: boolean
 * }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check of customer bestaat
    const existing = await getCustomerUserById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Klant niet gevonden' },
        { status: 404 }
      );
    }

    // Valideer role als meegegeven
    if (body.role && !['admin', 'user'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Role moet "admin" of "user" zijn' },
        { status: 400 }
      );
    }

    const result = await updateCustomerUser(id, {
      name: body.name,
      role: body.role,
      is_active: body.is_active,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ customer: result.customer });
  } catch (error) {
    console.error('❌ [Admin Customer API] PUT error:', error);
    return NextResponse.json(
      { error: 'Kon klant niet updaten' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Verwijder customer (+ Supabase Auth user)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check of customer bestaat
    const existing = await getCustomerUserById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Klant niet gevonden' },
        { status: 404 }
      );
    }

    const result = await deleteCustomerUser(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [Admin Customer API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Kon klant niet verwijderen' },
      { status: 500 }
    );
  }
}
