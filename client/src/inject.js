import trackCursor, { useResourceId, getDimensions } from "./track";
import CircularBuffer from "circular-buffer";
import useStorage from "./storage";
import fastdom from "fastdom";
import { useAnimationLoop } from "./view";
import Cursor from "./Cursor";
import useDeferedCallback, { getDocumentHeight } from "./util";
import cursorImage from "data-url:./../assets/cursor.png";


// todo convert to typescript
// todo dont update position when cursor is only slightly different in position
// move to offscreen canvas
// bug cursor not included in the current frame cant update their position
// useCursorData reset does not reset timer
// send tracking info only if position changes
// but also if not changing send every 10 seconds
// hover over svg problem
// track cursor does unnessecary dom measuring

function injectHtml() {
    var div = document.createElement("div");
    div.style.position = "fixed";
    div.style.top = 0;
    div.style.right = 0;
    div.style.zIndex = 9999;
    div.style.background = "red";
    div.textContent = "Injected!";
    document.body.appendChild(div);
}

function useCursorData() {
    const gFrameBufferCapacity = 100;
    let gFrameBuffer;
    let gLastLoadedFrameTime = 0;
    let gLastFrameTimePerCursorDict = null;
    let gLastFrameTime = null;
    const gNodeMap = new Map();
    const { getFrames, getLastFrameTimePerCursor } = useStorage();
    const getResourceId = useResourceId();

    function reset() {
        gFrameBuffer = new CircularBuffer(gFrameBufferCapacity);
        gLastLoadedFrameTime = 0;
        gNodeMap.clear();
    }
    reset();

    function getLastFrameTime() {
        return gLastFrameTime;
    }

    function lookupNode(xPath) {
        const result = document.evaluate(
            xPath,
            document.body,
            null,
            XPathResult.ANY_UNORDERED_NODE_TYPE,
            null
        );
        const node = result.singleNodeValue;
        if (!node) {
            console.log("node not found!!");
        } else {
            gNodeMap.set(xPath);
        }
        return node;
    }

    function processFrame(frame, frameTime) {
        // update nodemap
        return {
            frameTime,
            lastFrame: frameTime >= gLastFrameTime,
            entries: frame.map((entry) => {
                const { xPath } = entry;
                let node;
                if (!gNodeMap.has(xPath)) {
                    node = lookupNode(xPath);
                    gNodeMap.set(xPath, node);
                } else {
                    node = gNodeMap.get(xPath);
                }

                return {
                    ...entry,
                    lastEntry:
                        frameTime >= gLastFrameTimePerCursorDict[entry.userId],
                    node,
                };
            }),
        };
    }

    async function fillBuffer() {
        const { resourceId, changed: resourceIdChanged } = getResourceId();
        if (resourceIdChanged) {
            reset();
        }

        const emptyBufferSize = gFrameBufferCapacity - gFrameBuffer.size();
        const loadFromFrameTime = gLastLoadedFrameTime;
        const loadToFrameTime = gLastLoadedFrameTime + emptyBufferSize;

        if (loadToFrameTime <= gLastFrameTime) {
            //rerun after 5 seconds
            window.setTimeout(fillBuffer, 5000);
        } else {
            console.log("Framebuffer loaded all Frames");
        }

        if (emptyBufferSize > gFrameBufferCapacity * 0.25) {
            // only refill when 25 percent empty
            // buffer needs refill
            // network request
            gLastLoadedFrameTime += gFrameBuffer.size();
            const result = await getFrames(
                resourceId,
                loadFromFrameTime,
                loadToFrameTime
            );
            result.forEach(({ t: frameTime, frame }) =>
                gFrameBuffer.enq(processFrame(frame, frameTime))
            );
            console.log(
                `buffer is ${
                    (gFrameBuffer.size() / gFrameBufferCapacity) * 100
                }% full.`
            );
        }
    }

    async function start() {
        const { resourceId } = getResourceId();
        const { lastFrameTime, lastFrameTimePerCursorDict } =
            await getLastFrameTimePerCursor(resourceId);
        // update globals
        console.log(lastFrameTime, lastFrameTimePerCursorDict);
        gLastFrameTime = lastFrameTime;
        gLastFrameTimePerCursorDict = lastFrameTimePerCursorDict;
        fillBuffer();
    }

    start();

    return {
        frameBuffer: gFrameBuffer,
        nodeMap: gNodeMap,
        getLastFrameTime,
        reset,
    };
}

