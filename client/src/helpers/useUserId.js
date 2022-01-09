import { v4 as uuidv4 } from "uuid";

export function useUserId() {
    let userId;

    function reset() {
        userId = uuidv4();
    }

    function getUserId() {
        return userId;
    }

    //pw:G3ginL3Ehd3yBT
    reset();

    return {
        getUserId,
        reset,
    };
}
