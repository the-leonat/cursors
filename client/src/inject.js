import { useResourceId, getDimensions } from "./track";
import useStorage from "./storage";
import fastdom from "fastdom";
import useDeferedCallback, { getDocumentHeight } from "./util";
import createWorker from "./lib/createWorker";

// todo convert to typescript
// todo dont update position when cursor is only slightly different in position
// move rendering to canvas to web worker (offscreen canvas)
// bug cursor not included in the current frame cant update their position
// useCursorData reset does not reset timer
// send tracking info only if position changes
// but also if not changing send every 10 seconds
// hover over svg problem (prune xpaths)
// track cursor does unnessecary dom measuring
// use requestIdleCallback
// https://github.com/pladaria/requestidlecallback-polyfill#readme
//   while time remaining process another frame
//   dont use fastdom measure (no sense since it uses rafs)
//   if time is up, call another ric and continue
// --> https://github.com/aFarkas/requestIdleCallback
// cancel rICs on resize
// buffer size == frames per second (usually 1) times buffer time (10)
// soft navigation between pages reset data structures

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

async function useCursorData(_resourceId) {
    const gNodeMap = new Map();
    const { getFrames, getLastFrameTimePerCursor } = useStorage();
    const { lastFrameTime, lastFrameTimePerCursorDict } =
        await getLastFrameTimePerCursor(_resourceId);

    function lookupNode(xPath) {
        if (gNodeMap.has(xPath)) {
            return gNodeMap.get(xPath);
        }

        const result = document.evaluate(
            xPath,
            document.body,
            null,
            XPathResult.ANY_UNORDERED_NODE_TYPE,
            null
        );
        const node = result.singleNodeValue;
        if (!node) {
            console.log("node not found:", xPath);
            return undefined;
        }
        gNodeMap.set(xPath, node);
        return node;
    }

    function processFrameAsync(entries, frameTime) {
        let entriesOfCurrentFrame = [];

        function scheduleProcessEntry(resolve) {
            window.requestIdleCallback((deadline) =>
                processEntry(deadline, resolve)
            );
        }

        function processEntry(deadline, resolve) {
            while (deadline.timeRemaining() > 0 && entries.length > 0) {
                const entry = entries.pop();
                const { xPath, relX, relY, userId } = entry;
                const node = lookupNode(xPath);
                if (node) {
                    const { x, y } = getAbsolutePosition(node, relX, relY);
                    entriesOfCurrentFrame.push({
                        node,
                        userId,
                        relX,
                        relY,
                        x,
                        y,
                        lastEntry: false,
                    });
                }
            }

            if (entries.length > 0) {
                scheduleProcessEntry(resolve);
            } else {
                resolve({
                    number: frameTime,
                    last: false,
                    entries: entriesOfCurrentFrame,
                });
            }
        }

        return new Promise((resolve) => {
            entriesOfCurrentFrame = [];
            scheduleProcessEntry(resolve);
        });
    }

    async function get(_fromFrameNumber, _toFrameNumber) {
        if (_fromFrameNumber > _toFrameNumber) throw "Erorr";
        if (_toFrameNumber > lastFrameTime) return [];
        const arr = [];
        const result = await getFrames(
            _resourceId,
            _fromFrameNumber,
            Math.min(_toFrameNumber, lastFrameTime)
        );
        // ToDo: maybe use map statement
        for (const { t: frameTime, frame: entries } of result) {
            if (entries && entries.length > 0) {
                const from = window.performance.now();
                arr.push(await processFrameAsync(entries, frameTime));
                const d = window.performance.now() - from;
                console.log(`processed frame ${frameTime} in ${d}ms`);
            }
        }
        return arr;
    }

    return {
        getFrames: get,
    };
}

async function injectCanvas() {
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
        return new Promise((resolve) => {
            fastdom.measure(() => {
                canvas.height = getDocumentHeight();
                canvas.width = document.body.offsetWidth;
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
    await adjustCanvasSize();
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

(async function () {
    if (window.injected) {
        console.log("already injected");
        return;
    }
    window.injected = true;
    injectHtml();
    console.log("inject");
    const canvas = await injectCanvas();
    // move(canvas);
    // trackCursor();
    const getResourceId = useResourceId();
    const {resourceId, changed} = getResourceId();
    const { getFrames } = await useCursorData(resourceId);

    const worker = createWorker(canvas, (e) => {
        console.log(e);
        // if event == get me frames from to
        getFrames(0, 100);

        // event resized

        // event resource changed
    });
})();
