const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  EmbedBuilder,
} = require("discord.js");

const voiceGenerator = require("../../collections");
const DiscordUser = require("../../models/discord_user.js");

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("Party-Remove")
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

    if (isNotYourVoiceChannel) {
      replyNotIsYourChannel();
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const targetMember = interaction.guild.members.cache.get(
      interaction.targetId
    );
    const userMember = interaction.guild.members.cache.get(interaction.user.id);

    if (targetMember.id == userPartyOwnerId && isYourOwnPartyVoiceChannel) {
      return interaction.editReply({
        embeds: [
          embed
            .setDescription(`You own this party, you can't REMOVE yourself.`)
            .setColor("Orange"),
        ],
        ephemeral: true,
      });
    }

    const hasAccess = voiceChannel?.permissionOverwrites?.cache?.get(
      targetMember.id
    );    

    if (hasAccess) {
      voiceChannel.permissionOverwrites.delete(targetMember);      
      const isOnYourParty = voiceChannel.members.get(targetMember.id);
      const targetUserData = await DiscordUser.findOne({
        discordId: targetMember.id,
      });
      const privateChannelId = targetUserData.meta?.privateChannelId;
      const privateTargetUserChannel =
        interaction.guild.channels.cache.get(privateChannelId);

      if (isOnYourParty) {
        targetMember.voice.setChannel(null);
        if (privateTargetUserChannel) {
          privateTargetUserChannel.send({
            embeds: [
              embed
                .setDescription(
                  `- ${userMember} has removed you from his party.\n- Your access permissions to the party have been removed.\n- You have been removed from the Party voice channel automatically.`
                )
                .setColor("Orange"),
            ],
          });
        }
        return interaction.editReply({
          embeds: [
            embed.setDescription(
              `- ${targetMember} has been remove from your party.\n- The access permissions to your party have been removed.\n- The user has been removed from your party voice channel automatically.`
            ),
          ],
          ephemeral: true,
        });
      } else {
        if (privateTargetUserChannel) {
          privateTargetUserChannel.send({
            embeds: [
              embed
                .setDescription(
                  `- ${userMember} has removed you from his party.\n- Your access permissions to the party have been removed.`
                )
                .setColor("Orange"),
              ,
            ],
          });
        }
        return interaction.editReply({
          embeds: [
            embed.setDescription(
              `The access permissions to your party have been removed for ${targetMember}.`
            ),
          ],
          ephemeral: true,
        });
      }
    }
    

    return interaction.editReply({
      embeds: [
        embed
          .setDescription(
            `${targetMember} does not have access to your party, please invite them first.`
          )
          .setColor("Orange"),
      ],
      ephemeral: true,
    });
  },
};
