import { useResourceId } from "./track";
import createWorker from "./lib/createWorker";
import { useUI } from "./helpers/useUI";
import { useProcessFrameData } from "./helpers/useProcessFrameData";
import { useHTMLCanvas } from "./helpers/useHTMLCanvas";
import workerUrl from "data-url:./render.js";
import trackCursor from "./track";
import Visibility from "visibilityjs";
import { TRACKING_FPS } from "./config";

const AUTOSTART = true || process.env.SILENT !== undefined;

const run = async function () {
    if (window.injected) {
        console.log("already injected");
        return;
    }
    window.injected = true;
    const { updateData: updateUIState } = useUI(
        handleStart,
        handleStop,
        handleReset
    );
    const { start: startTracking, stop: stopTracking } =
        trackCursor(handleCursorTracked);
    const getResourceId = useResourceId();
    const { resourceId, changed } = getResourceId();
    const { getFrames, getLastFrameNumber } = await useProcessFrameData(
        resourceId,
        handleFrameProcessing,
        handleFrameInfoLoaded,
        handleFrameLoading
    );
    const canvas = await useHTMLCanvas(handleCanvasResize);
    let worker;
    try {
        worker = createWorker(workerUrl, canvas, handleWorkerEvent);
    } catch (e) {
        console.log("failed");
    }

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

    function handleFrameLoading(_loading, _from, _to) {
        if (_loading) {
            updateUIState({
                loading: {
                    isLoading: true,
                    from: _from,
                    to: _to,
                },
            });
        } else {
            updateUIState({
                loading: {
                    isLoading: false,
                },
            });
        }
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
        worker.post({
            type: "stop",
        });
        stopTracking();
        updateUIState({
            isRunning: false,
        });
    }

    function handleStart() {
        let started = false;

        // if more then a minute of data start
        if (getLastFrameNumber() > 15 * TRACKING_FPS) {
            worker.post({
                type: "start",
            });
            started = true;
        }
        startTracking();
        updateUIState({
            isRunning: started,
        });
    }

    function handleReset() {
        worker.post({
            type: "reset",
        });
        stopTracking();
    }

    function handleInitialized() {
        if (AUTOSTART) {
            if (Visibility.state() === "visible") handleStart();
        }
        Visibility.change((e, state) => {
            if (state === "hidden") handleStop();
            else if (state === "visible") handleStart();
        });
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
            handleInitialized();
        } else if (_event.data.type === "frames") {
            handleFramesRequest(_event.data);
        } else if ((_event.data.type = "currentFrame")) {
            handleRenderInfo(_event.data);
        }
    }
};

run();
