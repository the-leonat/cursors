export function useAnimationLoop(runFunction, fps) {
    let stopNext, fpsInterval, then, elapsed;

    function raf(_callback) {
        if (window) window.requestAnimationFrame(_callback);
        else setTimeout(_callback, fps)
    }

    function start(...args) {
        stopNext = false;
        fpsInterval = 1000 / fps;
        then = performance.now();
        function invoke(_now) {
            const now = _now || performance.now(); // check if parameter is passed (only in raf)
            if (stopNext) return;
            window.requestAnimationFrame(run);

            elapsed = now - then;
            if (elapsed <= fpsInterval) return;
            then = now - (elapsed % fpsInterval);
            const delta = elapsed / fpsInterval;
            runFunction(delta, ...args);
        }
        raf(invoke);
    }

    function stop() {
        stopNext = true;
    }

    return {
        start,
        stop,
    };
}
