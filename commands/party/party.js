const {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  GuildMember,
} = require("discord.js");
const voiceGenerator = require("../../collections.js");
const config = require("../../config.json");
const Canvas = require("@napi-rs/canvas");

const DiscordUser = require("../../models/discord_user.js");
const SDotaApi = require("../../call-api.js");
const MostCanvas = require("../../app/mostcanvas.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("party")
    .setDescription("Control your own party")
    .addSubcommand((s) =>
      s
        .setName("invite")
        .setDescription("Invite a user to your party's channel")
        .addUserOption((op) =>
          op
            .setName("user")
            .setDescription("The user to invite")
            .setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Remove someone's access to your party's channel")
        .addUserOption((op) =>
          op
            .setName("user")
            .setDescription("The user to remove")
            .setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("public")
        .setDescription("Make your party's channel public")
        .addStringOption((op) =>
          op
            .setName("turn")
            .setDescription("Turn on or off")
            .setRequired(true)
            .addChoices(
              { name: "On", value: "on" },
              { name: "Off", value: "off" }
            )
        )
    )
    .addSubcommand((s) =>
      s
        .setName("info")
        .setDescription("Remove someone's access to your party's channel")
        .addBooleanOption((op) =>
          op
            .setName("share")
            .setDescription("Share your party info with a canvas")
        )
    ),
  /**         *
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    const { options, member, guild } = interaction;
    const subCommand = options.getSubcommand();
    const voiceChannel = member.voice.channel;
    const embed = new EmbedBuilder().setColor("Green");
    const partyLogChannel = interaction.client.channels.cache.get(
      config.CHANNELS.TEXT.PARTY_ANNOUNCEMENT_CHANNEL_ID
    );
    const partyStatusChannel = interaction.client.channels.cache.get(
      config.CHANNELS.TEXT.PARTY_STATUS_CHANNEL_ID
    );
    const waitPartyVoiceChannel = interaction.client.channels.cache.get(
      config.CHANNELS.VOICE_CHANNELS.JOINT_TO_WAIT_RESQUEST_CHANNEL_ID
    );
    const ownedChannel = voiceGenerator.get(member.id);
    const userPartyOwnerId = member.id;
    const partyExpiredTime = 300_000;
    const partyResquestExpiredTime = 300_000;

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

    const applyText = (
      canvas,
      text,
      initFontSize = 20,
      fontReducer = 10,
      containerWidth = 1000
    ) => {
      const ctx = canvas.getContext("2d");
      let fontsize = initFontSize;
      do {
        ctx.font = `${(fontsize -= fontReducer)}px d2font`;
      } while (ctx.measureText(text).width > containerWidth);
      return ctx.font;
    };

    /**
     * @param {GuildMember} user
     */
    async function createProfilePartyResquest(user) {
      const bgImgPath = "./assets/imgs/party_profile_resquest _background.png";

      const canvas = Canvas.createCanvas(1000, 1000);
      const ctx = canvas.getContext("2d");
      const background = await Canvas.loadImage(bgImgPath);
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";

      const id = user.id;
      const userData = await DiscordUser.findOne({ discordId: user.id });
      const profile = await SDotaApi.getProfile(userData?.accountId);

      const name = profile?.steamAccount?.name ?? user.user.username ?? "Name";
      const rank = profile?.steamAccount?.seasonRank ?? "00";
      const medalImage = SDotaApi.getMedalImageAttachment(`${rank}`).image_url;
      const profilePicture =
        profile?.steamAccount?.avatar ??
        user.displayAvatarURL({ extension: "png", size: "512" });

      ctx.font =
        applyText(canvas, `${name}`.toUpperCase(), 98, 2, 700) ?? `90px d2font`;
      ctx.fillText(`${name}`.toUpperCase(), canvas.width / 2, 564);
      const medalLoaded = await Canvas.loadImage(medalImage);
      ctx.drawImage(medalLoaded, 325, 600, 350, 350);

      const xprof = 330;
      const yprof = 64;

      ctx.beginPath();
      ctx.arc(canvas.width / 2, 234, 170, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const profilePicLoaded = await Canvas.loadImage(profilePicture);
      ctx.drawImage(profilePicLoaded, xprof, yprof, 340, 340);

      const attachment = new AttachmentBuilder(await canvas.encode("png"), {
        name: `${user.user.id ?? "user"}-party-resquest-img.png`,
      });

      return attachment;
    }

    switch (subCommand) {
      case "invite":
        {
          try {
            if (isNotYourVoiceChannel) {
              replyNotIsYourChannel();
              return;
            }

            const targetMember = options.getMember("user");
            if (
              targetMember.id == userPartyOwnerId &&
              isYourOwnPartyVoiceChannel
            ) {
              return interaction.reply({
                embeds: [
                  embed
                    .setDescription(
                      "You own this party, you can't INVITE yourself."
                    )
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
              const attachment = await MostCanvas.createAttacthmentParty(
                interaction
              );

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
                embeds: [
                  embed.setDescription(`${targetMember} has been invited`),
                ],
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
        }
        break;
      case "remove":
        {
          if (isNotYourVoiceChannel) {
            replyNotIsYourChannel();
            return;
          }

          const targetMember = options.getMember("user");
          await interaction.deferReply({ ephemeral: true });

          if (
            targetMember.id == userPartyOwnerId &&
            isYourOwnPartyVoiceChannel
          ) {
            return interaction.editReply({
              embeds: [
                embed
                  .setDescription(
                    `You own this party, you can't REMOVE yourself.`
                  )
                  .setColor("Orange"),
              ],
              ephemeral: true,
            });
          }

          const hasAccess = voiceChannel?.permissionOverwrites?.cache?.get(
            targetMember.id
          );

          const targetVoiceChannel = targetMember.voice?.channel;

          if (hasAccess) {
            voiceChannel.permissionOverwrites.delete(targetMember);
            console.log(
              "TARGETVOICECHANNEL:::::",
              targetVoiceChannel?.id ?? "NULOOOOOO"
            );
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
                        `- ${member} has removed you from his party.\n- Your access permissions to the party have been removed.\n- You have been removed from the Party voice channel automatically.`
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
                        `- ${member} has removed you from his party.\n- Your access permissions to the party have been removed.`
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
        }
        break;
      case "public":
        {
          if (isNotYourVoiceChannel) {
            replyNotIsYourChannel();
            return;
          }
          await interaction.deferReply({ ephemeral: true });

          const turnChoice = options.getString("turn");
          switch (turnChoice) {
            case "on":
              {
                const attachment = await MostCanvas.createAttacthmentParty(
                  interaction
                );
                voiceChannel.permissionOverwrites.edit(guild.id, {
                  Connect: null,
                });
                await interaction.editReply({
                  embeds: [
                    embed.setDescription(`The party's channel is now public.`),
                  ],
                  ephemeral: true,
                });
                const res = await partyLogChannel.send({
                  content: `${member}: My party is now public, JOIN IT:\n<#${voiceChannel.id}>`,
                  files: [attachment],
                });
                await DiscordUser.findOneAndUpdate(
                  { discordId: member.id },
                  {
                    $push: {
                      messCache: {
                        name: "public",
                        messageId: res.id,
                        channelId: res.channelId,
                      },
                    },
                  }
                );
                partyStatusChannel.send({
                  embeds: [
                    embed
                      .setDescription(
                        `${member} has changed his party to public, see it at: <#${partyLogChannel.id}>`
                      )
                      .setColor("Aqua"),
                  ],
                });
              }
              break;
            case "off":
              {
                voiceChannel.permissionOverwrites.edit(guild.id, {
                  Connect: false,
                });
                await interaction.editReply({
                  embeds: [
                    embed.setDescription(`The party's channel is now closed.`),
                  ],
                  ephemeral: true,
                });

                partyStatusChannel.send({
                  embeds: [
                    embed
                      .setDescription(`${member} has set his party to private.`)
                      .setColor("Grey"),
                  ],
                });

                const res = await DiscordUser.findOne({ discordId: member.id });
                const message = res.messCache.find((e) => e.name === "public");
                const finalList = res.messCache.filter(
                  (e) => e.name !== "public"
                );
                const messId = message.messageId;
                await partyLogChannel.messages.delete(messId);
                await DiscordUser.findOneAndUpdate(
                  { discordId: member.id },
                  { messCache: finalList }
                );
              }
              break;
          }
        }
        break;
      case "info":
        {
          await interaction.deferReply({ ephemeral: true });

          try {
            const getBoolean = options.getBoolean("share");
            if (getBoolean && isNotYourVoiceChannel)
              return interaction.editReply({
                embeds: [
                  embed
                    .setDescription("You do not own this party.")
                    .setColor("Orange"),
                ],
                ephemeral: true,
              });

            const attachment = await MostCanvas.createAttacthmentParty(
              interaction
            );

            if (getBoolean) {
              const resquestButton = new ButtonBuilder()
                .setCustomId("confirm")
                .setLabel("Request to join")
                .setStyle(ButtonStyle.Success);
              const row = new ActionRowBuilder().addComponents(resquestButton);

              const response = await partyLogChannel.send({
                content: `${member} has been shared his party.`,
                files: [attachment],
                components: [row],
              });

              await DiscordUser.findOneAndUpdate(
                { discordId: member.id },
                {
                  $push: {
                    messCache: {
                      name: "shared",
                      messageId: response.id,
                      channelId: response.channelId,
                    },
                  },
                }
              );

              await interaction.editReply({
                embeds: [
                  embed.setDescription(
                    `Your party has shared! see it at: <#${partyLogChannel.id}>`
                  ),
                ],
              });

              await partyStatusChannel.send({
                embeds: [
                  embed
                    .setDescription(
                      `${member} has started sharing their party, request to join at: <#${partyLogChannel.id}>.`
                    )
                    .setColor("Purple"),
                ],
              });

              try {
                const collector =
                  await response.createMessageComponentCollector({
                    time: partyExpiredTime,
                  });

                collector.on("collect", async (interactionCollect) => {
                  if (interactionCollect.customId === "confirm") {
                    const ownerUser =
                      interaction.guild.members.cache.get(userPartyOwnerId);
                    const utId = interactionCollect.user.id;
                    const userToInvite =
                      interaction.guild.members.cache.get(utId);
                    const ownerData = await DiscordUser.findOne({
                      discordId: ownerUser.id,
                    });
                    const userToInviteData = await DiscordUser.findOne({
                      discordId: userToInvite.id,
                    });
                    const ownerPrivateChannel =
                      interaction.guild.channels.cache.get(
                        ownerData?.meta?.privateChannelId
                      );
                    const userToInvitePrivateChannel =
                      interaction.guild.channels.cache.get(
                        userToInviteData?.meta?.privateChannelId
                      );

                    console.log("OWNER USER CHANNEL:", ownerUser);
                    console.log("USER TO INVITE PRESSED BUTTON:", userToInvite);
                    const userToInviteVoiceChannel =
                      userToInvite?.voice?.channel;
                    const ownerUserVoiceChannel = ownerUser?.voice?.channel;

                    await interactionCollect.deferReply({ ephemeral: true });

                    if (
                      userToInviteVoiceChannel?.id == ownerUserVoiceChannel?.id
                    ) {
                      return interactionCollect.editReply({
                        embeds: [
                          embed
                            .setDescription(
                              `- You are already inside the party.`
                            )
                            .setColor("Orange"),
                        ],
                        ephemeral: true,
                      });
                    }

                    if (
                      !userToInviteVoiceChannel ||
                      userToInviteVoiceChannel?.id !== waitPartyVoiceChannel?.id
                    )
                      return interactionCollect.editReply({
                        embeds: [
                          embed
                            .setDescription(
                              `- You need to connect to <#${waitPartyVoiceChannel?.id}> voice channel to send party requests.`
                            )
                            .setColor("Orange"),
                        ],
                        ephemeral: true,
                      });

                    const getExistingBoolChannel = (c) => {
                      try {
                        const channelExists =
                          interaction.guild.channels.cache.get(c);
                        if (!channelExists) return;
                        return true;
                      } catch (e) {
                        console.log("CHANNEL EXISTS?####", e);
                        return;
                      }
                    };

                    if (!getExistingBoolChannel(ownedChannel))
                      return interactionCollect.editReply({
                        embeds: [
                          embed
                            .setDescription(
                              `It seems that the party you want to join no longer exists  `
                            )
                            .setColor("Red"),
                        ],
                        ephemeral: true,
                      });

                    const toAcceptResquestButton = new ButtonBuilder()
                      .setCustomId("agree")
                      .setLabel("Agree")
                      .setStyle(ButtonStyle.Success);
                    const toDenyResquestButton = new ButtonBuilder()
                      .setCustomId("deny")
                      .setLabel("Deny")
                      .setStyle(ButtonStyle.Danger);

                    const resquestRow = new ActionRowBuilder().addComponents(
                      toAcceptResquestButton,
                      toDenyResquestButton
                    );
                    const attachment = await createProfilePartyResquest(
                      userToInvite
                    );

                    const responseResquestMessage = ownerPrivateChannel
                      ? await ownerPrivateChannel.send({
                          content: `The user ${userToInvite} has requested to join to your party.`,
                          files: [attachment],
                          components: [resquestRow],
                        })
                      : await ownerUser.send({
                          content: `This user has requested to join to your party.`,
                          files: [attachment],
                          components: [resquestRow],
                        });

                    interactionCollect.editReply({
                      embeds: [
                        embed
                          .setDescription(`Request to join send`)
                          .setColor("Green"),
                      ],
                      ephemeral: true,
                    });

                    try {
                      const resCollector =
                        responseResquestMessage.createMessageComponentCollector(
                          {
                            time: partyResquestExpiredTime,
                          }
                        );

                      let flag = -1;

                      resCollector.on("collect", async (interac) => {
                        await interac.deferReply({ ephemeral: true });

                        if (interac.customId === "agree") {
                          const ownerUser =
                            interaction.guild.members.cache.get(
                              userPartyOwnerId
                            );
                          console.log("ownerUser:", ownerUser);
                          console.log("Interac:", interac);

                          try {
                            if (!userToInviteVoiceChannel) {
                              if (userToInvitePrivateChannel) {
                                await userToInvitePrivateChannel.send({
                                  embeds: [
                                    embed
                                      .setDescription(
                                        `${ownerUser} has accepted your request to join but we cant move you to the party channel. You need to stay on the voice channel <#${waitPartyVoiceChannel?.id}>`
                                      )
                                      .setColor("Red"),
                                  ],
                                });
                              } else {
                                userToInvite.send({
                                  embeds: [
                                    embed
                                      .setDescription(
                                        `${ownerUser} has accepted your request to join BUT we cant move you to the party channel. You need to stay on the voice channel <#${waitPartyVoiceChannel?.id}>`
                                      )
                                      .setColor("Red"),
                                  ],
                                });
                              }
                            } else {
                              if (userToInvitePrivateChannel) {
                                await userToInvitePrivateChannel.send({
                                  embeds: [
                                    embed
                                      .setDescription(
                                        `${ownerUser} has accepted your request to join.\nMoving to the Party channel...`
                                      )
                                      .setColor("Green"),
                                  ],
                                });
                              } else {
                                await userToInvite.send({
                                  embeds: [
                                    embed
                                      .setDescription(
                                        `${ownerUser} has accepted your request to join.\nMoving to the Party channel...`
                                      )
                                      .setColor("Green"),
                                  ],
                                });
                              }

                              setTimeout(
                                () =>
                                  userToInvite.voice.setChannel(voiceChannel),
                                500
                              );
                            }
                          } catch (e) {
                            console.log(e);
                          }
                          flag = true;
                        } else if ((interac.customId = "deny")) {
                          if (userToInvitePrivateChannel) {
                            await userToInvitePrivateChannel.send({
                              embeds: [
                                embed
                                  .setDescription(
                                    `${ownerUser} has rejected your request to join. :(`
                                  )
                                  .setColor("Red"),
                              ],
                            });
                          } else {
                            userToInvite.send({
                              embeds: [
                                embed
                                  .setDescription(
                                    `${ownerUser} has rejected your request to join. :(`
                                  )
                                  .setColor("Red"),
                              ],
                            });
                          }
                          flag = false;
                        }

                        const contentString = `You have ${
                          flag ? "__ACCEPTED__" : "__REJECTED__"
                        } ${userToInvite} in your party.`;

                        await responseResquestMessage.edit({
                          content: contentString,
                          components: [],
                        });
                        interac.editReply({
                          embeds: [
                            embed
                              .setDescription(`Response sent successfully.`)
                              .setColor("Green"),
                          ],
                        });
                      });

                      resCollector.on("end", (interaction) => {
                        toAcceptResquestButton.setDisabled(true);
                        toDenyResquestButton.setDisabled(true);
                        if (flag === -1) {
                          responseResquestMessage.edit({
                            content: `Your time limit reached for ${userToInvite}. Limit time to accept or deny parties resquest (5 mins).`,
                            components: [resquestRow],
                          });
                        }
                      });
                    } catch (e) {
                      console.log(e);
                    }
                  }
                });

                collector.on("end", async (interaction) => {
                  if (!response)
                    return partyStatusChannel.send({
                      embeds: [
                        embed
                          .setDescription(
                            `${member} has stopped sharing his party. (Party time has expired).`
                          )
                          .setColor("DarkPurple"),
                      ],
                    });

                  resquestButton
                    .setDisabled(true)
                    .setLabel("Closed Party")
                    .setStyle(ButtonStyle.Secondary);
                  await response.delete();
                  partyStatusChannel.send({
                    embeds: [
                      embed
                        .setDescription(
                          `${member} has stopped sharing his party. (Party time has expired).`
                        )
                        .setColor("DarkPurple"),
                    ],
                  });
                });
              } catch (e) {
                await interaction.editReply({
                  content: "Error, deleted party",
                  components: [],
                });
              }
              return;
            }

            interaction.editReply({ files: [attachment] });
          } catch (e) {
            interaction.editReply({
              embeds: [
                embed
                  .setDescription(
                    `Error to share your party, try later or report your bug`
                  )
                  .setColor("DarkRed"),
              ],
            });
            console.log("PARTY CREATED INFO ERROR", e);
          }
        }
        break;
    }
  },
};
