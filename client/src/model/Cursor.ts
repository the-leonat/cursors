function easeInOut(t: number) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

function clamp(t: number) {
    return Math.min(Math.max(t, 0), 1);
}

interface Movement {
    tick: (delta: number) => void;
    move: (
        _start: [number, number],
        _end: [number, number],
        _duration: number
    ) => void;
    updateEndPosition: (_pos: [number, number]) => void;
    getPosition: () => [number, number];
    getPreviousPosition: () => [number, number];
    isDone: () => boolean;
}

class LinearMovement implements Movement {
    private x: number;
    private y: number;
    private oldX: number;
    private oldY: number;
    private toX: number;
    private toY: number;
    private fromX: number;
    private fromY: number;
    private subX: number;
    private subY: number;
    private t: number;
    private duration: number;
    private hasStarted: boolean;

    tick: (delta: number) => void = (_delta) => {
        this._saveOldPosition();
        this.t = clamp(this.t + _delta / this.duration);
        const easedT = easeInOut(this.t);
        // const easedT = this.t;
        const dx = this.subX * easedT;
        const dy = this.subY * easedT;
        this.x = this.fromX + Math.floor(dx);
        this.y = this.fromY + Math.floor(dy);
    };

    private _saveOldPosition() {
        this.oldX = this.x;
        this.oldY = this.y;
    }

    updateEndPosition: (_pos: [number, number]) => void = (_pos) => {
        this.toX = Math.floor(_pos[0]);
        this.toY = Math.floor(_pos[1]);
        this.subX = this.toX - this.fromX;
        this.subY = this.toY - this.fromY;
    };

    move: (
        _start: [number, number],
        _end: [number, number],
        _duration: number
    ) => void = (_start, _end, _duration) => {
        this.hasStarted = true;
        this.t = 0;
        this.duration = _duration; // in frames
        this.fromX = Math.floor(_start[0]);
        this.fromY = Math.floor(_start[1]);
        this.toX = Math.floor(_end[0]);
        this.toY = Math.floor(_end[1]);
        this.subX = this.toX - this.fromX;
        this.subY = this.toY - this.fromY;
    };

    getPosition: () => [number, number] = () => {
        return [this.x, this.y];
    };

    getPreviousPosition: () => [number, number] = () => {
        return [this.oldX, this.oldY];
    };

    isDone: () => boolean = () => {
        return this.t === 1;
    };
}

export default class Cursor {
    private willDelete: boolean;
    private movement: Movement;
    private position: [number, number] | null;
    private prevPosition: [number, number] | null;

    constructor(x: number, y: number) {
        this.movement = new LinearMovement();
        this.position = [x, y];
        this.willDelete = false;
    }

    deleteNextFrame() {
        this.willDelete = true;
    }

    update(_delta: number) {
        this.movement.tick(_delta);

        if (this.willDelete && this.movement.isDone()) return true;
        return false;
    }

    moveTo(
        _x: number,
        _y: number,
        _duration: number,
        _update: boolean = false
    ) {
        console.log(this.position);
        this.prevPosition = [...this.position];
        this.position = [_x, _y];
        if (!this.prevPosition || !this.position) return;
        if (_update) {
            this.movement.updateEndPosition(this.position);
        } else {
            this.movement.move(this.prevPosition, this.position, _duration);
        }
    }

    renderClearCanvas(
        cx: CanvasRenderingContext2D,
        cursorImage: CanvasImageSource,
        force: boolean = false
    ) {
        // return;
        const p = 2;
        const w = cursorImage.width;
        const h = cursorImage.height;
        const [prevX, prevY] = this.movement.getPreviousPosition();
        if (typeof w != "number" || typeof h !== "number") return;
        cx.clearRect(prevX - p, prevY - p, w + p * 2, h + p * 2);
    }

    renderDrawCanvas(
        cx: CanvasRenderingContext2D,
        cursorImage: CanvasImageSource,
        force: boolean = false
    ) {
        // cx.strokeStyle = "#000"; //Red
        // cx.lineWidth = 1;
        // cx.beginPath();
        // cx.moveTo(this.oldX, this.oldY);
        // cx.lineTo(this.x, this.y);
        // cx.stroke();
        const [x, y] = this.movement.getPosition();
        cx.drawImage(cursorImage, x, y);
    }
}
