import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { getRequestSupabase, getRequestUser, getServiceSupabase, jsonError, REQUIREMENT_SELECT, withNoStore } from "@/lib/deal-server";
import { isActiveBrokerStatus } from "@/lib/deal-utils";
import { enrichRequirementsWithSubmissionMeta, fetchBrokerProfileByUserId } from "@/lib/requirements-server";
import type { Requirement, RequirementDeactivatedBy } from "@/lib/deal-types";
import { parseRequirementBedroomOption } from "@/lib/requirements";

type RequirementActivityValue = string | number | boolean | null;

function getRequirementPayload(body: Record<string, unknown>) {
  const rawBedrooms = String(body.bedrooms || "").trim();

  return {
    title: String(body.title || "").trim() || null,
    description: String(body.description || "").trim(),
    property_type: String(body.propertyType || body.property_type || "apartment").trim(),
    deal_type: String(body.dealType || body.deal_type || "secondary").trim(),
    bedrooms: parseRequirementBedroomOption(rawBedrooms) || rawBedrooms || null,
    budget_min: body.budgetMin || body.budget_min ? Number(body.budgetMin || body.budget_min) : null,
    budget_max: body.budgetMax || body.budget_max ? Number(body.budgetMax || body.budget_max) : null,
    area: String(body.area || "").trim(),
    urgency: String(body.urgency || "medium").trim(),
    timeline: String(body.timeline || "").trim() || null,
  };
}

