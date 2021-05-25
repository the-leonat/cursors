// this is the code which will be injected into a given page...
import xPath from "./lib/DOMPath";
import { v4 as uuidv4 } from "uuid";
import sha256 from "crypto-js/sha256";
import usePersist from "./persist";

function getDimensions(el) {
    var rect = el.getBoundingClientRect(),
        scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
    };
}

function useRelativeMousePosition() {
    let currentElement = {};
    let currentMousePosition = {};

    function handleMouseOver(event) {
        const { target: element, pageX: mouseX, pageY: mouseY } = event;
        const { top: posY, left: posX, width, height } = getDimensions(element);
        currentElement = {
            xPath: xPath(element),
            width,
            height,
            posX,
            posY,
        };
        currentMousePosition = {
            x: mouseX,
            y: mouseY,
        };
    }

    function getRelativeMousePosition() {
        const { posX, posY, width, height, xPath } = currentElement;
        const { x: mouseX, y: mouseY } = currentMousePosition;
        const relX = (mouseX - posX) / width;
        const relY = (mouseY - posY) / height;
        return { xPath, relX, relY };
    }

    function destroy() {
        document.removeEventListener("mousemove", handleMouseOver);
    }
    document.addEventListener("mousemove", handleMouseOver);
    // document.addEventListener("mousemove", handleMouseOver);

    return {
        getRelativeMousePosition,
        destroy,
    };
}

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

function useResourceId() {
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

function trackCursor() {
    const { getRelativeMousePosition } = useRelativeMousePosition();
    const { getTimePassed, resetTimePassed } = useTimePassed();
    const { getUserId, reset: resetUserId } = useUserId();
    const getResourceId = useResourceId();
    const persist = usePersist();
    function tick() {
        const { resourceId, changed: resourceIdChanged } = getResourceId();
        const { xPath, relX, relY } = getRelativeMousePosition();
        if (resourceIdChanged) {
            resetTimePassed();
            resetUserId();
        }
        const timePassed = getTimePassed();
        const userId = getUserId();
        persist(userId, resourceId, xPath, relX, relY, timePassed);
        console.log(xPath, relX, relY, timePassed, resourceId, userId);
    }
    const { destroy: destroyClock } = useClock(tick, 2000);
}

export default trackCursor;