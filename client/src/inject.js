import trackCursor, { useResourceId, getDimensions } from "./track";
import CircularBuffer from "circular-buffer";
import useStorage from "./storage";
import fastdom from "fastdom";
import { useAnimationLoop } from "./view";
import Cursor from "./Cursor";
import useDeferedCallback, { getDocumentHeight } from "./util";

// todo convert to typescript
// todo dont update position when cursor is only slightly different in position
// move to offscreen canvas
// bug cursor not included in the current frame cant update their position

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
    const CAPACITY = 100;
    let frameBuffer;
    let lastLoadTime = 0;
    const { get: getCursorData } = useStorage();
    const getResourceId = useResourceId();
    const nodeMap = new Map();

    function reset() {
        frameBuffer = new CircularBuffer(CAPACITY);
        lastLoadTime = 0;
        nodeMap.clear();
    }
    reset();

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
            nodeMap.set(xPath);
        }
        return node;
    }

    function processFrame(frame) {
        // update nodemap
        return frame.map((entry) => {
            const { xPath } = entry;
            let node;
            if (!nodeMap.has(xPath)) {
                node = lookupNode(xPath);
                nodeMap.set(xPath, node);
            } else {
                node = nodeMap.get(xPath);
            }

            return {
                ...entry,
                node,
            };
        });
    }

    async function fillBuffer() {
        const { resourceId, changed: resourceIdChanged } = getResourceId();
        if (resourceIdChanged) {
            reset();
        }

        const bufferSize = frameBuffer.size();
        const diff = CAPACITY - bufferSize;
        console.log(`buffer is ${(bufferSize / CAPACITY) * 100}% full.`);

        if (diff > CAPACITY * 0.25) {
            // only refill when 25 percent empty
            // buffer needs refill
            // network request
            lastLoadTime += bufferSize;
            const result = await getCursorData(
                resourceId,
                lastLoadTime,
                lastLoadTime + diff
            );
            result.forEach(({ t, frame }) =>
                frameBuffer.enq(processFrame(frame))
            );
        }
    }

    const intervalId = window.setInterval(fillBuffer, 5000);

    return {
        frameBuffer,
        nodeMap,
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
            const { userId, relX, relY, node } = entry;
            if (!node) return;
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

function move(canvas) {
    const { frameBuffer } = useCursorData();
    const cx = canvas.getContext("2d");
    const cursorMap = new Map();

    const { start, stop } = useAnimationLoop(animate, 60);
    let currentFrame;

    const { start: startFrame, stop: stopFrame } = useAnimationLoop(() => {
        if (frameBuffer.size() === 0) return;
        // currentFrame = frameBuffer.get(frameBuffer.size() - 2);
        currentFrame = frameBuffer.deq();
        updateCursorPositions(currentFrame, cursorMap);
        console.log("cf", currentFrame, canvas.width, canvas.height);
    }, 0.5);

    const updateCursorPositionsOnResize = useDeferedCallback(() => {
        if (!currentFrame) return;
        console.log("update", currentFrame, canvas.width, canvas.height);

        updateCursorPositions(currentFrame, cursorMap, true);
        console.log("resize");
    }, 600);
    window.addEventListener("resize", updateCursorPositionsOnResize);

    function clearCanvas() {
        cx.clearRect(0, 0, canvas.width, canvas.height);
    }

    start();
    startFrame();
    clearCanvas();

    function animate(delta) {
        cursorMap.forEach((cursor) => {
            cursor.update(delta);
            cursor.renderClearCanvas(cx);
        });
        cursorMap.forEach((cursor) => {
            cursor.renderDrawCanvas(cx);
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
