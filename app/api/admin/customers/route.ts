import { NextResponse } from 'next/server';
import {
  getAllCustomerUsers,
  createCustomerUser,
  CustomerUserCreateInput,
} from '@/lib/portal/customer-service';

/**
 * ========================================
 * ADMIN CUSTOMERS API
 * ========================================
 *
 * GET  /api/admin/customers - Lijst alle customer users
 * POST /api/admin/customers - Maak nieuwe customer user
 */

/**
 * GET - Lijst alle customer users
 */
export async function GET() {
  try {
    const customers = await getAllCustomerUsers();

    return NextResponse.json({
      customers,
      count: customers.length,
    });
  } catch (error) {
    console.error('❌ [Admin Customers API] GET error:', error);
    return NextResponse.json(
      { error: 'Kon klanten niet ophalen' },
      { status: 500 }
    );
  }
}

/**
 * POST - Maak nieuwe customer user
 *
 * Body: {
 *   tenant_id: string,
 *   email: string,
 *   password: string,
 *   name?: string,
 *   role?: 'admin' | 'user'
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validatie
    if (!body.tenant_id) {
      return NextResponse.json(
        { error: 'tenant_id is verplicht' },
        { status: 400 }
      );
    }

    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is verplicht' },
        { status: 400 }
      );
    }

    if (!body.password || body.password.length < 8) {
      return NextResponse.json(
        { error: 'Wachtwoord moet minimaal 8 karakters zijn' },
        { status: 400 }
      );
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Ongeldig emailadres' },
        { status: 400 }
      );
    }

    const input: CustomerUserCreateInput = {
      tenant_id: body.tenant_id,
      email: body.email.toLowerCase().trim(),
      password: body.password,
      name: body.name?.trim() || undefined,
      role: body.role || 'user',
    };

    const result = await createCustomerUser(input);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { customer: result.customer },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ [Admin Customers API] POST error:', error);
    return NextResponse.json(
      { error: 'Kon klant niet aanmaken' },
      { status: 500 }
    );
  }
}
