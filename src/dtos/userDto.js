/**
 * @param {import("mongoose").Document | { _id?: unknown; id?: string; name?: string; email?: string; role?: string; organization?: any } | null | undefined} user
 */
function toUserDTO(user) {
  if (!user) return null;
  const id = user._id != null ? user._id.toString() : String(user.id);
  return {
    id,
    name: user.name,
    email: user.email,
    role: user.role,
    organization: user.organization ? user.organization.toString() : null,
  };
}

module.exports = { toUserDTO };
