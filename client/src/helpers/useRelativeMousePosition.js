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
        };
    }, 200);

    function getRelativeMousePosition() {
        return new Promise((resolve) => {
            fastdom.measure(() => {
                const { element, mouseX, mouseY } = lastHovered;
                const {
                    top: posY,
                    left: posX,
                    width,
                    height,
                } = getElementDimensions(element);
                const xPath = calculateXPath(element);
                const relX = (mouseX - posX) / width;
                const relY = (mouseY - posY) / height;
                resolve({ xPath, relX, relY, absX: mouseX, absY: mouseY });
            });
        });
    }

    function destroy() {
        document.removeEventListener("mousemove", handleMouseOver);
    }
    document.addEventListener("mousemove", handleMouseOver);
    // document.addEventListener("mousemove", handleMouseOver);
    return {
        getRelativeMousePosition,
        destroy,
    };
}
