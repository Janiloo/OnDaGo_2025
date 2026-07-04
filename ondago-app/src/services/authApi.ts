import { client, normalizeId } from "./client";
import { LoginResponse, User, UserProfile } from "../types";

/**
 * NOTE on field names: the backend login/register DTOs name the password
 * field `passwordHash`, but they expect the PLAIN password — hashing is
 * done server-side with BCrypt. We keep the wire name to match the API.
 */

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post("/api/Users/login", {
    email,
    passwordHash: password,
  });
  const rawUser = data.user ?? data.User ?? {};
  const user: User = {
    id: normalizeId(rawUser.id ?? rawUser.Id),
    name: rawUser.name ?? rawUser.Name ?? "",
    email: rawUser.email ?? rawUser.Email ?? email,
    phoneNumber: rawUser.phoneNumber ?? rawUser.PhoneNumber ?? null,
    role: (rawUser.role ?? rawUser.Role ?? "User") as User["role"],
    plateNumber: rawUser.plateNumber ?? rawUser.PlateNumber ?? null,
  };
  return { token: data.token ?? data.Token, user };
}

export async function registerCommuter(input: {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
}): Promise<void> {
  await client.post("/api/Users/register", {
    name: input.name,
    email: input.email,
    passwordHash: input.password,
    phoneNumber: input.phoneNumber,
    role: "User",
  });
}

export async function registerDriver(input: {
  username: string;
  email: string;
  password: string;
  plateNumber: string;
}): Promise<void> {
  await client.post("/api/Users/driver/register", input);
}

export async function registerAdmin(input: {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
}): Promise<void> {
  await client.post("/api/Users/admin/register", {
    name: input.name,
    email: input.email,
    passwordHash: input.password,
    phoneNumber: input.phoneNumber,
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await client.post("/api/Users/forgot-password", { email });
}

export async function changePassword(email: string, token: string, newPassword: string): Promise<void> {
  await client.post("/api/Users/change-password", { email, token, newPassword });
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await client.get("/api/Users/profile");
  return {
    name: data.name ?? data.Name ?? "",
    email: data.email ?? data.Email ?? "",
    phoneNumber: data.phoneNumber ?? data.PhoneNumber ?? null,
    plateNumber: data.plateNumber ?? data.PlateNumber ?? null,
  };
}

export async function editProfile(name: string, phoneNumber: string): Promise<void> {
  await client.put("/api/Users/edit-profile", { name, phoneNumber });
}

export async function deleteAccount(): Promise<void> {
  await client.delete("/api/Users/delete-account");
}

export async function logout(): Promise<void> {
  try {
    await client.post("/api/Users/logout");
  } catch {
    // Logout is client-driven (JWT); server call is best-effort.
  }
}
