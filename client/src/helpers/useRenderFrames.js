import useAnimationLoop from "./useAnimationLoop";
import createCursorCanvas from "./createCursorCanvas";
import cursorImageUrlData from "data-url:../../assets/cursor.png";
import Cursor from "../model/Cursor";


export const ANIMATION_FPS = 60;
export const FRAMES_FPS = 1;

function getOrCreateCursorFromUserId(cursorMap, userId) {
    let cursor = cursorMap.get(userId);
    if (!cursor) {
        cursor = new Cursor(0, 0);
        cursorMap.set(userId, cursor);
    }
    return cursor;
}

function updateCursorPositions(
    frame,
    cursorMap,
    updateAfterResize = false
) {
    frame.forEach((entry) => {
        const { userId, x, y, last } = entry;
        const cursor = getOrCreateCursorFromUserId(cursorMap, userId);

        if (last) {
            cursor.deleteNextFrame();
        }
        if (updateAfterResize) {
            cursor.updatePositions(x, y);
        } else {
            cursor.moveTo(x, y, 1000 / FRAMES_FPS);
        }
    });
}

export function useRenderFrames(getNextFrame, initializedCallback) {
    const cursorMap = new Map();
    // state
    let cursorCanvas;
    let currentFrameNumber = 0;
    let canvas;
    let stopNextFrame = false;

    createCursorCanvas(cursorImageUrlData).then((_canvas) => {
        initializedCallback();
        cursorCanvas = _canvas;
    });

    const { start: startAnimation, stop: stopAnimation } = useAnimationLoop(
        (delta, cx) => {
            // we need to await until this is resolved
            if (!cursorCanvas)
                return;
            cursorMap.forEach((cursor, cursorId) => {
                const shouldDelete = cursor.update(delta);
                cursor.renderClearCanvas(cx, cursorCanvas);
                if (shouldDelete) {
                    cursorMap.delete(cursorId);
                    console.log("delete cursor", cursorId);
                }
            });
            cursorMap.forEach((cursor) => {
                cursor.renderDrawCanvas(cx, cursorCanvas);
            });
        },
        ANIMATION_FPS
    );

    const { start: startFrameProcessing, stop: stopFrameProcessing } = useAnimationLoop(() => {
        if (stopNextFrame) {
            console.log("end");
            stopFrameProcessing();
            stopAnimation();
            return;
        }
        const nextFrame = getNextFrame(currentFrameNumber);
        if (!nextFrame)
            return;
        const { last, entries, number } = nextFrame;
        currentFrameNumber = number;
        console.log("render frame", number, nextFrame);
        updateCursorPositions(entries, cursorMap);
        if (last) {
            stopNextFrame = true;
        }
    }, FRAMES_FPS);

    function getCurrentFrameNumber() {
        return currentFrameNumber;
    }

    function clearCanvas() {
        const cx = canvas.getContext("2d");
        cx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function resizeCanvas(_width, _height) {
        canvas.width = _width;
        canvas.height = _height;
    }

    function setCanvas(_canvas) {
        canvas = _canvas;
    }

    function start() {
        if (!canvas) {
            throw "canvas is not set!";
        }
        stopNextFrame = false;
        const cx = canvas.getContext("2d");
        startAnimation(cx);
        startFrameProcessing();
        // clear canvas once
        clearCanvas();
    }

    function stop() {
        stopAnimation();
        stopFrameProcessing();
        // clear canvas once
        // clearCanvas();
    }

    return {
        start,
        stop,
        setCanvas,
        resizeCanvas,
        getCurrentFrameNumber,
    };
}
