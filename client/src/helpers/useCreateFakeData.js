import { useUserId } from "./useUserId";

export function useCreateFakeData() {
    const { getUserId, reset } = useUserId();
    const list = [];
    function generate(_resourceId, _numCursors, _maxTime) {
        for (let i = 0; i < _numCursors; i++) {
            const userId = getUserId();
            let posX = Math.random();
            let posY = Math.random();

            for (let t = 0; t < _maxTime; t++) {
                list.push({
                    user_id: userId,
                    resource_id: _resourceId,
                    xpath: "/html/body",
                    x: posX,
                    y: posY,
                    time: t,
                });
                const dX = (Math.random() * 2 - 1) * 0.05;
                const dY = (Math.random() * 2 - 1) * 0.05;
                if (dX + posX > 1 || dX + posX < 0) posX += dX * -1;
                if (dY + posY > 1 || dY + posY < 0) posY += dY * -1;
                posX += dX;
                posY += dY;
            }
            reset();
        }

        return list;
    }

    return generate;
}
