export default function useDeferedCallback(callback, delay) {
    let timeoutId = null;
    function call(...args) {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
        }
        timeoutId = window.setTimeout(() => callback(...args), delay);
    }
    return call;
}

// rename later
export function useFirstDeferedCallback(callback, delay) {
    let locked = false;

    function call(...args) {
        if (!locked) {
            callback(...args);
            locked = true;
            window.setTimeout(() => (locked = false), delay);
        }
    }
    return call;
}
