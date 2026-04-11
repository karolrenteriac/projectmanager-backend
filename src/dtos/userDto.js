/**
 * @param {import("mongoose").Document | { _id?: unknown; id?: string; name?: string; email?: string; role?: string } | null | undefined} user
 */
function toUserDTO(user) {
  if (!user) return null;
  const id = user._id != null ? user._id.toString() : String(user.id);
  return {
    id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

module.exports = { toUserDTO };
