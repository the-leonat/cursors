import { useResourceId } from "./track";
import createWorker from "./lib/createWorker";
import { useUI } from "./helpers/useUI";
import { useProcessFrameData } from "./helpers/useProcessFrameData";
import { useHTMLCanvas } from "./helpers/useHTMLCanvas";
import workerUrl from "data-url:./render.js";
import trackCursor from "./track";
import Visibility from "visibilityjs";

const AUTOSTART = process.env.SILENT !== undefined;

const run = async function () {
    if (window.injected) {
        console.log("already injected");
        return;
    }
    window.injected = true;
    const { updateData } = useUI(handleStart, handleStop, false);
    const { start: startTracking, stop: stopTracking } =
        trackCursor(handleCursorTracked);
    const getResourceId = useResourceId();
    const { resourceId, changed } = getResourceId();
    const { getFrames, getLastFrameNumber } = await useProcessFrameData(
        resourceId,
        handleFrameProcessing,
        handleFrameInfoLoaded
    );
    const canvas = await useHTMLCanvas(handleCanvasResize);
    const worker = createWorker(workerUrl, canvas, handleWorkerEvent);

    function handleFrameInfoLoaded(_frameCount) {
        updateData({
            render: {
                lastFrameNumber: _frameCount,
            },
        });
    }

    function handleCanvasResize(_newWidth, _newHeight) {
        if (!worker) return;
        worker.post({
            type: "resize",
            width: _newWidth,
            height: _newHeight,
        });
    }

    function handleRenderInfo(_data) {
        const { currentFrameNumber, highestLoadedFrameNumber, fps } = _data;
        updateData({
            render: {
                currentFrameNumber,
                highestLoadedFrameNumber,
                lastFrameNumber: getLastFrameNumber(),
                fps,
            },
        });
    }

    function handleCursorTracked(frameNumber, persistedFrameNumber) {
        updateData({ track: { frameNumber, persistedFrameNumber } });
    }

    function handleFrameProcessing(isProcessing, from, to) {
        updateData({ processing: { isProcessing, from, to } });
    }

    function handleStop() {
        worker.post({
            type: "stop",
        });
        stopTracking();
    }

    function handleStart() {
        worker.post({
            type: "start",
        });
        startTracking();
    }

    async function handleFramesRequest(_eventData) {
        const { from, to } = _eventData;
        // console.log("event data", _eventData)
        const frames = await getFrames(from, to);
        // console.log(frames);
        worker.post({
            type: "frames",
            from,
            to,
            frames,
        });
    }

    function handleWorkerEvent(_event) {
        // console.log("mainthread event", _event)
        if (_event.data.type === "initialized") {
            if (AUTOSTART) {
                if (Visibility.state() === "prerender") handleStart();
                Visibility.change((e, state) => {
                    if (state === "hidden") handleStop();
                    else if (state === "prerender") handleStart();
                });
            }
            // handleInitialized();
        } else if (_event.data.type === "frames") {
            handleFramesRequest(_event.data);
        } else if ((_event.data.type = "currentFrame")) {
            handleRenderInfo(_event.data);
        }
    }
};

run();
