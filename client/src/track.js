// this is the code which will be injected into a given page...
import { v4 as uuidv4 } from "uuid";
import sha256 from "crypto-js/sha256";
import useStorage from "./helpers/useStorage";
import useRelativeMousePosition from "./helpers/useRelativeMousePosition";

function useTimePassed() {
    let startTime;
    function resetTimePassed() {
        startTime = new Date().getTime();
    }

    function getTimePassed() {
        const currentTime = new Date().getTime();
        return currentTime - startTime;
    }
    resetTimePassed();
    return {
        getTimePassed,
        resetTimePassed,
    };
}

function useClock(tick, interval) {
    let intervalId;
    function start() {
        if (intervalId) {
            window.clearInterval(intervalId);
        }
        intervalId = window.setInterval(tick, interval);
    }
    function destroy() {
        window.clearInterval(intervalId);
        intervalId = undefined;
    }

    return {
        start,
        destroy,
    };
}

export function useResourceId() {
    // TODO: add nonce
    function hash() {
        return sha256(window.location.href || "").toString();
    }
    let resourceId = hash();
    let changed = false;
    function getResourceId() {
        const newResourceId = hash();
        if (resourceId !== newResourceId) {
            resourceId = newResourceId;
            changed = true;
        } else {
            changed = false;
        }

        return {
            resourceId,
            changed,
        };
    }

    return getResourceId;
}

function useUserId() {
    let userId;

    function reset() {
        userId = uuidv4();
    }

    function getUserId() {
        return userId;
    }

    //pw:G3ginL3Ehd3yBT

    reset();

    return {
        getUserId,
        reset,
    };
}

function useBufferedPersist(_bufferSize) {
    let buffer = [];
    const { persistMultiple } = useStorage();

    function persistImmediate() {
        persistMultiple([...buffer]);
        buffer = [];
    }

    function persist(data) {
        if (buffer.length > _bufferSize) {
            persistImmediate();
        }
        buffer.push(data);
    }

    function flush() {
        persistImmediate();
    }

    window.onbeforeunload = function() {
        console.log("persist before leave")
        persistImmediate();
        return;
    };

    return { persist, flush };
}

export default function trackCursor(onCursorTrack) {
    const { getRelativeMousePosition } = useRelativeMousePosition();
    const { getUserId, reset: resetUserId } = useUserId();
    const getResourceId = useResourceId();
    const { persist, flush } = useBufferedPersist(4 * 4);
    let frameNumber = 0;
    let persistedFrameNumber = 0;
    let lastMousePositionX = 0;
    let lastMousePositionY = 0;

    function shouldPersist(absX, absY) {
        const treshold = 5;
        if (Math.abs(lastMousePositionX - absX) > treshold) return true;
        if (Math.abs(lastMousePositionY - absY) > treshold) return true;
        return false;
    }

    async function tick() {
        const { resourceId, changed: resourceIdChanged } = getResourceId();
        const { xPath, relX, relY, absX, absY } =
            await getRelativeMousePosition();
        const persistPosition = shouldPersist(absX, absY);

        if (resourceIdChanged) {
            resetUserId();
            flush();
            frameNumber = 0;
            persistedFrameNumber = 0;
        } else if (persistPosition) {
            const userId = getUserId();
            persistedFrameNumber += 1;
            lastMousePositionX = absX;
            lastMousePositionY = absY;
            persist({
                user_id: userId,
                resource_id: resourceId,
                xpath: xPath,
                x: relX,
                y: relY,
                time: frameNumber,
            });
        }
        frameNumber += 1;
        onCursorTrack(frameNumber, persistedFrameNumber);        // console.log("tracked", frameNumber);
    }
    const { start: startClock, destroy: stopClock } = useClock(tick, 1000 / 4);
    function start() {
        startClock();
    }
    function stop() {
        stopClock();
    }

    return { start, stop };
}
