// polyfill OffscreenCanvas

if (typeof window !== "undefined" && !window.OffscreenCanvas) {
    window.OffscreenCanvas = class OffscreenCanvas {
        constructor(width, height) {
            this.canvas = document.createElement("canvas");
            this.canvas.width = width;
            this.canvas.height = height;

            this.canvas.convertToBlob = () => {
                return new Promise((resolve) => {
                    this.canvas.toBlob(resolve);
                });
            };

            return this.canvas;
        }
    };
}

if (typeof window !== "undefined" && !("createImageBitmap" in window)) {
    window.createImageBitmap = async function (blob) {
        return new Promise((resolve, reject) => {
            let img = document.createElement("img");
            img.addEventListener("load", function () {
                resolve(this);
            });
            img.src = URL.createObjectURL(blob);
        });
    };
}

export default async function createCursorCanvas(imageUrlData) {
    const offscreenCanvas = new OffscreenCanvas(1, 1);
    const imageData = await fetch(imageUrlData).then((res) => res.blob());
    const imageBitmap = await createImageBitmap(imageData);
    offscreenCanvas.width = imageBitmap.width;
    offscreenCanvas.height = imageBitmap.height;
    offscreenCanvas.getContext("2d").drawImage(imageBitmap, 0, 0);
    // console.log(imageBitmap.width, imageBitmap.height);
    return offscreenCanvas;
}