function getRequirementActivityChange(
  field: string,
  previousValue: RequirementActivityValue,
  nextValue: RequirementActivityValue
) {
  const normalizedPreviousValue = previousValue ?? null;
  const normalizedNextValue = nextValue ?? null;

  if (normalizedPreviousValue === normalizedNextValue) {
    return null;
  }

  return {
    field,
    previousValue: normalizedPreviousValue,
    nextValue: normalizedNextValue,
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const viewer = await getRequestUser(request);
  if (!viewer || (viewer.role !== "admin" && (viewer.role !== "broker" || !isActiveBrokerStatus(viewer.status)))) {
    return jsonError("Broker or admin access required.", 403);
  }

  const supabase = getRequestSupabase(request);
  const { data, error } = await supabase.from("requirements").select(REQUIREMENT_SELECT).eq("id", params.id).maybeSingle();

  if (error) {
    return jsonError(error.message || "Failed to load requirement.", 400);
  }

  if (!data) {
    return jsonError("Requirement not found.", 404);
  }

  const [requirement] = await enrichRequirementsWithSubmissionMeta(supabase, [data as Requirement]);

  return NextResponse.json({ requirement }, withNoStore());
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const viewer = await getRequestUser(request);
  if (!viewer || viewer.role !== "broker" || !isActiveBrokerStatus(viewer.status)) {
    return jsonError("Active broker access required.", 403);
  }

  const supabase = getRequestSupabase(request);
  const brokerProfile = await fetchBrokerProfileByUserId(supabase, viewer.id);
  if (!brokerProfile?.id) {
    return jsonError("Broker profile not found.", 404);
  }

  const { data: existingRequirementRow, error: loadError } = await supabase
    .from("requirements")
    .select(REQUIREMENT_SELECT)
    .eq("id", params.id)
    .maybeSingle();
  const existingRequirement = (existingRequirementRow as Requirement | null) || null;

  if (loadError) {
    return jsonError(loadError.message || "Failed to load requirement.", 400);
  }

  if (!existingRequirement) {
    return jsonError("Requirement not found.", 404);
  }

  if (existingRequirement.deleted_at) {
    return jsonError("Deleted requirements cannot be edited.", 400);
  }

  if (existingRequirement.broker_id !== brokerProfile.id) {
    return jsonError("You can only update your own requirement.", 403);
  }

  const body = await request.json();
  const payload = getRequirementPayload(body);

  if (!payload.area) {
    return jsonError("Area is required.", 400);
  }

  if (payload.budget_min !== null && !Number.isFinite(payload.budget_min)) {
    return jsonError("Minimum budget must be numeric.", 400);
  }

  if (payload.budget_max !== null && !Number.isFinite(payload.budget_max)) {
    return jsonError("Maximum budget must be numeric.", 400);
  }

  if (payload.budget_min !== null && payload.budget_max !== null && payload.budget_min > payload.budget_max) {
    return jsonError("Minimum budget cannot be higher than maximum budget.", 400);
  }

  const changedFields = [
    getRequirementActivityChange("title", existingRequirement.title, payload.title),
    getRequirementActivityChange("description", existingRequirement.description, payload.description),
    getRequirementActivityChange("property_type", existingRequirement.property_type, payload.property_type),
    getRequirementActivityChange("deal_type", existingRequirement.deal_type, payload.deal_type),
    getRequirementActivityChange("bedrooms", existingRequirement.bedrooms, payload.bedrooms),
    getRequirementActivityChange("budget_min", existingRequirement.budget_min, payload.budget_min),
    getRequirementActivityChange("budget_max", existingRequirement.budget_max, payload.budget_max),
    getRequirementActivityChange("area", existingRequirement.area, payload.area),
    getRequirementActivityChange("urgency", existingRequirement.urgency, payload.urgency),
    getRequirementActivityChange("timeline", existingRequirement.timeline, payload.timeline),
  ].filter((change): change is NonNullable<typeof change> => Boolean(change));

  const { error } = await supabase
    .from("requirements")
    .update({
      ...payload,
    })
    .eq("id", params.id);

  if (error) {
    return jsonError(error.message || "Failed to update requirement.", 400);
  }

  if (changedFields.length) {
    await logActivity(getServiceSupabase(), viewer.id, "requirement_updated", "requirements", params.id, {
      requirementTitle: payload.title || existingRequirement.title,
      changedFields,
    });
  }

  return NextResponse.json({ success: true }, withNoStore());
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const viewer = await getRequestUser(request);
  if (!viewer || (viewer.role !== "admin" && (viewer.role !== "broker" || !isActiveBrokerStatus(viewer.status)))) {
    return jsonError("Broker or admin access required.", 403);
  }

  const supabase = getRequestSupabase(request);
  const body = await request.json();

  if (body.action !== "deactivate" && body.action !== "activate" && body.action !== "mark_notification_read") {
    return jsonError("Unsupported requirement action.", 400);
  }

  if (body.action === "mark_notification_read") {
    if (!body.notificationId || typeof body.notificationId !== "string") {
      return jsonError("Notification id is required.", 400);
    }

    const { error } = await supabase
      .from("broker_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", body.notificationId);

    if (error) {
      return jsonError(error.message || "Failed to update notification.", 400);
    }

    return NextResponse.json({ success: true }, withNoStore());
  }

  const { data: existingRequirementRow, error: loadError } = await supabase
    .from("requirements")
    .select(REQUIREMENT_SELECT)
    .eq("id", params.id)
    .maybeSingle();
  const existingRequirement = (existingRequirementRow as Requirement | null) || null;

  if (loadError) {
    return jsonError(loadError.message || "Failed to load requirement.", 400);
  }

  if (!existingRequirement) {
    return jsonError("Requirement not found.", 404);
  }

  if (existingRequirement.deleted_at) {
    return jsonError("Deleted requirements cannot be updated.", 400);
  }

  if (viewer.role === "broker") {
    const brokerProfile = await fetchBrokerProfileByUserId(supabase, viewer.id);
    if (!brokerProfile?.id) {
      return jsonError("Broker profile not found.", 404);
    }

    if (existingRequirement.broker_id !== brokerProfile.id) {
      return jsonError("You can only manage your own requirement.", 403);
    }
  }

  if (body.action === "activate" && existingRequirement.is_active) {
    return NextResponse.json({ success: true }, withNoStore());
  }

  if (
    body.action === "deactivate" &&
    !existingRequirement.is_active &&
    viewer.role !== "admin" &&
    existingRequirement.deactivated_by === "broker"
  ) {
    return NextResponse.json({ success: true }, withNoStore());
  }

  if (viewer.role === "broker") {
    if (body.action === "activate" && existingRequirement.deactivated_by !== "broker") {
      return jsonError("This requirement was deactivated by admin and cannot be reactivated by broker.", 403);
    }

    if (body.action === "deactivate" && !existingRequirement.is_active && existingRequirement.deactivated_by === "admin") {
      return jsonError("Admin deactivation cannot be overridden by broker.", 403);
    }
  }

  const deactivatedBy: RequirementDeactivatedBy | null =
    body.action === "activate" ? null : viewer.role === "admin" ? "admin" : "broker";

  const { error } = await supabase
    .from("requirements")
    .update({
      is_active: body.action === "activate",
      deactivated_by: deactivatedBy,
    })
    .eq("id", params.id);

  if (error) {
    return jsonError(error.message || "Failed to update requirement status.", 400);
  }

  await logActivity(
    getServiceSupabase(),
    viewer.id,
    body.action === "activate" ? "requirement_activated" : "requirement_deactivated",
    "requirements",
    params.id,
    {
      requirementTitle: existingRequirement.title,
      previousActive: existingRequirement.is_active,
      nextActive: body.action === "activate",
      deactivatedBy,
    }
  );

  return NextResponse.json({ success: true }, withNoStore());
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const viewer = await getRequestUser(request);
  if (!viewer || (viewer.role !== "admin" && (viewer.role !== "broker" || !isActiveBrokerStatus(viewer.status)))) {
    return jsonError("Broker or admin access required.", 403);
  }

  const serviceSupabase = getServiceSupabase();
  const { data: existingRequirementRow, error: loadError } = await serviceSupabase
    .from("requirements")
    .select(REQUIREMENT_SELECT)
    .eq("id", params.id)
    .maybeSingle();
  const existingRequirement = (existingRequirementRow as Requirement | null) || null;

  if (loadError) {
    return jsonError(loadError.message || "Failed to load requirement.", 400);
  }

  if (!existingRequirement) {
    return jsonError("Requirement not found.", 404);
  }

  if (existingRequirement.deleted_at) {
    return jsonError("Requirement already deleted.", 400);
  }

  if (viewer.role === "broker") {
    const brokerProfile = await fetchBrokerProfileByUserId(serviceSupabase, viewer.id);
    if (!brokerProfile?.id) {
      return jsonError("Broker profile not found.", 404);
    }

    if (existingRequirement.broker_id !== brokerProfile.id) {
      return jsonError("You can only delete your own requirement.", 403);
    }
  }

  const timestamp = new Date().toISOString();
  const { error } = await serviceSupabase
    .from("requirements")
    .update({
      deleted_at: timestamp,
      is_active: false,
      deactivated_by: existingRequirement.deactivated_by || (viewer.role === "admin" ? "admin" : "broker"),
    })
    .eq("id", params.id)
    .is("deleted_at", null);

  if (error) {
    return jsonError(error.message || "Failed to delete requirement.", 400);
  }

  await logActivity(serviceSupabase, viewer.id, "requirement_deleted", "requirements", params.id, {
    requirementTitle: existingRequirement.title,
    softDeleted: true,
    previousActive: existingRequirement.is_active,
    deactivatedBy: existingRequirement.deactivated_by || (viewer.role === "admin" ? "admin" : "broker"),
  });

  return NextResponse.json({ success: true }, withNoStore());
}

