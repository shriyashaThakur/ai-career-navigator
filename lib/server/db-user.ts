import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";

export const getOrCreateDbUser = async () => {
  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;

  if (!clerkUser || !email) {
    return null;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing[0]) {
    return existing[0];
  }

  const inserted = await db
    .insert(usersTable)
    .values({
      name: clerkUser.fullName ?? "User",
      email,
    })
    .returning();

  return inserted[0] ?? null;
};

