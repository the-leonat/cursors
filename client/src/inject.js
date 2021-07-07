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

function useUI(handleStop, handleStart) {
    var div = document.createElement("div");
    div.style.position = "fixed";
    div.style.top = 0;
    div.style.right = 0;
    div.style.zIndex = 9999;
    div.style.background = "red";
    div.textContent = "Injected!";
    var button = document.createElement("button");
    button.value = 0;
    button.textContent = "Start";
    button.onclick = () => {
        const value = parseInt(button.value);
        if (value === 0) {
            handleStart();
        } else if (value === 1) {
            handleStop();
        }
        button.value = (value + 1) % 2;
        button.textContent = value === 0 ? "Start" : "Stop";
    };
    div.appendChild(button);
    document.body.appendChild(div);
}

async function useCursorData(_resourceId) {
    const nodeCache = new Map();
    const dimensionsCache = new Map();

    const { getFrames, getLastFrameTimePerCursor } = useStorage();
    const { lastFrameTime, lastFrameTimePerCursorDict } =
        await getLastFrameTimePerCursor(_resourceId);

    const clearDimensionsCache = useDeferedCallback(() => {
        console.log("cleared dim cache")
        dimensionsCache.clear();
    }, 500);

    window.addEventListener("resize", clearDimensionsCache);


    function getAbsolutePosition(node, relX, relY) {
        if (!node) {
            return undefined;
        }
        if (dimensionsCache.has(node)) {
            return dimensionsCache.get(node)
        }
        const { left, top, width, height } = getDimensions(node, false);
        const absX = left + width * relX;
        const absY = top + height * relY;
        const dimensions = {
            x: absX,
            y: absY,
        };
        dimensionsCache.set(node, dimensions);
        return dimensions;
    }

    function lookupNode(xPath) {
        if (nodeCache.has(xPath)) {
            return nodeCache.get(xPath);
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
        nodeCache.set(xPath, node);
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
                        // node,
                        userId,
                        // relX,
                        // relY,
                        x,
                        y,
                        last: lastFrameTimePerCursorDict[userId] === frameTime,
                    });
                }
            }

            if (entries.length > 0) {
                scheduleProcessEntry(resolve);
            } else {
                resolve({
                    number: frameTime,
                    last: frameTime === lastFrameTime,
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
        if (_fromFrameNumber > lastFrameTime)
            return [
                {
                    number: _fromFrameNumber,
                    last: true,
                    entries: [],
                },
            ];
        const arr = [];
        const result = await getFrames(
            _resourceId,
            _fromFrameNumber,
            _toFrameNumber
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

async function useHTMLCanvas(handleCanvasResize) {
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
    window.addEventListener("resize", adjustCanvasOnResize);
    await adjustCanvasSize(true);
    return canvas;
}

(async function () {
    if (window.injected) {
        console.log("already injected");
        return;
    }
    window.injected = true;
    useUI(handleStart, handleStop);
    console.log("inject");
    // move(canvas);
    // trackCursor();
    const getResourceId = useResourceId();
    const { resourceId, changed } = getResourceId();
    const { getFrames } = await useCursorData(resourceId);
    const canvas = await useHTMLCanvas(handleCanvasResize);
    const worker = createWorker(canvas, handleWorkerEvent);

    function handleCanvasResize(_newWidth, _newHeight) {
        worker.post({
            type: "resize",
            width: _newWidth,
            height: _newHeight,
        });
    }

    function handleStop() {
        worker.post({
            type: "stop",
        });
    }

    function handleStart() {
        worker.post({
            type: "start",
        });
    }

    async function handleFramesRequest(_eventData) {
        const { from, to } = _eventData;
        // console.log("event data", _eventData)
        const frames = await getFrames(from, to);
        // console.log(frames);
        worker.post({
            type: "frames",
            from,
            to,
            frames,
        });
    }

    function handleWorkerEvent(_event) {
        // console.log("mainthread event", _event)
        if (_event.data.type === "initialized") {
            // handleInitialized();
        } else if (_event.data.type === "frames") {
            handleFramesRequest(_event.data);
        }
    }
})();
