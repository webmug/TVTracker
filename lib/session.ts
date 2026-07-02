import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireUser(): Promise<{ id: string; email: string; role: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role ?? "MEMBER",
  };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
