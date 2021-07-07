import fastdom from "fastdom";

// todo convert to typescript
// todo dont update position when cursor is only slightly different in position
// move rendering to canvas to web worker (offscreen canvas)
// bug cursor not included in the current frame cant update their position
// useCursorData reset does not reset timer
// send tracking info only if position changes
// but also if not changing send every 10 seconds
// hover over svg problem (prune xpaths)
// track cursor does unnessecary dom measuring
// use requestIdleCallback
// https://github.com/pladaria/requestidlecallback-polyfill#readme
//   while time remaining process another frame
//   dont use fastdom measure (no sense since it uses rafs)
//   if time is up, call another ric and continue
// --> https://github.com/aFarkas/requestIdleCallback
// cancel rICs on resize
// buffer size == frames per second (usually 1) times buffer time (10)
// soft navigation between pages reset data structures
export function useUI(handleStart, handleStop) {
    const div = document.createElement("div");
    const span = document.createElement("span");
    const button = document.createElement("button");

    const processingInfo = {
        isProcessing: false,
    };
    const renderInfo = {
        currentFrameNumber: -1,
        highestLoadedFrameNumber: -1,
        lastFrameNumber: -1
    };
    const trackInfo = {
        frameNumber: -1
    }

    function updateProcessingInfo(_isProcessing, _from, _to) {
        processingInfo.isProcessing = _isProcessing;
        if (_isProcessing) {
            processingInfo.from = _from;
            processingInfo.to = _to;
        }
        updateUI();
    }

    function updateRenderInfo(
        _currentFrameNumber,
        _highestLoadedFrameNumber,
        _lastFrameNumber
    ) {
        renderInfo.currentFrameNumber = _currentFrameNumber;
        renderInfo.highestLoadedFrameNumber = _highestLoadedFrameNumber;
        renderInfo.lastFrameNumber = _lastFrameNumber;
        updateUI();
    }

    function updateTrackInfo(_frameNumber) {
        trackInfo.frameNumber = _frameNumber;
        updateUI();
    }

    function updateUI() {
        fastdom.mutate(() => {
            const { isProcessing, from, to } = processingInfo;
            const {
                currentFrameNumber,
                highestLoadedFrameNumber,
                lastFrameNumber,
            } = renderInfo;
            const {frameNumber: trackedFrameNumber} = trackInfo;
            const processingText = isProcessing
                ? `processing (${from}/${to}}`
                : "";
            const renderText = `render (${currentFrameNumber}/${highestLoadedFrameNumber}/${lastFrameNumber})`;
            const trackText = `track (${trackedFrameNumber})`
            const text = `${trackText} ${renderText} ${processingText}`;
            span.textContent = text;
        });
    }

    div.style.position = "fixed";
    div.style.bottom = 0;
    div.style.right = 0;
    div.style.zIndex = 9999;
    div.style.background = "white";
    div.style.fontFamily = "Courier New";
    div.style.fontWeight = "bold";

    button.value = 0;
    button.textContent = "Start";

    button.onclick = () => {
        fastdom.measure(() => {
            const value = parseInt(button.value);
            if (value === 0) {
                handleStart();
            } else if (value === 1) {
                handleStop();
            }
            const newValue = (value + 1) % 2;
            fastdom.mutate(() => {
                button.value = newValue;
                button.textContent = newValue === 0 ? "Start" : "Stop";
            });
        });
    };

    div.appendChild(span);
    div.appendChild(button);
    document.body.appendChild(div);

    return {
        updateProcessingInfo,
        updateRenderInfo,
        updateTrackInfo
    };
}
