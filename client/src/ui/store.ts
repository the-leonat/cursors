import { writable } from "svelte/store";

export interface UIData {
    isRunning: boolean;
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
    loading: Partial<{
        isLoading: boolean;
        from: number;
        to: number;
    }>;
}

export const dataStore = writable<UIData>({
    isRunning: false,
    render: {
        currentFrameNumber: 0,
    },
    processing: {},
    track: {},
    loading: {},
});
