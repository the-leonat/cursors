function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

function clamp(t) {
    return Math.min(Math.max(t, 0), 1);
}

export default class Cursor {
    oldX;
    oldY;
    toX;
    toY;
    fromX;
    fromY;
    subX;
    subY;
    t;
    duration;
    start = false;
    shouldRender = false;
    constructor(x, y) {
        this.fromX = x;
        this.fromY = y;
        this.toX = x;
        this.toY = y;
        this.x = Math.floor(x);
        this.y = Math.floor(y);
        this.subX = 0;
        this.subY = 0;
        this.t = 0;
        this.duration = 30;
    }

    saveOldPosition() {
        this.oldX = this.x;
        this.oldY = this.y;
    }

    // called every frame
    update(delta) {
        if (!this.start || this.t === 1) {
            this.shouldRender = false;
            return false;
        }
        this.shouldRender = true;
        this.saveOldPosition();
        this.t = clamp(this.t + (this.duration * delta));
        const easedT = easeInOut(this.t);
        const dx = this.subX * easedT;
        const dy = this.subY * easedT;
        this.x = this.fromX + Math.floor(dx);
        this.y = this.fromY + Math.floor(dy);
        return true;
    }

    updatePositions(_toX, _toY) {
        this.toX = Math.floor(_toX);
        this.toY = Math.floor(_toY);
        this.subX = this.toX - this.fromX;
        this.subY = this.toY - this.fromY;
    }

    moveTo(_x, _y, _duration) {
        this.start = true;
        this.t = 0;
        this.duration = 1. / _duration; // in frames
        this.fromX = this.toX;
        this.fromY = this.toY;
        this.toX = Math.floor(_x);
        this.toY = Math.floor(_y);
        this.subX = this.toX - this.fromX;
        this.subY = this.toY - this.fromY;
    }

    renderClearCanvas(cx, cursorImage, force = false) {
        if (!this.shouldRerender && !force) return;
        const p = 2;
        const w = cursorImage.width;
        const h = cursorImage.height;
        cx.clearRect(this.oldX - p, this.oldY - p, w + p * 2, h + p * 2);
    } 

    renderDrawCanvas(cx, cursorImage, force = false) {
        if (!this.shouldRender && !force) return;
        cx.drawImage(cursorImage, this.x, this.y);

    }
}
