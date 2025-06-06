import { Variants } from "@/types/types";
import { create } from "zustand";

type ModelStore = {
  selectedModel: Variants | null;
  selectModel: (model: Variants | null) => void;
};

const useModelStore = create<ModelStore>((set) => ({
  selectedModel: {
    model: "Sample",
    variant: "Glass A",
    path: "/models/glass-center.glb",
  },
  selectModel: (model: Variants | null) => set({ selectedModel: model }),
}));

export default useModelStore;
