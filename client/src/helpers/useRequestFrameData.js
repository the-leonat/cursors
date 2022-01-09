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
        frames.forEach((frame) => {
            frameBuffer.push(frame);
        });
        const firstFrame = frameBuffer.peekFirst();
        const lastFrame = frameBuffer.peekLast();

        if (firstFrame && lastFrame) {
            // console.log(
            //     `now in buffer frames ${firstFrame.number}-${lastFrame.number}`
            // );
            const { last } = lastFrame;
            highestLoadedFrameNumber = lastFrame.number + 1;
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
            const to = highestLoadedFrameNumber + emptyBufferSize;
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
