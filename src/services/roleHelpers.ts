/**
 * Role-based access control helpers
 * Provides consistent role checking across the application
 */

export interface User {
	id: number;
	email: string;
	full_name: string;
	unit_number?: string | null;
	role: 'admin' | 'sub_admin' | 'tenant';
	is_active: number;
	created_at: string;
	updated_at: string;
	last_login?: string | null;
}

export function isAdmin(user: User | null | undefined): boolean {
	return !!user && user.role === 'admin';
}

export function isSubAdmin(user: User | null | undefined): boolean {
	return !!user && user.role === 'sub_admin';
}

export function isStaff(user: User | null | undefined): boolean {
	return !!user && (user.role === 'admin' || user.role === 'sub_admin');
}

export function isTenant(user: User | null | undefined): boolean {
	return !!user && user.role === 'tenant';
}

/**
 * Check if user can manage other users
 * - Admin can manage all users
 * - Sub-admin can only manage tenants
 */
export function canManageUser(actor: User | null | undefined, targetRole: string): boolean {
	if (!actor) return false;

	if (isAdmin(actor)) return true; // Admin can manage anyone

	if (isSubAdmin(actor)) {
		// Sub-admin can only manage tenants
		return targetRole === 'tenant';
	}

	return false;
}

/**
 * Check if user can create users with a specific role
 */
export function canCreateRole(actor: User | null | undefined, targetRole: string): boolean {
	if (!actor) return false;

	if (isAdmin(actor)) return true; // Admin can create any role

	if (isSubAdmin(actor)) {
		// Sub-admin can only create tenants
		return targetRole === 'tenant';
	}

	return false;
}
