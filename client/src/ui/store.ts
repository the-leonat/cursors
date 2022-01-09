import { writable } from "svelte/store";

export interface UIData {
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

export const dataStore = writable<UIData>({
    render: {},
    processing: {},
    track: {},
});
