declare module '@mediapipe/face_mesh/face_mesh.js' {
    interface FaceLandmark {
        x: number;
        y: number;
        z: number;
    }

    interface FaceMeshResults {
        image: HTMLCanvasElement;
        multiFaceLandmarks?: FaceLandmark[][];
    }

    export class FaceMesh {
        constructor(options: {
            locateFile: (file: string) => string;
        });
        setOptions(options: {
            maxNumFaces?: number;
            refineLandmarks?: boolean;
            minDetectionConfidence?: number;
            minTrackingConfidence?: number;
        }): void;
        onResults(callback: (results: FaceMeshResults) => void): void;
        send(options: { image: HTMLVideoElement | HTMLCanvasElement }): Promise<void>;
        close(): void;
    }
} 