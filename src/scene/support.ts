export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

export function weakDevice() {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return !!((n.deviceMemory && n.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || n.connection?.saveData);
}

/** ¿Vale la pena renderizar escenas 3D en este dispositivo? */
export const canRender3D = () => webglOK() && !weakDevice();
