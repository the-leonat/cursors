

export default async function createCursorCanvas(imageUrlData) {
    const offscreenCanvas = new OffscreenCanvas(1, 1);
    const imageData = await fetch(imageUrlData).then((res) => res.blob());
    const imageBitmap = await createImageBitmap(imageData);
    offscreenCanvas.width = imageBitmap.width;
    offscreenCanvas.height = imageBitmap.height;
    offscreenCanvas.getContext("2d").drawImage(imageBitmap, 0, 0);
    console.log(imageBitmap.width, imageBitmap.height);
    return offscreenCanvas;
}