import insideWorker from "./lib/insideWorker";
import { useRequestFrameData } from "./helpers/useRequestFrameData";
import { useRenderFrames } from "./helpers/useRenderFrames";

(async function () {
    const worker = insideWorker(handleWorkerEvent);

    const {
        getFrame,
        handleIncomingFrames,
        resetFrameBuffer,
        startRequest,
        getHighestLoadedFrameNumber,
    } = useRequestFrameData(handleRequestFrames);
    const {
        start: startRender,
        stop,
        initialize,
        getCurrentFrameNumber,
        getCurrentCursorCount,
        resizeCanvas,
        getFPS,
        updateScrollPosition,
    } = useRenderFrames(handleGetNextFrame, handleInitialized);

    function handleRequestFrames(_from, _to) {
        if (!worker) throw "Worker not initialized";
        // console.log("request frames", _from, _to);
        worker.post({
            type: "frames",
            from: _from,
            to: _to,
        });
    }

    function handleInitialized() {
        worker.post({
            type: "initialized",
        });
    }

    function handleReset() {
        stop();
        resetFrameBuffer(0);
    }

    function handleGetNextFrame() {
        const frame = getFrame();
        if (!frame) return;
        const { number } = frame;
        worker.post({
            type: "currentFrame",
            currentFrameNumber: number,
            highestLoadedFrameNumber: getHighestLoadedFrameNumber(),
            fps: getFPS(),
            currentCursorCount: getCurrentCursorCount(),
        });

        return frame;
    }

    function handleWorkerEvent(_event) {
        // console.log("worker thread event", _event);
        if (_event.data.type === "frames") {
            const { data } = _event;
            handleIncomingFrames(data);
        } else if (_event.data.canvas) {
            const { canvas, devicePixelRatio } = _event.data;
            initialize(canvas, devicePixelRatio);
        } else if (_event.data.type === "resize") {
            console.log("resize");
            const { width, height } = _event.data;
            const frameNumber = getCurrentFrameNumber();
            resetFrameBuffer(frameNumber);
            resizeCanvas(width, height);
        } else if (_event.data.type === "documentResize") {
            console.log("doc resize");
            const frameNumber = getCurrentFrameNumber();
            resetFrameBuffer(frameNumber);
        } else if (_event.data.type === "stop") {
            stop();
        } else if (_event.data.type === "reset") {
            handleReset();
        } else if (_event.data.type === "start") {
            startRequest();
            startRender();
        } else if (_event.data.type === "scroll") {
            updateScrollPosition(_event.data.scrollX, _event.data.scrollY);
        } else {
            throw "unrecognized event";
        }
    }
})();

export default undefined;
