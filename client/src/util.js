export default function useDeferedCallback(callback, delay) {
    let timeoutId = null;
    function call() {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
        }
        timeoutId = window.setTimeout(
            callback,
            delay
        );
    }
    return call;
}

export function getDocumentHeight() {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
    );
}
