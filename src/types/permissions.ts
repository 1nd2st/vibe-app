// Permission system for user role-based access control

export type PermissionAction =
  // Collection permissions
  | "collections.view"
  | "collections.create"
  | "collections.edit"
  | "collections.delete"
  | "collections.sign"
  // Item permissions
  | "items.view"
  | "items.create"
  | "items.edit"
  | "items.delete"
  // Photo permissions
  | "photos.view"
  | "photos.add"
  | "photos.edit_notes"
  | "photos.delete"
  | "photos.annotate"
  // Inventory permissions
  | "inventory.view"
  | "inventory.scan"
  | "inventory.move"
  | "inventory.add_notes"
  // Location permissions
  | "locations.view"
  | "locations.create"
  | "locations.edit"
  | "locations.disable"
  // Admin permissions
  | "users.manage"
  | "settings.manage"
  | "reports.export";

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionAction[];
}

export interface PermissionPreset {
  id: string;
  name: string;
  description: string;
  role: "user" | "admin" | "viewer";
  groups: PermissionGroup[];
}

// Permission Groups
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "collections",
    name: "Collections",
    description: "Manage customer collections and documentation",
    permissions: [
      "collections.view",
      "collections.create",
      "collections.edit",
      "collections.delete",
      "collections.sign",
    ],
  },
  {
    id: "items",
    name: "Items",
    description: "Document and manage collection items",
    permissions: [
      "items.view",
      "items.create",
      "items.edit",
      "items.delete",
    ],
  },
  {
    id: "photos",
    name: "Photos & Documentation",
    description: "Take photos, add notes, and annotate images",
    permissions: [
      "photos.view",
      "photos.add",
      "photos.edit_notes",
      "photos.delete",
      "photos.annotate",
    ],
  },
  {
    id: "inventory",
    name: "Inventory Management",
    description: "Scan, move, and track warehouse inventory",
    permissions: [
      "inventory.view",
      "inventory.scan",
      "inventory.move",
      "inventory.add_notes",
    ],
  },
  {
    id: "locations",
    name: "Location Management",
    description: "Create and manage warehouse locations",
    permissions: [
      "locations.view",
      "locations.create",
      "locations.edit",
      "locations.disable",
    ],
  },
  {
    id: "admin",
    name: "Administration",
    description: "System administration and user management",
    permissions: [
      "users.manage",
      "settings.manage",
      "reports.export",
    ],
  },
];

// Permission Presets
export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: "admin",
    name: "Administrator",
    description: "Full access to all features",
    role: "admin",
    groups: PERMISSION_GROUPS, // All groups
  },
  {
    id: "field_worker",
    name: "Field Worker",
    description: "Can document collections but not manage inventory",
    role: "user",
    groups: PERMISSION_GROUPS.filter(g =>
      ["collections", "items", "photos"].includes(g.id)
    ),
  },
  {
    id: "warehouse_worker",
    name: "Warehouse Worker",
    description: "Can manage inventory but not create collections",
    role: "user",
    groups: PERMISSION_GROUPS.filter(g =>
      ["inventory", "locations"].includes(g.id)
    ),
  },
  {
    id: "viewer",
    name: "Viewer (Read-Only)",
    description: "Can view collections and inventory but cannot edit",
    role: "viewer",
    groups: PERMISSION_GROUPS.map(g => ({
      ...g,
      permissions: g.permissions.filter(p => p.endsWith(".view"))
    })),
  },
  {
    id: "full_user",
    name: "Full User Access",
    description: "Can use all features except admin functions",
    role: "user",
    groups: PERMISSION_GROUPS.filter(g => g.id !== "admin"),
  },
];

// Helper function to check if a role has a permission
export function hasPermission(
  role: "user" | "admin" | "viewer",
  permission: PermissionAction
): boolean {
  // Admins always have all permissions
  if (role === "admin") return true;

  // Find the preset for this role
  const preset = PERMISSION_PRESETS.find(p => p.role === role);
  if (!preset) return false;

  // Check if any group in the preset has this permission
  return preset.groups.some(g => g.permissions.includes(permission));
}

// Get all permissions for a role
export function getRolePermissions(role: "user" | "admin" | "viewer"): PermissionAction[] {
  const preset = PERMISSION_PRESETS.find(p => p.role === role);
  if (!preset) return [];

  const permissions: PermissionAction[] = [];
  preset.groups.forEach(g => {
    permissions.push(...g.permissions);
  });

  return [...new Set(permissions)]; // Remove duplicates
}
