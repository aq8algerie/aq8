import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

export interface AuditLogInput {
  action: string;
  details: string;
  targetId?: string | null;
  targetType?: string | null;
  centerId?: string | null;
  centerName?: string | null;
}

export async function logCrmAction(
  userId: string,
  userName: string,
  userRole: "super_admin" | "center_manager",
  input: AuditLogInput
) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      timestamp: new Date().toISOString(),
      userId,
      userName,
      role: userRole,
      action: input.action,
      details: input.details,
      targetId: input.targetId || null,
      targetType: input.targetType || null,
      centerId: input.centerId || null,
      centerName: input.centerName || null,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
