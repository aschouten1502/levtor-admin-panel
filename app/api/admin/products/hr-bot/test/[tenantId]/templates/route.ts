import { NextRequest, NextResponse } from 'next/server';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  QATemplateInput
} from '@/lib/products/hr-bot/qa';

interface RouteParams {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET /api/admin/test/[tenantId]/templates
 * Get all templates for a tenant
 *
 * Query params:
 * - active_only: "true" to only return active templates
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    const { templates, error } = await getTemplates(tenantId, activeOnly);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ templates });

  } catch (error) {
    console.error('❌ [API] Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/test/[tenantId]/templates
 * Create a new template
 *
 * Body: QATemplateInput
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    const body = await request.json() as QATemplateInput;

    // Validate required fields
    if (!body.category || !body.question) {
      return NextResponse.json(
        { error: 'category and question are required' },
        { status: 400 }
      );
    }

    const { template, error } = await createTemplate(tenantId, body);

    if (error || !template) {
      return NextResponse.json(
        { error: error || 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template }, { status: 201 });

  } catch (error) {
    console.error('❌ [API] Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/test/[tenantId]/templates
 * Update a template
 *
 * Query params:
 * - id: Template ID to update
 *
 * Body: Partial<QATemplateInput> & { is_active?: boolean }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const { template, error } = await updateTemplate(templateId, body);

    if (error || !template) {
      return NextResponse.json(
        { error: error || 'Failed to update template' },
        { status: 500 }
      );
    }

    // Verify tenant ownership
    if (template.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Template does not belong to this tenant' },
        { status: 403 }
      );
    }

    return NextResponse.json({ template });

  } catch (error) {
    console.error('❌ [API] Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/test/[tenantId]/templates
 * Delete a template
 *
 * Query params:
 * - id: Template ID to delete
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership by getting templates first
    const { templates } = await getTemplates(tenantId);
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found or does not belong to this tenant' },
        { status: 404 }
      );
    }

    const { success, error } = await deleteTemplate(templateId);

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [API] Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
