
export default function useDeferedCallback(callback, delay) {
    let timeoutId = null;
    function call(...args) {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
        }
        timeoutId = window.setTimeout(
            () => callback(...args),
            delay
        );
    }
    return call;
}