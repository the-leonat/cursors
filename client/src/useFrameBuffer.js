useFrameBuffer


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
                    frameTime,
                    lastFrame: false,
                    entries: entriesOfCurrentFrame,
                });
            }
        }

        return new Promise((resolve) => {
            entriesOfCurrentFrame = [];
            scheduleProcessEntry(resolve);
        });
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
            for (const { t: frameTime, frame: entries } of result) {
                if (entries && entries.length > 0) {
                    const from = window.performance.now();
                    gFrameBuffer.enq(
                        await processFrameAsync(entries, frameTime)
                    );
                    const d = window.performance.now() - from;
                    console.log(`processed frame ${frameTime} in ${d}ms`);
                }
            }

            console.log(performance.getEntriesByType("measure"));
            // Finally, clean up the entries.
            performance.clearMarks();
            performance.clearMeasures();

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