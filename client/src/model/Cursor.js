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
    constructor(x, y) {
        this.fromX = x;
        this.fromY = y;
        this.toX = x;
        this.toY = y;
        this.x = Math.floor(x);
        this.y = Math.floor(y);
        this.oldX = this.x;
        this.oldY = this.y;
        this.subX = 0;
        this.subY = 0;
        this.t = 0;
        this.duration = 1000;
        this.willDelete = false;
    }

    saveOldPosition() {
        this.oldX = this.x;
        this.oldY = this.y;
    }

    // called every frame
    update(delta) {
        this.saveOldPosition();
        this.t = clamp(this.t + delta / this.duration);
        // const easedT = easeInOut(this.t);
        const easedT = this.t;
        const dx = this.subX * easedT;
        const dy = this.subY * easedT;
        this.x = this.fromX + Math.floor(dx);
        this.y = this.fromY + Math.floor(dy);
        if (this.t === 1 && this.willDelete) {
            return true;
        } else {
            return false;
        }
    }

    updatePositions(_toX, _toY) {
        this.toX = Math.floor(_toX);
        this.toY = Math.floor(_toY);
        this.subX = this.toX - this.fromX;
        this.subY = this.toY - this.fromY;
    }

    deleteNextFrame() {
        this.willDelete = true;
    }

    moveTo(_x, _y, _duration) {
        this.start = true;
        this.t = 0;
        this.duration = _duration; // in frames
        this.fromX = this.toX;
        this.fromY = this.toY;
        this.toX = Math.floor(_x);
        this.toY = Math.floor(_y);
        this.subX = this.toX - this.fromX;
        this.subY = this.toY - this.fromY;
    }

    renderClearCanvas(cx, cursorImage, force = false) {
        // return;
        const p = 2;
        const w = cursorImage.width;
        const h = cursorImage.height;
        cx.clearRect(this.oldX - p, this.oldY - p, w + p * 2, h + p * 2);
    }

    renderDrawCanvas(cx, cursorImage, force = false) {
        // cx.strokeStyle = "#000"; //Red
        // cx.lineWidth = 1;
        // cx.beginPath();
        // cx.moveTo(this.oldX, this.oldY);
        // cx.lineTo(this.x, this.y);
        // cx.stroke();
        cx.drawImage(cursorImage, this.x, this.y);
    }
}
