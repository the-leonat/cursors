import { get_binding_group_value } from "svelte/internal";

export default function getElementDimensions(el, ignoreScrollPosition = false) {
    getTop = (_el) =>
        _el.offsetTop + (_el.offsetParent && getTop(_el.offsetParent));
    getLeft = (_el) =>
        _el.offsetLeft + (_el.offsetParent && getLeft(_el.offsetParent));
    const rect = el.getBoundingClientRect();
    // scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    // scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    // const scrollLeft =
    return {
        top: getTop(el),
        left: getLeft(el),
        width: rect.width,
        height: rect.height || 1,
    };
}
