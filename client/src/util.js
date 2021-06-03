


export default function useDeferedCallback(
    callback,
    delay
) {
    let timeoutId = null;
    function call() {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
        }
        timeoutId = window.setTimeout(callback, delay);
    }
    return call;
}