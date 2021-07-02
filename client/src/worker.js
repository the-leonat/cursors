import insideWorker from "./lib/insideWorker";
import { useAnimationLoop } from "./view";
import Cursor from "./Cursor";
import cursorImageUrlData from "data-url:./../assets/cursor.png";
import CircularBuffer from "mnemonist/circular-buffer";

function getOrCreateCursorFromUserId(cursorMap, userId) {
    let cursor = cursorMap.get(userId);
    if (!cursor) {
        cursor = new Cursor(0, 0);
        cursorMap.set(userId, cursor);
    }
    return cursor;
}

function updateCursorPositions(frame, cursorMap, updateAfterResize = false) {
    frame.forEach((entry) => {
        const { userId, x, y, lastEntry } = entry;
        const cursor = getOrCreateCursorFromUserId(cursorMap, userId);

        if (lastEntry) {
            cursor.willDelete();
        }
        if (updateAfterResize) {
            cursor.updatePositions(x, y);
        } else {
            cursor.moveTo(x, y, 120);
        }
    });
}

async function createCursorCanvas() {
    const offscreenCanvas = new OffscreenCanvas(1, 1);
    const imageData = await fetch(cursorImageUrlData).then((res) => res.blob());
    const imageBitmap = await createImageBitmap(imageData);
    offscreenCanvas.width = imageBitmap.width;
    offscreenCanvas.height = imageBitmap.height;
    offscreenCanvas.getContext("2d").drawImage(imageBitmap, 0, 0);
    console.log(imageBitmap.width, imageBitmap.height);
    return offscreenCanvas;
}

async function useDrawCursors(getNextFrame, resetFrames) {
    const cursorMap = new Map();
    const cursorCanvas = await createCursorCanvas();

    const { start: startAnimation, stop: stopAnimation } = useAnimationLoop(
        (delta, cx) => {
            cursorMap.forEach((cursor) => {
                cursor.update(delta);
                cursor.renderClearCanvas(cx, cursorCanvas);
            });
            cursorMap.forEach((cursor) => {
                cursor.renderDrawCanvas(cx, cursorCanvas);
            });
        },
        60
    );
    let gCurrentEntries;
    let gIsLastFrame;
    let gCurrentFrameNumber;

    const { start: startFrameProcessing, stop: stopFrameProcessing } =
        useAnimationLoop(() => {
            const nextFrame = getNextFrame();
            if (!nextFrame) return;
            const { isLast, entries, number } = nextFrame;
            gCurrentEntries = entries;
            gCurrentFrameNumber = number;
            gIsLastFrame = isLast;
            console.log("render frame", number);
            updateCursorPositions(gCurrentEntries, cursorMap);
            if (gIsLastFrame) {
                gCurrentEntries = null;
                console.log("end");
                stopFrameProcessing();
                stopAnimation();
            }
        }, 0.5);

    function incomingWorkerMessageHandler(_event) {
        if (_event.data.canvas) {
            const canvas = _event.data.canvas;
            const cx = canvas.getContext("2d");
            start(cx);
        } else if (_event.data.type === "resize") {
            resetFrames(gCurrentFrameNumber);
        }
    }

    // const updateCursorPositionsOnResize = useDeferedCallback(() => {
    //     if (!gCurrentEntries) return;
    //     console.log("update", gCurrentEntries, canvas.width, canvas.height);

    //     updateCursorPositions(gCurrentEntries, cursorMap, true);
    //     console.log("resize");
    // }, 600);
    // window.addEventListener("resize", updateCursorPositionsOnResize);

    function clearCanvas() {
        cx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function start(cx) {
        cx = canvas.getContext("2d");
        startAnimation(cx);
        startFrameProcessing();
        // clear canvas once
        clearCanvas();
    }

    function stop(cx) {
        stopAnimation();
        stopFrameProcessing();
        // clear canvas once
        clearCanvas(cx);
    }

    return {
        start,
        stop,
        incomingWorkerMessageHandler,
    };
}

function useCursorData() {
    const framesPerSecond = 1;
    const bufferSizeInSeconds = 30;
    const frameBufferCapacity = framesPerSecond * bufferSizeInSeconds;
    const frameBuffer = new CircularBuffer(Array, frameBufferCapacity);
    let outgoingWorkerMessageHandler = null;
    let currentTimeoutId = null;
    let done = false;
    requestFrames(0, frameBufferCapacity);

    function incomingWorkerMessageHandler(_event) {
        const { type, data } = _event.data;
        if (type === "frames") {
            data.forEach((frame) => {
                frameBuffer.push(frame);
                console.log(`queued frame ${frame.number}`);
            });
            const lastFrame = frameBuffer.peekLast();
            if (lastFrame.last) {
                stopNextFrameRequest();
            } else {
                requestFrames(lastFrame.number);
            }
        }
    }

    function stopNextFrameRequest() {
        if (currentTimeoutId) clearTimeout(currentTimeoutId);
    }

    function requestFrames(_from) {
        const emptyBufferSize = frameBufferCapacity - frameBuffer.size;
        if (emptyBufferSize > frameBufferCapacity * 0.25) {
            outgoingWorkerMessageHandler({
                type: "frames",
                data: {
                    from: _from,
                    to: _from + emptyBufferSize,
                },
            });
        }

        setTimeout(
            () =>
                requestFrames(_from),
            1000
        );
    }

    function setOutgoingWorkerMessageHandler(_handler) {
        outgoingWorkerMessageHandler = _handler;
    }

    function getFrame() {
        return frameBuffer.shift();
    }

    function resetFrames(_from) {
        frameBuffer.clear();
        // we dont know the max number here so we assume the highest
        stopNextFrameRequest();
        requestFrames(_from, Number.POSITIVE_INFINITY);
    }

    return {
        incomingWorkerMessageHandler,
        setOutgoingWorkerMessageHandler,
        getFrame,
        resetFrames,
    };
}

(async function () {
    const {
        getFrame,
        resetFrames,
        incomingWorkerMessageHandler: onMessageData,
        setOutgoingWorkerMessageHandler,
    } = useCursorData();
    const {
        start,
        stop,
        incomingWorkerMessageHandler: onMessageRender,
    } = await useDrawCursors(getFrame, resetFrames);
    const worker = insideWorker((e) => {
        onMessageRender(e);
        onMessageData(e);
    });
    setOutgoingWorkerMessageHandler(worker.post);
})();

export default undefined;
