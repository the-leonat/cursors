export default function getDocumentHeight() {
    const body = document.body;
    const html = document.documentElement;
    return window.innerHeight;
    return Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
    );
}
