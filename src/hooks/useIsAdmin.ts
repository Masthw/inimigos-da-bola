import { useGroupContext } from "../contexts/GroupContext";

export function useIsAdmin() {
  const context = useGroupContext();
  return { isAdmin: context.isAdmin, loading: context.loading };
}
