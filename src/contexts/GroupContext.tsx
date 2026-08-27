import { createContext, useContext } from "react";

export interface GroupInfo {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

interface GroupContextType {
  groups: GroupInfo[];
  activeGroup: GroupInfo | null;
  activeGroupId: string | null;
  setActiveGroup: (groupId: string | null) => void;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => void;
}

export const GroupContext = createContext<GroupContextType | null>(null);

export function useGroupContext() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error("useGroupContext must be used within a GroupContextProvider");
  }
  return context;
}
