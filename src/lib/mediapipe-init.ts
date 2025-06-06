export const initMediaPipe = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.FaceMesh) {
      resolve();
      return;
    }

    (window as any).Module = {
      arguments: [],
      locateFile: (file: string) => {
        return `/mediapipe/${file}`;
      },
      onRuntimeInitialized: () => {
        console.log("WASM module initialized");
        resolve();
      },
      onAbort: (what: any) => {
        console.error("WASM module aborted:", what);
        reject(new Error(`WASM module aborted: ${what}`));
      },
    };

    const script = document.createElement("script");
    script.src = "/mediapipe/face_mesh.js";
    script.async = true;
    script.onload = () => {
      const checkInitialized = setInterval(() => {
        if (window.FaceMesh) {
          clearInterval(checkInitialized);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInitialized);
        if (!window.FaceMesh) {
          reject(new Error("MediaPipe initialization timeout"));
        }
      }, 10000); // 10 second timeout
    };
    script.onerror = (error) => {
      reject(error);
    };
    document.body.appendChild(script);
  });
};
