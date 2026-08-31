import { useGroupContext } from "../contexts/GroupContext";

export function useIsAdmin() {
  const context = useGroupContext();
  return {
    isAdmin: context.isAdmin,
    isGroupAdmin: context.isGroupAdmin,
    groupRole: context.groupRole,
    loading: context.loading,
  };
}
