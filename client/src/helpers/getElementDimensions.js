export default function getElementDimensions(el, ignoreScrollPosition = false) {
    // Todo: implement cache
    const rect = el.getBoundingClientRect(),
        scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return {
        top: ignoreScrollPosition ? rect.top : rect.top + scrollTop,
        left: ignoreScrollPosition ? rect.left : rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
    };
}
