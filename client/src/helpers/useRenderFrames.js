import useAnimationLoop from "./useAnimationLoop";
import createCursorCanvas from "./createCursorCanvas";
import cursorImageUrlData from "data-url:../../assets/cursor-small.png";
import cursorImage2XUrlData from "data-url:../../assets/cursor-small_2x.png";

import Cursor from "../model/Cursor";
import { ANIMATION_FPS, TRACKING_FPS } from "../config";

function getOrCreateCursorFromUserId(cursorMap, userId) {
    let cursor = cursorMap.get(userId);
    if (!cursor) {
        cursor = new Cursor(0, 0);
        cursorMap.set(userId, cursor);
    }
    return cursor;
}

function updateCursorPositions(frame, cursorMap, updateAfterResize = false) {
    frame.forEach((entry) => {
        const { userId, x, y, last } = entry;
        const cursor = getOrCreateCursorFromUserId(cursorMap, userId);

        if (last) {
            // console.log("deletenext frame")
            cursor.deleteNextFrame();
        }
        cursor.moveTo(x, y, 1000 / TRACKING_FPS, updateAfterResize);
    });
}

export function useRenderFrames(getNextFrame, onInitialized) {
    const cursorMap = new Map();
    // state
    let cursorCanvas;
    let currentFrameNumber = 0;
    let devicePixelRatio = 1;
    let canvas;
    let stopNextFrame = false;
    let fps = 0;
    let scrollX = 0;
    let scrollY = 0;

    const { start: startAnimation, stop: stopAnimation } = useAnimationLoop(
        (delta, cx) => {
            // we need to await until this is resolved
            if (!cursorCanvas) return;
            cursorMap.forEach((cursor, cursorId) => {
                cursor.renderClearCanvas(cx, cursorCanvas, devicePixelRatio);
                const shouldDelete = cursor.update(delta, scrollX, scrollY);
                if (shouldDelete) {
                    cursorMap.delete(cursorId);
                }
            });
            // update fps value
            fps = 1000 / delta;
            cursorMap.forEach((cursor) => {
                cursor.renderDrawCanvas(cx, cursorCanvas, devicePixelRatio);
            });
        },
        ANIMATION_FPS
    );

    const { start: startFrameProcessing, stop: stopFrameProcessing } =
        useAnimationLoop(() => {
            if (stopNextFrame) {
                // console.log("end");
                stopFrameProcessing();
                stopAnimation();
                return;
            }
            const nextFrame = getNextFrame();
            if (!nextFrame) return;
            const { last, entries, number } = nextFrame;
            currentFrameNumber = number;
            // console.log("render frame", number, nextFrame);
            updateCursorPositions(entries, cursorMap);
            if (last) {
                stopNextFrame = true;
                console.log("last frame rendered");
            }
        }, TRACKING_FPS);

    function getCurrentFrameNumber() {
        return currentFrameNumber;
    }

    function getCurrentCursorCount() {
        return cursorMap.size;
    }

    function getFPS() {
        return fps;
    }

    function clearCanvas() {
        const cx = canvas.getContext("2d");
        cx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function resizeCanvas(_width, _height) {
        canvas.width = _width;
        canvas.height = _height;
    }

    async function initialize(_canvas, _devicePixelRatio) {
        canvas = _canvas;
        devicePixelRatio = _devicePixelRatio;
        const imageData =
            _devicePixelRatio > 1 ? cursorImage2XUrlData : cursorImageUrlData;
        cursorCanvas = await createCursorCanvas(imageData);
        // console.log(canvas, cursorCanvas, _devicePixelRatio);
        onInitialized();
    }

    function updateScrollPosition(_scrollX, _scrollY) {
        scrollX = _scrollX;
        scrollY = _scrollY;
    }

    function start() {
        if (!canvas) {
            throw "canvas is not set!";
        }
        console.log("start");
        stopNextFrame = false;
        const cx = canvas.getContext("2d");

        startAnimation(cx);
        startFrameProcessing();
        // clear canvas once
        // clearCanvas();
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
        getFPS,
        initialize,
        resizeCanvas,
        getCurrentFrameNumber,
        getCurrentCursorCount,
        updateScrollPosition,
    };
}
