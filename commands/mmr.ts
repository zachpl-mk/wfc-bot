import { CacheType, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { getColor, getMiiImageURL, getMKWRatings, pidToFc, resolvePidFromString, validateID } from "../utils.js";

export default {
    modOnly: false,
    adminOnly: false,

    data: new SlashCommandBuilder()
        .setName("mmr")
        .setDescription("Show a player's MMR")
        .addStringOption(option => option.setName("id")
            .setDescription("friend code or pid to check")
            .setRequired(true)),

    exec: async function(interaction: ChatInputCommandInteraction<CacheType>) {
        const id = interaction.options.getString("id", true).trim();
        const [valid, err] = validateID(id);
        if (!valid) {
            await interaction.reply({ content: `Error retrieving friend code or pid "${id}": ${err}` });
            return;
        }

        const pid = resolvePidFromString(id);
        const fc = pidToFc(pid);
        const [success, ratings] = await getMKWRatings(pid);
        if (!success) {
            await interaction.reply({
                content: `Failed to retrieve MMR for friend code "${fc}": server request failed`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (!ratings || (ratings.mmr_rt <= 0 && ratings.mmr_ct <= 0 && ratings.mmr_vanilla <= 0)) {
            await interaction.reply({
                content: `No MMR is recorded for friend code "${fc}".`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(getColor())
                .setTitle(`MMR for friend code ${fc}`)
                .setThumbnail(getMiiImageURL(fc))
                .addFields(
                    { name: "Profile ID", value: `${pid}` },
                    { name: "MMR (RT)", value: ratings.mmr_rt > 0 ? ratings.mmr_rt.toLocaleString() : "Unknown" },
                    { name: "MMR (CT)", value: ratings.mmr_ct > 0 ? ratings.mmr_ct.toLocaleString() : "Unknown" },
                    { name: "MMR (Vanilla)", value: ratings.mmr_vanilla > 0 ? ratings.mmr_vanilla.toLocaleString() : "Unknown" },
                )
                .setTimestamp()],
        });
    },
};
