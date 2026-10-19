import { createContext, useContext } from "react";

export interface GuideContextType {
  openGuide: () => void;
  closeGuide: () => void;
  isOpen: boolean;
}

export const GuideContext = createContext<GuideContextType>({
  openGuide: () => {},
  closeGuide: () => {},
  isOpen: false,
});

export function useGuide() {
  return useContext(GuideContext);
}
