import clientPromise from "@/lib/mongodb";

// Resolves the role-context a session is currently operating under.
// Admins keep their real "admin" role but can preview data as clerk/user via activeRole.
export async function getEffectiveRoleContext(session: any): Promise<"clerk" | "user"> {
  const role = session?.user?.role;
  if (role !== "admin") {
    return role === "clerk" ? "clerk" : "user";
  }

  const client = await clientPromise;
  const db = client.db();
  const { ObjectId } = await import("mongodb");
  const userId = session.user.id;
  const filterConditions: any[] = [{ id: userId }];
  if (ObjectId.isValid(userId)) {
    filterConditions.push({ _id: new ObjectId(userId) });
  }
  const userDoc = await db.collection("users").findOne({ $or: filterConditions } as any);
  return userDoc?.activeRole === "clerk" ? "clerk" : "user";
}

export function buildRoleContextFilter(roleContext: "clerk" | "user") {
  return roleContext === "clerk"
    ? { roleContext: "clerk" }
    : { $or: [{ roleContext: "user" }, { roleContext: { $exists: false } }] };
}
