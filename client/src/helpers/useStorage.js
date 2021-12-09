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

    async function persistMultiple(_data) {
        const { data, error } = await supabase.from("cursors").insert(_data);
    }

    async function getLastFrameTimePerCursor(resourceId) {
        const { data, error } = await supabase
        .rpc("get_last_frame_time", {
            _resource_id: resourceId,
        });
        const singleData = data?.[0]?.data;

        if (!singleData) return {
            lastFrameTime: -1,
            lastFrameTimePerCursorDict: {}
        };

        const { lastFrameTime, ...dict } = singleData;

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
        persistMultiple,
        getFrames,
        getLastFrameTimePerCursor
    };
}
