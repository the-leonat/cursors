import CircularBuffer from "mnemonist/circular-buffer";
import { TRACKING_FPS } from "../config";

export function useRequestFrameData(handleRequestFrames) {
    const bufferSizeInSeconds = 15;
    const frameBufferCapacity = TRACKING_FPS * bufferSizeInSeconds;
    console.log(frameBufferCapacity);
    const frameBuffer = new CircularBuffer(Array, frameBufferCapacity);
    let currentTimeoutId = null;
    let highestLoadedFrameNumber = 0;

    function startRequest() {
        requestFrames();
    }

    function getHighestLoadedFrameNumber() {
        return highestLoadedFrameNumber;
    }

    function handleIncomingFrames(data) {
        const { frames } = data;
        if (!frames || frames.length === 0) {
            console.debug("empty frame array");
            return;
        }
        const firstFrame = frames[0];
        const lastFrame = frames[frames.length - 1];

        // check if incoming data is wanted
        if (firstFrame.number !== highestLoadedFrameNumber) {
            console.debug(
                "requested frame does not match wanted",
                firstFrame.number,
                highestLoadedFrameNumber
            );
            return;
        }

        // push frames on the buffer
        frames.forEach((frame) => {
            frameBuffer.push(frame);
        });

        if (firstFrame && lastFrame) {
            // console.log(
            //     `now in buffer frames ${firstFrame.number}-${lastFrame.number}`
            // );
            const { last } = lastFrame;
            highestLoadedFrameNumber = lastFrame.number;
            if (last) {
                console.log("last frame loaded");
                unscheduleNextFrameRequest();
            } else {
                scheduleNextFrameRequest();
            }
        }
    }

    function unscheduleNextFrameRequest() {
        clearTimeout(currentTimeoutId);
        currentTimeoutId = null;
    }

    function scheduleNextFrameRequest() {
        unscheduleNextFrameRequest();
        currentTimeoutId = setTimeout(
            () => requestFrames(),
            bufferSizeInSeconds * 0.25 * 1000
        );
    }

    function requestFrames() {
        unscheduleNextFrameRequest();
        const emptyBufferSize = frameBufferCapacity - frameBuffer.size;
        if (emptyBufferSize > frameBufferCapacity * 0.25) {
            const from = highestLoadedFrameNumber;
            const to = highestLoadedFrameNumber + emptyBufferSize + 1;
            handleRequestFrames(from, to);
        } else {
            scheduleNextFrameRequest();
        }
    }

    function getFrame() {
        return frameBuffer.shift();
    }

    function resetFrameBuffer(_from) {
        frameBuffer.clear();
        // we dont know the max number here so we assume the highest
        unscheduleNextFrameRequest();
        highestLoadedFrameNumber = _from;
        requestFrames();
    }

    return {
        handleIncomingFrames,
        getFrame,
        resetFrameBuffer,
        startRequest,
        getHighestLoadedFrameNumber,
    };
}
