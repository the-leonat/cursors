import insideWorker from "./lib/insideWorker";
import { useRequestFrameData } from "./helpers/useRequestFrameData";
import { useRenderFrames } from "./helpers/useRenderFrames";

(async function () {
    const worker = insideWorker(handleWorkerEvent);

    const { getFrame, handleIncomingFrames, resetFrameBuffer, startRequest } =
        useRequestFrameData(handleRequestFrames);
    const { start, stop, setCanvas, getCurrentFrameNumber, resizeCanvas } =
        useRenderFrames(handleGetNextFrame, handleInitialized);

    function handleRequestFrames(_from, _to) {
        if (!worker) throw "Worker not initialized";
        console.log("request frames", _from, _to);
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

    function handleGetNextFrame() {
        const frame = getFrame();
        if (!frame) return;
        const { number } = frame;
        worker.post({
            type: "currentFrame",
            currentFrame: number,
        });

        return frame;
    }

    function handleWorkerEvent(_event) {
        // console.log("worker thread event", _event);
        if (_event.data.type === "frames") {
            const { data } = _event;
            handleIncomingFrames(data);
        } else if (_event.data.canvas) {
            const canvas = _event.data.canvas;
            setCanvas(canvas);
        } else if (_event.data.type === "resize") {
            const { width, height } = _event.data;
            const frameNumber = getCurrentFrameNumber();
            resetFrameBuffer(frameNumber);
            resizeCanvas(width, height);
        } else if (_event.data.type === "stop") {
            stop();
        } else if (_event.data.type === "start") {
            const frameNumber = getCurrentFrameNumber();
            startRequest(frameNumber);
            start();
        } else {
            throw "unrecognized event";
        }
    }
})();

export default undefined;