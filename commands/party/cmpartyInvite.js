const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  MessageContextMenuCommandInteraction,
} = require("discord.js");

const voiceGenerator = require("../../collections");

const MostCanvas = require("../../app/mostcanvas");

const DiscordUser = require("../../models/discord_user.js");

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("Party-Invite")
    .setType(ApplicationCommandType.User),
  /**
   *
   * @param {MessageContextMenuCommandInteraction} interaction
   */
  async execute(interaction) {
    const { member } = interaction;
    const voiceChannel = member.voice.channel;
    const embed = new EmbedBuilder().setColor("Green");
    const ownedChannel = voiceGenerator.get(member.id);
    const userPartyOwnerId = member.id;

    if (!voiceChannel)
      return interaction.reply({
        embeds: [
          embed
            .setDescription("You don't have any Party voice channel created.")
            .setColor("Orange"),
        ],
        ephemeral: true,
      });

    const isYourOwnPartyVoiceChannel = voiceChannel.id == ownedChannel;

    const isNotYourVoiceChannel =
      !ownedChannel || voiceChannel.id !== ownedChannel;
    function replyNotIsYourChannel() {
      return interaction.reply({
        embeds: [
          embed.setDescription("You do not own this party.").setColor("Orange"),
        ],
        ephemeral: true,
      });
    }

    try {
      if (isNotYourVoiceChannel) {
        replyNotIsYourChannel();
        return;
      }

      const targetMember = interaction.targetUser;
      if (targetMember.id == userPartyOwnerId && isYourOwnPartyVoiceChannel) {
        return interaction.reply({
          embeds: [
            embed
              .setDescription("You own this party, you can't INVITE yourself.")
              .setColor("Orange"),
          ],
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const hasAccess = voiceChannel?.permissionOverwrites?.cache?.get(
        targetMember.id
      );
      if (!hasAccess) {
        const isOnYourParty = voiceChannel.members.get(targetMember.id);
        if (isOnYourParty) {
          return interaction.editReply({
            embeds: [
              embed
                .setDescription(
                  `- ${targetMember} is already at your party.\n- You can't invite a user who is already in your party.`
                )
                .setColor("Orange"),
            ],
            ephemeral: true,
          });
        }
        const attachment = await MostCanvas.createAttacthmentParty(interaction);

        voiceChannel.permissionOverwrites.edit(targetMember, {
          Connect: true,
        });
        const tgData = await DiscordUser.findOne({
          discordId: targetMember.id,
        });
        if (tgData) {
          const privateChannel = interaction.client.channels.cache.get(
            tgData.meta?.privateChannelId
          );
          if (privateChannel) {
            privateChannel.send({
              content: `${member} has invited you to <#${voiceChannel.id}>. __Now you have free access__.`,
              files: [attachment],
            });
          } else {
            await targetMember.send({
              content: `${member} has invited you to <#${voiceChannel.id}>. __Now you have free access__.`,
              files: [attachment],
            });
          }
        } else {
          await targetMember.send({
            content: `${member} has invited you to <#${voiceChannel.id}>. __Now you have free access__.`,
            files: [attachment],
          });
        }

        return interaction.editReply({
          embeds: [embed.setDescription(`${targetMember} has been invited`)],
          ephemeral: true,
        });
      }

      return interaction.editReply({
        embeds: [
          embed
            .setDescription(
              `- ${targetMember} already has access to your party.`
            )
            .setColor("Orange"),
        ],
        ephemeral: true,
      });
      
    } catch (e) {
      interaction.editReply({
        embeds: [
          embed
            .setDescription(
              `Error, make sure the username is correct or not a bot.`
            )
            .setColor("Red"),
        ],
        ephemeral: true,
      });
    }
  },
};
