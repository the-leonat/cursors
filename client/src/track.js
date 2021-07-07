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

export default function trackCursor() {
    const { getRelativeMousePosition } = useRelativeMousePosition();
    const { getTimePassed, resetTimePassed } = useTimePassed();
    const { getUserId, reset: resetUserId } = useUserId();
    const getResourceId = useResourceId();
    const { persist } = useStorage();
    async function tick() {
        const { resourceId, changed: resourceIdChanged } = getResourceId();
        const { xPath, relX, relY } = await getRelativeMousePosition();
        if (resourceIdChanged) {
            resetTimePassed();
            resetUserId();
        }
        const timePassed = Math.floor(getTimePassed() / 2000);
        const userId = getUserId();
        persist(userId, resourceId, xPath, relX, relY, timePassed);
        console.log(xPath, relX, relY, timePassed, resourceId, userId);
    }
    const { destroy: destroyClock } = useClock(tick, 2000);
}
