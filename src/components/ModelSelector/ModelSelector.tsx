'use client';

import { useState } from 'react';

interface Model {
    id: string;
    name: string;
    path: string;
}

const AVAILABLE_MODELS: Model[] = [
    { id: 'bennett', name: 'Glass', path: '/models/glass-center.glb' },
    { id: 'cove', name: 'Cove', path: '/models/Cove/test3.glb' },
    { id: 'elba', name: 'Elba', path: '/models/Elba/8.000.glb' },
    { id: 'jax', name: 'Jax', path: '/models/Jax/5.000.glb' },
    { id: 'lana', name: 'Lana', path: '/models/Lana/4.000.glb' },
    { id: 'leto', name: 'Leto', path: '/models/Leto/3.002.glb' },
    { id: 'lindy', name: 'Lindy', path: '/models/Lindy/6.003.glb' },
    { id: 'lou', name: 'Lou', path: '/models/Lou/7.003.glb' },
];

interface ModelSelectorProps {
    onModelSelect: (model: Model) => void;
    selectedModelId?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    onModelSelect,
    selectedModelId,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative w-full max-w-[300px] mx-auto">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 text-left bg-white border rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                {selectedModelId
                    ? AVAILABLE_MODELS.find((m) => m.id === selectedModelId)?.name
                    : 'Select a model'}
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                    <div className="max-h-60 overflow-auto">
                        {AVAILABLE_MODELS.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    onModelSelect(model);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${selectedModelId === model.id ? 'bg-blue-50' : ''
                                    }`}
                            >
                                {model.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}; 