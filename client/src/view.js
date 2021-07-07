export function useAnimationLoop(callbackFunction, fps) {
    let stopNext, fpsInterval, then, elapsed, running;

    function raf(_callback) {
        if (typeof window !== "undefined") window.requestAnimationFrame(_callback);
        else setTimeout(_callback, fpsInterval)
    }

    function start(...args) {
        if (running) {
            console.error ("called start but was already running")
            return;
        }
        running = true;
        stopNext = false;
        fpsInterval = 1000 / fps;
        then = performance.now();

        function invoke(_now) {
            const now = _now || performance.now(); // check if parameter is passed (only in raf)
            if (stopNext) return;
            raf(invoke);

            elapsed = now - then;
            if (elapsed <= fpsInterval) return;
            then = now - (elapsed % fpsInterval);
            callbackFunction(elapsed, ...args);
        }
        raf(invoke);
    }

    function stop() {
        running = false;
        stopNext = true;
    }

    return {
        start,
        stop,
    };
}
