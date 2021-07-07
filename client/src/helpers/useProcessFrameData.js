import getElementDimensions from "./getElementDimensions";
import useStorage from "./useStorage";
import useDeferedCallback from "./useDeferedCallback";

export async function useProcessFrameData(_resourceId, _onFrameProcessing) {
    const nodeCache = new Map();
    const dimensionsCache = new Map();

    const { getFrames, getLastFrameTimePerCursor } = useStorage();
    const { lastFrameTime, lastFrameTimePerCursorDict } =
        await getLastFrameTimePerCursor(_resourceId);

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
        if (dimensionsCache.has(node)) {
            return dimensionsCache.get(node);
        }
        const { left, top, width, height } = getElementDimensions(node, false);
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
        const arr = [];
        const result = await getFrames(
            _resourceId,
            _fromFrameNumber,
            _toFrameNumber
        );
        // ToDo: maybe use map statement
        let index = 0;
        let length = result.length;
        _onFrameProcessing(true, index, length);

        for (const { t: frameTime, frame: entries } of result) {
            if (entries && entries.length > 0) {
                const from = window.performance.now();
                arr.push(await processFrameAsync(entries, frameTime));
                const d = window.performance.now() - from;
                console.log(`processed frame ${frameTime} in ${d}ms`);
            }
            _onFrameProcessing(true, index, length);
            index++;
        }
        _onFrameProcessing(false);
        return arr;
    }

    return {
        getFrames: get,
        getLastFrameNumber
    };
}
