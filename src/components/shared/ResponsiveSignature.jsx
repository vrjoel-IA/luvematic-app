import { useLayoutEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

// Keep the drawing coordinates aligned with the container, including after rotation.
export function ResponsiveSignature({ signatureRef }) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const signature = signatureRef.current;
    const canvas = signature.getCanvas();
    let previousWidth = canvas.getBoundingClientRect().width;
    const resize = () => {
      const width = container.clientWidth;
      if (!width) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(180 * ratio);
      if (canvas.width === pixelWidth && canvas.height === pixelHeight) return;
      const scaleX = previousWidth ? width / previousWidth : 1;
      const strokes = signature.toData().map(group =>
        group.map(point => ({ ...point, x: point.x * scaleX }))
      );
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
      signature.clear();
      signature.fromData(strokes);
      previousWidth = width;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [signatureRef]);

  return (
    <div ref={containerRef} className="signature-container">
      <SignatureCanvas ref={signatureRef} penColor="blue" clearOnResize={false}
        canvasProps={{ className: 'sigCanvas', 'aria-label': 'Firma del cliente' }} />
    </div>
  );
}
