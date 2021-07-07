import fastdom from "fastdom";
import useDeferedCallback from "./useDeferedCallback";
import getDocumentHeight from "./getDocumentHeight";

export async function useHTMLCanvas(handleCanvasResize) {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = 0;
    canvas.style.right = 0;
    canvas.style.width = "100vw";
    canvas.style.minHeight = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = 9999;
    document.documentElement.style.height = "100%";
    document.body.style.position = "relative";
    document.body.style.minHeight = "100%";
    document.body.appendChild(canvas);

    function adjustCanvasSize(initial = false) {
        return new Promise((resolve) => {
            fastdom.measure(() => {
                const width = document.body.offsetWidth;
                const height = getDocumentHeight();
                if (!initial)
                    handleCanvasResize(width, height);
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
    window.addEventListener("resize", adjustCanvasOnResize);
    await adjustCanvasSize(true);
    return canvas;
}