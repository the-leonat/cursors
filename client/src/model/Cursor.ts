import { TRACKING_FPS } from "../config";

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

class CurvedMovement implements Movement {
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
    private t: number = 0;
    private duration: number;
    private randomOffset = -Math.random() * TRACKING_FPS;
    // private randomOffset = 0;

    private movementChain: Parameters<Movement["move"]>[] = [];
    tick: (delta: number) => void = (_delta) => {
        if (!this.hasStarted()) {
            this.randomOffset += _delta;
            return;
        }
        if (this.movementChain.length > 0) {
            if (this.isDone() || this.t === 0)
                this.moveNow(...this.movementChain.shift());
        }
        this._saveOldPosition();
        this.t = this.t + _delta / this.duration;
        const dx = this.subX * clamp(this.t);
        const dy = this.subY * clamp(this.t);
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
        this.movementChain.push([_start, _end, _duration]);
    };

    moveNow = (
        _start: [number, number],
        _end: [number, number],
        _duration: number
    ) => {
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

    hasStarted: () => boolean = () => {
        return this.randomOffset >= 0;
    };

    isDone: () => boolean = () => {
        return this.t >= 1;
    };
}

export default class Cursor {
    private willDelete: boolean;
    private movement: Movement;
    private position: [number, number] | null;
    private prevPosition: [number, number] | null;
    private scrollX: number;
    private scrollY: number;

    constructor(x: number, y: number) {
        this.movement = new LinearMovement();
        this.position = [x, y];
        this.willDelete = false;
    }

    deleteNextFrame() {
        this.willDelete = true;
    }

    update(_delta: number, _scrollX: number, _scrollY: number) {
        this.movement.tick(_delta);
        this.scrollX = _scrollX;
        this.scrollY = _scrollY;

        if (this.willDelete && this.movement.isDone()) return true;
        return false;
    }

    moveTo(
        _x: number,
        _y: number,
        _duration: number,
        _update: boolean = false
    ) {
        // console.log(this.position);
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
        scale: number
    ) {
        // return;
        const p = 2;
        const w = cursorImage.width;
        const h = cursorImage.height;
        const [prevX, prevY] = this.movement.getPosition();
        if (typeof w != "number" || typeof h !== "number") return;
        cx.clearRect(
            (this.scrollX + prevX) * scale - p,
            (this.scrollY + prevY) * scale - p,
            w + p * 2,
            h + p * 2
        );
    }

    renderDrawCanvas(
        cx: CanvasRenderingContext2D,
        cursorImage: CanvasImageSource,
        scale: number
    ) {
        // cx.strokeStyle = "#000"; //Red
        // cx.lineWidth = 1;
        // cx.beginPath();
        // cx.moveTo(this.oldX, this.oldY);
        // cx.lineTo(this.x, this.y);
        // cx.stroke();
        const [x, y] = this.movement.getPosition();
        const w = cursorImage.width;
        const h = cursorImage.height;
        if (typeof w != "number" || typeof h !== "number") return;

        cx.drawImage(
            cursorImage,
            (this.scrollX + x) * scale,
            (this.scrollY + y) * scale
        );
        // cx.font = "25px serif";
        // cx.fillText(
        //     `${x}, ${y}`,
        //     (this.scrollX + x) * scale,
        //     (this.scrollY + y) * scale
        // );
    }
}
