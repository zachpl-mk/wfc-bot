import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getConfig } from "../config.js";
import { makeRequest, pidToFc, resolveModRestrictPermission, resolvePidFromString, sendEmbedLog, validateID, WiiLinkUser } from "../utils.js";

const config = getConfig();

type RatingType = "vr" | "br" | "mmr";

const ratingLimits: Record<RatingType, { min: number, max: number }> = {
    vr: { min: 100, max: 1000000 },
    br: { min: 100, max: 1000000 },
    mmr: { min: 100, max: 30000 },
};

interface SetRatingResponse {
    User?: WiiLinkUser,
    user?: WiiLinkUser,
    PreviousValue?: number,
    previous_value?: number,
    Value?: number,
    value?: number,
    VR?: number,
    vr?: number,
    BR?: number,
    br?: number,
    MMR?: number,
    mmr?: number,
    Error?: string,
    error?: string,
}

export function makeSetRatingCommand(ratingType: RatingType) {
    const ratingLabel = ratingType.toUpperCase();
    const command = new SlashCommandBuilder()
        .setName(`set${ratingType}`)
        .setDescription(`Set a player's ${ratingLabel}`)
        .addStringOption(option => option.setName("id")
            .setDescription("friend code or pid to update")
            .setRequired(true))
        .addIntegerOption(option => option.setName("value")
            .setDescription(`${ratingLabel} value to set`)
            .setRequired(true)
            .setMinValue(ratingLimits[ratingType].min)
            .setMaxValue(ratingLimits[ratingType].max));

    if (ratingType === "mmr") {
        command.addStringOption(option => option.setName("mode")
            .setDescription("competitive mode to update")
            .setRequired(true)
            .addChoices(
                { name: "Retro", value: "retro" },
                { name: "CT", value: "ct" },
                { name: "Regular", value: "regular" },
            ));
    }

    command.addStringOption(option => option.setName("reason")
        .setDescription(`reason for updating ${ratingLabel}`)
        .setRequired(true))
        .setDefaultMemberPermissions(resolveModRestrictPermission());

    return {
        modOnly: true,
        adminOnly: false,

        data: command,

        exec: async function(interaction: ChatInputCommandInteraction<CacheType>) {
            let id = interaction.options.getString("id", true);
            id = id.trim();

            const [valid, err] = validateID(id);
            if (!valid) {
                await interaction.reply({ content: `Error updating ${ratingLabel} for friend code or pid "${id}": ${err}` });
                return;
            }

            const pid = resolvePidFromString(id);
            const mmrMode = ratingType === "mmr" ? interaction.options.getString("mode", true) : null;
            const selectedRatingLabel = mmrMode ? `${ratingLabel} (${mmrMode.toUpperCase()})` : ratingLabel;
            const reason = interaction.options.getString("reason", true).trim();
            const value = interaction.options.getInteger("value", true);

            if (reason.length == 0) {
                await interaction.reply({ content: `Error updating ${selectedRatingLabel} for friend code or pid "${id}": Empty reason` });
                return;
            }

            const fc = pidToFc(pid);
            const [success, rawRes] = await makeRequest("/api/set_mkw_rating", "POST", {
                secret: config.wfcSecret,
                pid: pid,
                rating_type: mmrMode ? `mmr_${mmrMode}` : ratingType,
                reason: reason,
                value: value,
            });
            const res = rawRes as SetRatingResponse;

            if (!success) {
                await interaction.reply({ content: `Failed to update ${selectedRatingLabel} for friend code "${fc}": error ${res.Error ?? res.error ?? "no error message provided"}` });
                return;
            }

            const user = res.User ?? res.user;
            const previousValue = res.PreviousValue ?? res.previous_value;
            const currentValue = res.Value ?? res.value;
            if (!user || previousValue == undefined || currentValue == undefined) {
                await interaction.reply({ content: `Failed to update ${selectedRatingLabel} for friend code "${fc}": server returned an unexpected response` });
                return;
            }

            await sendEmbedLog(interaction, `set ${selectedRatingLabel}`, fc, user, [
                { name: `Previous ${selectedRatingLabel}`, value: previousValue.toLocaleString() },
                { name: `New ${selectedRatingLabel}`, value: currentValue.toLocaleString() },
                { name: "Reason", value: reason },
            ], false, true);
        }
    };
}
