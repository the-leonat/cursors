import trackCursor, { useResourceId } from "./track";
import CircularBuffer from "circular-buffer";
import useStorage from "./storage";

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
            result.forEach(({t, frame}) => frameBuffer.enq(processFrame(frame)));

            console.log(frameBuffer);
        } else {
        }
    }

    const intervalId = window.setInterval(fillBuffer, 5000);

    return {
        frameBuffer,
        nodeMap,
        reset,
    };
}

function move() {
    // if (subtime > time_step) {
    //     from = buffer.dequeue
    //     to = buffer.lastItem
    //     subtime = subtime - timestep
    // }

    // lerpp = subtime / time_step

    // from to , lerp subtime

    // time += delta
    // subtime += delta

    const { buffer } = useCursorData();

    const getResourceId = useResourceId();
    let lastLoadTime = 0;

    const { resourceId, changed: resourceIdChanged } = getResourceId();
}

(function () {
    if (window.injected) {
        console.log("already injected");
        return;
    }
    window.injected = true;
    injectHtml();
    move();
    // trackCursor();
})();
