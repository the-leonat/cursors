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
    const { updateData: updateUIState } = useUI(handleStart, handleStop);
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
        updateUIState({
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
        const {
            currentFrameNumber,
            highestLoadedFrameNumber,
            fps,
            currentCursorCount,
        } = _data;
        updateUIState({
            render: {
                currentFrameNumber,
                highestLoadedFrameNumber,
                lastFrameNumber: getLastFrameNumber(),
                fps,
                currentCursorCount,
            },
        });
    }

    function handleCursorTracked(frameNumber, persistedFrameNumber) {
        updateUIState({ track: { frameNumber, persistedFrameNumber } });
    }

    function handleFrameProcessing(isProcessing, from, to) {
        updateUIState({ processing: { isProcessing, from, to } });
    }

    function handleStop() {
        console.log("stopped");
        worker.post({
            type: "stop",
        });
        stopTracking();
    }

    function handleStart() {
        console.log("started");
        worker.post({
            type: "start",
        });
        startTracking();
    }

    function start() {
        updateUIState({
            isRunning: true,
        });
        handleStart();
    }

    function stop() {
        updateUIState({
            isRunning: false,
        });
        handleStop();
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
                if (Visibility.state() === "visible") start();
            }
            Visibility.change((e, state) => {
                if (state === "hidden") stop();
                else if (state === "visible") start();
            });
            // handleInitialized();
        } else if (_event.data.type === "frames") {
            handleFramesRequest(_event.data);
        } else if ((_event.data.type = "currentFrame")) {
            handleRenderInfo(_event.data);
        }
    }
};

run();