function injectCanvas() {
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

    function adjustCanvasSize() {
        canvas.height = getDocumentHeight();
        canvas.width = document.body.offsetWidth;
        canvas.style.visibility = "visible";
    }
    const adjustCanvasSizeDefered = useDeferedCallback(adjustCanvasSize, 500);

    function adjustCanvasOnResize() {
        canvas.style.visibility = "hidden";
        adjustCanvasSizeDefered();
    }
    window.addEventListener("resize", adjustCanvasOnResize);
    adjustCanvasSize();
    return canvas;
}

function getAbsolutePosition(node, relX, relY) {
    if (!node) {
        return undefined;
    }
    const { left, top, width, height } = getDimensions(node, false);
    const absX = left + width * relX;
    const absY = top + height * relY;
    return {
        x: absX,
        y: absY,
    };
}

function getOrCreateCursorFromUserId(cursorMap, userId) {
    let cursor = cursorMap.get(userId);
    if (!cursor) {
        cursor = new Cursor(0, 0);
        cursorMap.set(userId, cursor);
    }
    return cursor;
}

function updateCursorPositions(frame, cursorMap, updateFromOnly = false) {
    frame.forEach((entry) => {
        fastdom.measure(() => {
            const { userId, relX, relY, node, lastEntry } = entry;
            if (!node) return;
            if (lastEntry) {
                console.log("remove cursor", userId);
                cursorMap.delete(userId);
                return;
            }
            const { x, y } = getAbsolutePosition(node, relX, relY);
            const cursor = getOrCreateCursorFromUserId(cursorMap, userId);

            if (updateFromOnly) {
                cursor.updatePositions(x, y);
            } else {
                cursor.moveTo(x, y, 120);
            }
        });
    });
}

function createCursorCanvas() {
    return new Promise((resolve) => {
        const offscreenCanvas = document.createElement("canvas");
        const img = new Image();
        console.log("cursorImage", cursorImage);
        img.src = cursorImage; // can also be a remote URL e.g. http://
        img.onload = function () {
            offscreenCanvas.width = img.width;
            offscreenCanvas.height = img.height;
            console.log("Cursor canvas created with dimensions:", img.width, img.height)
            offscreenCanvas.getContext("2d").drawImage(img, 0, 0);

            resolve(offscreenCanvas);
        };
    });
}

async function move(canvas) {
    const { frameBuffer, getLastFrameTime } = useCursorData();
    const cx = canvas.getContext("2d");
    const cursorMap = new Map();
    const cursorCanvas = await createCursorCanvas();


    const { start: startAnimation, stop: stopAnimation } = useAnimationLoop(
        animate,
        60
    );
    let gCurrentEntries;
    let gIsLastFrame;

    const { start: startFrameProcessing, stop: stopFrameProcessing } =
        useAnimationLoop(() => {
            if (frameBuffer.size() === 0) return;
            const { lastFrame, entries, frameTime } = frameBuffer.deq();
            gCurrentEntries = entries;
            gIsLastFrame = lastFrame;
            console.log("process frame", frameTime);
            updateCursorPositions(gCurrentEntries, cursorMap);
            if (gIsLastFrame) {
                gCurrentEntries = null;
                console.log("end");
                stopFrameProcessing();
                stopAnimation();
            }
        }, 0.5);

    const updateCursorPositionsOnResize = useDeferedCallback(() => {
        if (!gCurrentEntries) return;
        console.log("update", gCurrentEntries, canvas.width, canvas.height);

        updateCursorPositions(gCurrentEntries, cursorMap, true);
        console.log("resize");
    }, 600);
    window.addEventListener("resize", updateCursorPositionsOnResize);

    function clearCanvas() {
        cx.clearRect(0, 0, canvas.width, canvas.height);
    }

    startAnimation();
    startFrameProcessing();
    // clear canvas once
    clearCanvas();

    function animate(delta) {
        cursorMap.forEach((cursor) => {
            cursor.update(delta);
            cursor.renderClearCanvas(cx, cursorCanvas);
        });
        cursorMap.forEach((cursor) => {
            cursor.renderDrawCanvas(cx, cursorCanvas);
        });
    }
}

(function () {
    if (window.injected) {
        console.log("already injected");
        return;
    }
    window.injected = true;
    injectHtml();
    const canvas = injectCanvas();
    move(canvas);
    // trackCursor();
})();
