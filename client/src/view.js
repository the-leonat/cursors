

export function useAnimationLoop(runFunction, fps) {
    let stopNext, fpsInterval, then, elapsed;

    function start() {
        stopNext = false;
        fpsInterval = 1000 / fps;
        then = window.performance.now();
        window.requestAnimationFrame(run);
    }

    function stop() {
        stopNext = true;
    }

    function run(now) {
        if (stopNext) return;
        window.requestAnimationFrame(run);

        elapsed = now - then;
        if (elapsed <= fpsInterval) return;
        then = now - (elapsed % fpsInterval);
        const delta = elapsed / fpsInterval; 
        runFunction(delta);
    }

    return {
        start,
        stop
    }

}