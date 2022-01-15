import { dataStore, UIData } from "../ui/store";
// @ts-expect-error
import App from "../ui/App.svelte";

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

export function useUI(handleStart: () => void, handleStop: () => void) {
    function updateData(_data: Partial<UIData>) {
        dataStore.update((currentData) => ({
            isRunning:
                _data.isRunning !== undefined
                    ? _data.isRunning
                    : currentData.isRunning,
            render: {
                ...currentData.render,
                ..._data?.render,
            },
            processing: {
                ...currentData.processing,
                ..._data?.processing,
            },
            track: {
                ...currentData.track,
                ..._data?.track,
            },
        }));
    }

    const app = new App({
        target: document.body,
        props: {
            handleStart,
            handleStop,
        },
    });

    return {
        updateData,
    };
}
