import getElementDimensions from "./getElementDimensions";
import useStorage from "./useStorage";
import useDeferedCallback from "./useDeferedCallback";

// shim
window.requestIdleCallback =
    window.requestIdleCallback ||
    function (cb) {
        return setTimeout(function () {
            var start = Date.now();
            cb({
                didTimeout: false,
                timeRemaining: function () {
                    return Math.max(0, 50 - (Date.now() - start));
                },
            });
        }, 1);
    };

window.cancelIdleCallback =
    window.cancelIdleCallback ||
    function (id) {
        clearTimeout(id);
    };

export async function useProcessFrameData(_resourceId, _onFrameProcessing) {
    const nodeCache = new Map();
    const dimensionsCache = new Map();

    const { getFrames, getLastFrameTimePerCursor } = useStorage();
    const { lastFrameTime, lastFrameTimePerCursorDict } =
        await getLastFrameTimePerCursor(_resourceId);

    // console.log("lastFrameTime", lastFrameTime);

    const clearDimensionsCache = useDeferedCallback(() => {
        dimensionsCache.clear();
    }, 500);

    function getLastFrameNumber() {
        return lastFrameTime ? lastFrameTime : -1;
    }

    window.addEventListener("resize", clearDimensionsCache);
    function getAbsolutePosition(node, relX, relY) {
        if (!node) {
            return undefined;
        }

        function getAndPersist() {
            const frames = getElementDimensions(node, false);
            dimensionsCache.set(node, frames);
            return frames;
        }

        const { left, top, width, height } = dimensionsCache.has(node)
            ? dimensionsCache.get(node)
            : getAndPersist();
        const absX = left + width * relX;
        const absY = top + height * relY;
        const dimensions = {
            x: absX,
            y: absY,
        };
        return dimensions;
    }

    function lookupNode(xPath) {
        if (nodeCache.has(xPath)) {
            return nodeCache.get(xPath);
        }

        const frames = document.evaluate(
            xPath,
            document.body,
            null,
            XPathResult.ANY_UNORDERED_NODE_TYPE,
            null
        );
        const node = frames.singleNodeValue;
        if (!node) {
            // console.log("node not found:", xPath);
            return undefined;
        }
        nodeCache.set(xPath, node);
        return node;
    }

    function processFrameAsync(entries, frameTime) {
        let entriesOfCurrentFrame;

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
                    number: 0,
                    last: true,
                    entries: [],
                },
            ];
        const frames = await getFrames(
            _resourceId,
            _fromFrameNumber,
            _toFrameNumber
        );
        // ToDo: maybe use map statement
        // _onFrameProcessing(true, index, length);
        _onFrameProcessing(true, 0, frames.length);
        let countProcessed = 0;
        const processedFrames = await Promise.all(
            frames.map(async ({ t: frameTime, frame: entries }, _index) => {
                if (!entries) return null;

                const from = window.performance.now();
                const processedFrame = await processFrameAsync(
                    entries,
                    frameTime
                );
                countProcessed++;
                _onFrameProcessing(true, countProcessed, frames.length);
                const d = window.performance.now() - from;
                // console.log(`processed frame ${frameTime} in ${d}ms`);
                return processedFrame;
            })
        );
        _onFrameProcessing(false);
        return processedFrames;
    }

    return {
        getFrames: get,
        getLastFrameNumber,
    };
}
