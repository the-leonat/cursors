import { createClient } from "@supabase/supabase-js";

function throwIfEmpty(_var) {
    if (_var === undefined || _var === null) throw ("env var not present");
    return _var;
}

export default function useStorage() {
    const apiUrl = throwIfEmpty(process.env.API_URL);
    const apiKey = throwIfEmpty(process.env.API_KEY);
    const supabase = createClient(apiUrl, apiKey);

    async function persist(userId, resourceId, xPath, x, y, time) {
        const { data, error } = await supabase.from("cursors").insert([
            {
                user_id: userId,
                resource_id: resourceId,
                xpath: xPath,
                x,
                y,
                time,
            },
        ]);
    }

    async function getLastFrameTimePerCursor(resourceId) {
        const { data, error } = await supabase
        .rpc("get_last_frame_time", {
            _resource_id: resourceId,
        });
        console.log(data)

        const { lastFrameTime, ...dict } = data[0];
        return {
            lastFrameTime,
            lastFrameTimePerCursorDict: dict
        }
    }

    async function getFrames(resourceId, from, to) {
        const { data, error } = await supabase
            .rpc("get_frames", {
                _resource_id: resourceId,
                _from: from,
                _to: to,
            });

        return data;
    }

    return {
        persist,
        getFrames,
        getLastFrameTimePerCursor
    };
}
