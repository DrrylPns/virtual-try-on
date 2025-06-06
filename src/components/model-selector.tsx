"use client";

import { models, variants } from "@/lib/constants";
import useModelStore from "@/stores/useModelStore";
import { useState } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

export const ModelSelector1 = () => {
  const { selectModel, selectedModel } = useModelStore();
  const [model, setModel] = useState<string | null>(null);
  const [step, setStep] = useState<number>(0);

  const handleSelectModel = (model: string) => {
    setStep(1);
    setModel(model);
  };

  const handleChangeModel = () => {
    setStep(0);
    setModel(null);
    selectModel(null);
  };

  const filteredVariants = variants.filter(
    (variant) => variant.model === model
  );

  return (
    <div className="fixed bottom-0 left-0 w-full h-44 bg-white/60 backdrop-blur-2xl z-50">
      <div className="relative">
        {(step === 0 || model === null) && (
          <div className="py-4">
            <h3 className="text-lg px-4 font-semibold mb-3 text-gray-900">
              Choose Model
            </h3>

            <div className="w-full overflow-x-auto">
              <div className="flex gap-4 w-max px-5">
                {models.map((model, index) => (
                  <Button
                    variant={"ghost"}
                    key={index}
                    className="relative size-24 rounded-md overflow-hidden cursor-pointer shadow-sm shrink-0"
                    onClick={() => handleSelectModel(model.name)}
                  >
                    <Image
                      src={model.image || "/placeholder.svg"}
                      alt={model.name}
                      fill
                      className="object-cover hover:scale-110 transition-transform duration-300"
                    />
                    <h1 className="absolute top-2 text-center text-amber-100 font-semibold w-full uppercase">
                      {model.name}
                    </h1>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {model && step === 1 && (
          <div className="py-4">
            <div className="px-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold pl-2 text-gray-900">
                  {model}
                </h3>
                <Button
                  variant={"ghost"}
                  onClick={handleChangeModel}
                  className="text-blue-600"
                >
                  Change model
                </Button>
              </div>
            </div>
            {filteredVariants.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div className="flex gap-4 w-max px-5">
                  {filteredVariants.map((variant) => (
                    <Button
                      variant={"ghost"}
                      key={variant.path}
                      className={cn(
                        selectedModel?.path === variant.path &&
                          "bg-amber-200/50 border-amber-200 border-4 rounded-2xl",
                        "relative size-24 flex items-center justify-center bg-gray-50/60 rounded-md overflow-hidden cursor-pointer shadow-sm shrink-0 capitalize"
                      )}
                      onClick={() => selectModel(variant)}
                    >
                      {variant.variant}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <h1 className="flex-1 items-center justify-center text-muted-foreground text-center w-full">
                No Available Variant
              </h1>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
