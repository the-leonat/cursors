import calculateXPath from "../lib/DOMPath";
import fastdom from "fastdom";
import getElementDimensions from "./getElementDimensions";
import { useFirstDeferedCallback } from "./useDeferedCallback";

export default function useRelativeMousePosition() {
    let lastHovered = null;

    const handleMouseOver = useFirstDeferedCallback((event) => {
        const { target: element, pageX: mouseX, pageY: mouseY } = event;

        lastHovered = {
            element,
            mouseX,
            mouseY,
            scrollX,
            scrollY,
        };
    }, 200);

    function getRelativeMousePosition() {
        return new Promise((resolve, reject) => {
            if (!lastHovered) {
                reject();
                return;
            }
            fastdom.measure(() => {
                const { element, mouseX, mouseY } = lastHovered;
                const scrollX =
                    window.pageXOffset || document.documentElement.scrollLeft;
                const scrollY =
                    window.pageYOffset || document.documentElement.scrollTop;
                const {
                    top: posY,
                    left: posX,
                    width,
                    height,
                } = getElementDimensions(element);
                const xPath = calculateXPath(element);
                const relX = (mouseX - posX) / width;
                const relY = (mouseY - posY) / height;
                console.log("posY / mouseY / height", posY, mouseY, height);

                resolve({
                    xPath,
                    relX,
                    relY,
                    absX: mouseX + scrollX,
                    absY: mouseY + scrollY,
                });
            });
        });
    }

    function destroy() {
        document.removeEventListener("mousemove", handleMouseOver);
        document.removeEventListener("mouseover", handleMouseOver);
    }
    document.addEventListener("mousemove", handleMouseOver);
    document.addEventListener("mouseover", handleMouseOver);
    // document.addEventListener("mousemove", handleMouseOver);
    return {
        getRelativeMousePosition,
        destroy,
    };
}
