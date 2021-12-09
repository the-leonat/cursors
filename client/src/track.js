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
    const intervalId = window.setInterval(tick, interval);
    function destroy() {
        window.clearInterval(intervalId);
    }

    return {
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

    return { persist, flush };
}

export default function trackCursor(onCursorTrack) {
    const { getRelativeMousePosition } = useRelativeMousePosition();
    const { getUserId, reset: resetUserId } = useUserId();
    const getResourceId = useResourceId();
    const { persist, flush } = useBufferedPersist(10);
    let frameNumber = 0;
    async function tick() {
        const { resourceId, changed: resourceIdChanged } = getResourceId();
        const { xPath, relX, relY } = await getRelativeMousePosition();
        if (resourceIdChanged) {
            resetUserId();
            flush();
            frameNumber = 0;
        }
        const userId = getUserId();
        persist({ user_id: userId, resource_id: resourceId, xpath: xPath, x: relX, y: relY, time: frameNumber });
        onCursorTrack(frameNumber);
        frameNumber += 1;
        console.log("tracked", frameNumber);
    }
    const { destroy: destroyClock } = useClock(tick, 1000 / 8);
}
