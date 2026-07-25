import { makeSetRatingCommand } from "./set_rating_shared.js";
import { PermissionBit } from "../shared/roles.js";

export default {
    permissions: PermissionBit.MODERATOR,
    exec: makeSetRatingCommand("mmr")
};
