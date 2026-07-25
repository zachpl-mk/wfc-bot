import { CacheType, ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { getConfig } from "../config.js";
import { makeRequest } from "../utils.js";

const config = getConfig();

interface SeasonResponse {
    previous_season?: number,
    previousSeason?: number,
    season?: number,
    Error?: string,
    error?: string,
}

export default {
    adminOnly: true,
    modOnly: false,

    data: new SlashCommandBuilder()
        .setName("mmrseason")
        .setDescription("Switch the active Mario Kart Wii MMR season")
        .addIntegerOption(option => option.setName("season")
            .setDescription("season number to activate")
            .setRequired(true)
            .setMinValue(1)),

    exec: async function(interaction: ChatInputCommandInteraction<CacheType>) {
        const season = interaction.options.getInteger("season", true);
        const [success, rawRes] = await makeRequest("/api/set_mkw_mmr_season", "POST", {
            secret: config.wfcSecret,
            season: season,
        });
        const res = rawRes as SeasonResponse;

        if (!success) {
            await interaction.reply({
                content: `Failed to switch MMR season: ${res.Error ?? res.error ?? "no error message provided"}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const previous = res.previous_season ?? res.previousSeason;
        await interaction.reply({
            content: `MMR season switched from ${previous ?? "the previous season"} to season ${res.season ?? season}. Players without saved ratings in this season start at 1,000 MMR.`,
        });
    },
};
