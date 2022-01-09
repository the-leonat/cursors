import fastdom from "fastdom";
("use strict");

// todo convert to typescript
// x todo dont update position when cursor is only slightly different in position
// x move rendering to canvas to web worker (offscreen canvas)
// x bug cursor not included in the current frame cant update their position
// useCursorData reset does not reset timer
// x send tracking info only if position changes
// but also if not changing send every 10 seconds
// hover over svg problem (prune xpaths)
// x track cursor does unnessecary dom measuring
// x use requestIdleCallback
// https://github.com/pladaria/requestidlecallback-polyfill#readme
// x  while time remaining process another frame
//  x dont use fastdom measure (no sense since it uses rafs)
//  x if time is up, call another ric and continue
// --> https://github.com/aFarkas/requestIdleCallback
// x cancel rICs on resize
// x buffer size == frames per second (usually 1) times buffer time (10)
// IMPORTANT soft navigation between pages reset data structures

interface UIData {
    render: Partial<{
        currentCursorCount: number;
        currentFrameNumber: number;
        highestLoadedFrameNumber: number;
        lastFrameNumber: number;
        fps: number;
    }>;
    processing: Partial<{
        isProcessing: boolean;
        from: number;
        to: number;
    }>;
    track: Partial<{
        frameNumber: number;
        persistedFrameNumber: number;
    }>;
}

export function useUI(
    handleStart: () => void,
    handleStop: () => void,
    hide: boolean
) {
    const div = document.createElement("div");
    const span = document.createElement("span");
    const button = document.createElement("button");

    let data: UIData = {
        render: {},
        processing: {},
        track: {},
    };

    function updateData(_data: Partial<UIData>) {
        data = {
            render: {
                ...data.render,
                ..._data?.render,
            },
            processing: {
                ...data.processing,
                ..._data?.processing,
            },
            track: {
                ...data.track,
                ..._data?.track,
            },
        };
        updateUI();
    }

    function updateUI() {
        if (hide) return;
        fastdom.mutate(() => {
            const { processing, render, track } = data;
            const { isProcessing, from, to } = processing;
            const {
                currentFrameNumber,
                highestLoadedFrameNumber,
                lastFrameNumber,
                fps,
            } = render;
            const { frameNumber: trackedFrameNumber, persistedFrameNumber } =
                track;
            const processingText = isProcessing
                ? `processing (${from}/${to}}`
                : "";
            const renderText = `render (${currentFrameNumber}/${highestLoadedFrameNumber}/${lastFrameNumber}) fps ${fps?.toFixed()}`;
            const trackText = `track (${persistedFrameNumber}/${trackedFrameNumber})`;
            const text = `${trackText} ${renderText} ${processingText}`;
            span.textContent = text;
        });
    }

    div.style.position = "fixed";
    div.style.bottom = "0";
    div.style.right = "0";
    div.style.zIndex = "9999";
    div.style.background = "white";
    div.style.fontFamily = "Courier New";
    div.style.fontWeight = "bold";

    button.value = "0";
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
                button.value = newValue + "";
                button.textContent = newValue === 0 ? "Start" : "Stop";
            });
        });
    };

    div.appendChild(span);
    div.appendChild(button);
    if (!hide) document.body.appendChild(div);

    return {
        updateData,
    };
}
