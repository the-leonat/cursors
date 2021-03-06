import fastdom from "fastdom";
import useDeferedCallback from "./useDeferedCallback";
import getDocumentHeight from "./getDocumentHeight";
import { getDevicePixelRatio } from "../config";

export async function useHTMLCanvas(handleCanvasResize) {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = 0;
    canvas.style.right = 0;
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = 9998;
    // canvas.style.opacity = 0.8;
    // canvas.style.mixBlendMode = "luminosity";
    document.documentElement.style.height = "100%";
    // document.body.style.position = "relative";
    // document.body.style.minHeight = "100%";
    document.body.appendChild(canvas);

    function adjustCanvasSize(initial = false) {
        return new Promise((resolve) => {
            fastdom.measure(() => {
                const width = document.body.offsetWidth * getDevicePixelRatio();
                const height = getDocumentHeight() * getDevicePixelRatio();
                if (!initial) handleCanvasResize(width, height);
                else {
                    canvas.width = width;
                    canvas.height = height;
                }
                fastdom.mutate(() => {
                    canvas.style.display = "block";
                    resolve();
                });
            });
        });
    }
    const adjustCanvasSizeDefered = useDeferedCallback(adjustCanvasSize, 500);

    function adjustCanvasOnResize() {
        fastdom.mutate(() => {
            canvas.style.display = "none";
        });
        adjustCanvasSizeDefered();
    }
    // add height resizer
    window.addEventListener("resize", adjustCanvasOnResize);
    await adjustCanvasSize(true);
    return canvas;
}
