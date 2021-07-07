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
        const { userId, x, y, last } = entry;
        const cursor = getOrCreateCursorFromUserId(cursorMap, userId);

        if (last) {
            cursor.willDelete();
        }
        if (updateAfterResize) {
            cursor.updatePositions(x, y);
        } else {
            cursor.moveTo(x, y, 60);
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

function useDrawCursors(getNextFrame, initializedCallback) {
    const cursorMap = new Map();
    // state
    let cursorCanvas;
    let currentFrameNumber = 0;
    let canvas;

    createCursorCanvas().then((_canvas) => {
        initializedCallback();
        cursorCanvas = _canvas;
    });

    const { start: startAnimation, stop: stopAnimation } = useAnimationLoop(
        (delta, cx) => {
            // we need to await until this is resolved
            if (!cursorCanvas) return;
            cursorMap.forEach((cursor) => {
                cursor.update(delta);
                cursor.renderClearCanvas(cx, cursorCanvas);
                if (cursor.willDelete) cursorMap.delete(cursor);
            });
            cursorMap.forEach((cursor) => {
                cursor.renderDrawCanvas(cx, cursorCanvas);
            });
        },
        60
    );

    const { start: startFrameProcessing, stop: stopFrameProcessing } =
        useAnimationLoop(() => {
            const nextFrame = getNextFrame();
            if (!nextFrame) return;
            const { last, entries, number } = nextFrame;
            currentFrameNumber = number;
            console.log("render frame", number, nextFrame);
            updateCursorPositions(entries, cursorMap);
            if (last) {
                console.log("end");
                stopFrameProcessing();
                stopAnimation();
            }
        }, 1);

    // const updateCursorPositionsOnResize = useDeferedCallback(() => {
    //     if (!gCurrentEntries) return;
    //     console.log("update", gCurrentEntries, canvas.width, canvas.height);

    //     updateCursorPositions(gCurrentEntries, cursorMap, true);
    //     console.log("resize");
    // }, 600);
    // window.addEventListener("resize", updateCursorPositionsOnResize);

    function getCurrentFrameNumber() {
        return currentFrameNumber;
    }

    function clearCanvas() {
        const cx = canvas.getContext("2d");
        cx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function resizeCanvas(_width, _height) {
        canvas.width = _width;
        canvas.height = _height;
    }

    function setCanvas(_canvas) {
        canvas = _canvas;
    }

    function start() {
        if (!canvas) {
            throw "canvas is not set!";
        }
        const cx = canvas.getContext("2d");
        startAnimation(cx);
        startFrameProcessing();
        // clear canvas once
        clearCanvas();
    }

    function stop() {
        stopAnimation();
        stopFrameProcessing();
        // clear canvas once
        // clearCanvas();
    }

    return {
        start,
        stop,
        setCanvas,
        resizeCanvas,
        getCurrentFrameNumber,
    };
}

function useRequestFrameData(handleRequestFrames) {
    const framesPerSecond = 1;
    const bufferSizeInSeconds = 30;
    const frameBufferCapacity = framesPerSecond * bufferSizeInSeconds;
    const frameBuffer = new CircularBuffer(Array, frameBufferCapacity);
    let currentTimeoutId = null;
    let highestLoadedFrameNumber = 0;

    function startRequest() {
        requestFrames();
    }

    function handleIncomingFrames(data) {
        const { frames } = data;
        frames.forEach((frame) => {
            console.log("queueed", frame)
            frameBuffer.push(frame);
        });
        const firstFrame = frameBuffer.peekFirst();
        const lastFrame = frameBuffer.peekLast();

        if (firstFrame && lastFrame) {
            console.log(`now in buffer frames ${firstFrame.number}-${lastFrame.number}`);
            const { last } = lastFrame;
            highestLoadedFrameNumber = lastFrame.number + 1;
            if (last) {
                console.log("last frame");
                unscheduleNextFrameRequest();
            } else {
                scheduleNextFrameRequest();
            }
        }
    }

    function unscheduleNextFrameRequest() {
        clearTimeout(currentTimeoutId);
        currentTimeoutId = null;
    }

    function scheduleNextFrameRequest() {
        unscheduleNextFrameRequest();
        currentTimeoutId = setTimeout(
            () => requestFrames(),
            bufferSizeInSeconds * 0.25 * 1000
        );
    }

    function requestFrames() {
        unscheduleNextFrameRequest();
        const emptyBufferSize = frameBufferCapacity - frameBuffer.size;
        if (emptyBufferSize > frameBufferCapacity * 0.25) {
            const from = highestLoadedFrameNumber;
            const to = highestLoadedFrameNumber + emptyBufferSize;
            handleRequestFrames(from, to);
        }
        scheduleNextFrameRequest();
    }

    function getFrame() {
        return frameBuffer.shift();
    }

    function resetFrameBuffer(_from) {
        frameBuffer.clear();
        // we dont know the max number here so we assume the highest
        unscheduleNextFrameRequest();
        highestLoadedFrameNumber = _from;
        requestFrames();
    }

    return {
        handleIncomingFrames,
        getFrame,
        resetFrameBuffer,
        startRequest,
    };
}

(async function () {
    const worker = insideWorker(handleWorkerEvent);
    function handleRequestFrames(_from, _to) {
        if (!worker) throw "Worker not initialized";
        console.log("request frames", _from, _to)
        worker.post({
            type: "frames",
            from: _from,
            to: _to,
        });
    }

    function handleInitialized() {
        worker.post({
            type: "initialized",
        });
    }

    const { getFrame, handleIncomingFrames, resetFrameBuffer, startRequest } =
        useRequestFrameData(handleRequestFrames);
    const { start, stop, setCanvas, getCurrentFrameNumber, resizeCanvas } =
        useDrawCursors(getFrame, handleInitialized);

    function handleWorkerEvent(_event) {
        // console.log("worker thread event", _event);
        if (_event.data.type === "frames") {
            const { data } = _event;
            handleIncomingFrames(data);
        } else if (_event.data.canvas) {
            const canvas = _event.data.canvas;
            setCanvas(canvas);
        } else if (_event.data.type === "resize") {
            const { width, height } = _event.data;
            const frameNumber = getCurrentFrameNumber();
            resetFrameBuffer(frameNumber);
            resizeCanvas(width, height);
        } else if (_event.data.type === "stop") {
            stop();
        } else if (_event.data.type === "start") {
            const frameNumber = getCurrentFrameNumber();
            startRequest(frameNumber);
            start();
        } else {
            throw "unrecognized event";
        }
    }
})();

export default undefined;
