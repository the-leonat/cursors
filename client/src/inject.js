import trackCursor from "./track";

function injectHtml() {
    var div = document.createElement("div");
    div.style.position = "fixed";
    div.style.top = 0;
    div.style.right = 0;
    div.style.zIndex = 9999;
    div.style.background = "red";
    div.textContent = "Injected!";
    document.body.appendChild(div);
}

(function () {
    if (window.injected) {
        console.log("already injected");
        return;
    }
    window.injected = true;
    injectHtml();
    trackCursor();
})();
