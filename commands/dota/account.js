const data = require("../../config.json");
const {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  Collection
} = require("discord.js");
const DiscordUser = require("../../models/discord_user");
const SDotaApi = require("../../call-api");
const Color = require("../../colors");

const MSteamId = require("../../app/steamid");

const MostCanvas = require("../../app/mostcanvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("account")
    .setDescription("Link or update steam id")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Control your md2bot account")
        .addStringOption((sub) =>
          sub
            .setName("steam-id")
            .setDescription("Your steam Id")
            .setRequired(true)
            .setMaxLength(17)
            .setMinLength(17)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("delete").setDescription("Delete your current linked SteamId")
    )
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Replies with your current linked SteamId")
    )
    .addSubcommand((sub) =>
      sub
        .setName("update-rank")
        .setDescription("Update your current dota 2 rank into the server")
    ),
  /** 
    @param {CommandInteraction} interaction;
    **/
  async execute(interaction) {

    const user = interaction.user;
    const noSteamIdAccString = ":warning: You dont have an Account Id linked. Please type " +
          "`" +
          "/account set steam-id:12345678901234567" +
          "` to link or update an account id to this DC.";  

    const { options } = interaction;
    const subCommand = options.getSubcommand();
    const personal_cat_id = data.CHANNELS.CATEGORIES.PERSONAL_CAT_ID;


    switch (subCommand) {
      case "set":
        {
          const embed = new EmbedBuilder().setColor("Green");
          try {
            
            await interaction.deferReply({ ephemeral: true });

            

            const steamIdFromDc = interaction.options.getString("steam-id");
            const msid = new MSteamId(`${steamIdFromDc}`);
            const msidString = msid.steam3rIdToString();

            const accId = msidString;

            const userData = await DiscordUser.findOne({
              discordId: `${user.id}`,
            });
            

            if (steamIdFromDc == userData?.sid) {
              return interaction.editReply({
                embeds: [
                  embed
                    .setDescription("That SteamId is already in your account.")
                    .setColor("Orange"),
                ],
                ephemeral: true,
              });
            }

            const profile = await SDotaApi.getProfile(accId); ///verify if this acc_id exists
            if(!profile) return interaction.editReply({              
              embeds: [embed.setDescription(`:warning: Your SteamId __${msid.sidString}__ is not VALID (Player not found), please check and try again.`).setColor('Yellow')],
              ephemeral: true,
            });             
            

            if (userData) {
              
              const res = await DiscordUser.findOneAndUpdate(
                { discordId: `${user.id}` },
                {
                  accountId: accId,
                  sid: msid.sidString,
                  rank: profile?.steamAccount?.seasonRank ?? 0,
                }
              );
              console.log(res);

              const member = interaction.member;                             
              const removeRoles = member.roles.cache.filter((v,k)=> k != data.GUILDS.LINKED_ACC_ROLE_ID && k!= data.GUILDS.EVERYONE_ROLE_ID);              
              await interaction.member.roles.remove(removeRoles);

              await addToRoleDependingAndSendMess(
                interaction,
                user,
                msid.sidString,
                `${profile?.steamAccount?.seasonRank}`,
                userData.meta?.privateChannelId
              );
               
              return interaction.editReply({
                embeds:  [embed.setDescription(`Your SteamId ||${msid.sidString}|| was updated.`).setColor('Green')],
                ephemeral: true,
              });
            }

            const privateChannel = await interaction.guild.channels.create({
              name: `your-private-${user.username}`,
              type: ChannelType.GuildAnnouncement,
              parent: personal_cat_id,
              permissionOverwrites: [
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages,PermissionFlagsBits.CreateInstantInvite]},
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: data.GUILDS.LINKED_ACC_ROLE_ID, deny: [PermissionFlagsBits.ViewChannel] },
              ],              
            });

            await privateChannel.send({embeds: [embed.setDescription(`<@${user.id}> Here you will receive notifications and invitations from the channel bot. You can only watch this channel.`).setColor('Gold')]});


            const newUser = new DiscordUser({
              discordId: `${user.id}`,
              accountId: accId,
              sid: msid.sidString,
              rank: profile?.steamAccount?.seasonRank ?? 0,
              meta: {
                privateChannelId: privateChannel.id,
              }
            });
            
            await addToRoleDependingAndSendMess(
              interaction,
              user,
              msid.sidString,
              `${profile?.steamAccount?.seasonRank}`,
              newUser.meta?.privateChannelId
            );
            await newUser.save();

            await interaction.editReply({
              embeds:  [embed.setDescription(`Your SteamId ||${msid.sidString}|| was linked to the server`).setColor('Green')],
              ephemeral: true,
            });
            

            
          } catch (e) {
            console.log(e);
          }
        }
        break;
      case "delete": {

        const embed = new EmbedBuilder().setColor("Green");

        try {

          await interaction.deferReply({ephemeral: true});
         

          const userData = await DiscordUser.findOne({
            discordId: `${user.id}`,
          });
          if (!userData) {
            return interaction.editReply({
              embeds: [
                embed
                  .setDescription(noSteamIdAccString)
                  .setColor("Orange"),
              ],
              ephemeral: true,
            });
          }      

          if(userData.meta?.privateChannelId){
            
            const privateChannel = interaction.client.channels.cache.get(
              userData.meta?.privateChannelId
            );
            await privateChannel.delete();
          }
          

          await DiscordUser.findByIdAndDelete(userData._id);
          const member = interaction.member;
          await interaction.member.roles.remove(member.roles.cache);
          

          return interaction.editReply({
            embeds: [
              embed
                .setDescription("- Your steamID has been successfully removed.\n- You have been removed from the database.\n- Your private channel has been deleted.").setColor('DarkGreen')
                ],
            ephemeral: true,
          });

        } catch (e) {

          
          return interaction.editReply({
            embeds: [
              embed
                .setDescription(`An error has occurred, try later.\nError: ${e}`)
                .setColor("Red"),
            ],
            ephemeral: true,
          });
        }



      }
      case "info": {

        const embed = new EmbedBuilder().setColor("Green");

        try {                      


          const userData = await DiscordUser.findOne({
            discordId: `${user.id}`,
          });

          if (!userData) {            
            return interaction.reply({            
              ephemeral: true,
              embeds: [embed.setColor('Orange')
              .setDescription(noSteamIdAccString)],
            });          
            
          }

          const succesString = ":link: Your current linked Account Id is: " +
          "`" +
          `${userData?.sid?? 'ID'}` +
          "`.";  

          return interaction.reply({              
            ephemeral: true,
            embeds: [embed.setDescription(succesString)],
          });

          

        } catch (e) {
          console.log(e);
          return interaction.reply({            
            ephemeral: true,
            embeds: [embed.setColor('Red').setDescription('Something is wrong, check your connection or try again later.')],
          });
        }


      }
      case "update-rank": {

        try{
        

        const embed = new EmbedBuilder().setColor("Green");

        const userData = await DiscordUser.findOne({ discordId: `${user.id}` });
        if (!userData) {
          return interaction.reply({
            embeds: [
              embed
                .setDescription(noSteamIdAccString)
                .setColor("Orange"),
            ],
            ephemeral: true,
          });
        }

        const profile = await SDotaApi.getProfile(userData.accountId);
          if (!profile)
            return interaction.reply({
              embeds: [
                embed
                  .setDescription(
                    "Profile not found, check that your current linked steam id is correct."
                  )
                  .setColor("Orange"),
              ],
              ephemeral: true,
            });

          const oldRank = userData.rank;
          const newRank = profile?.steamAccount?.seasonRank ?? 0;
          const oldRankParsed = SDotaApi.parseRank(`${oldRank}`);
          const newRankParsed = SDotaApi.parseRank(`${newRank}`);

          if (oldRankParsed.rank == newRankParsed.rank) {
            return interaction.reply({
              embeds: [
                embed
                  .setDescription(
                    "Your current rank remains the same as before\nWe only count the tier of the rank, not the stars to give you the corresponding discord role."
                  )
                  .setColor("Orange"),
              ],
              ephemeral: true,
            });
          }

          const res = await DiscordUser.findOneAndUpdate(
            { discordId: `${user.id}` },
            { rank: newRank }
          );

          if (res) {
            const member = interaction.member;           
            const removeRoles = member.roles.cache.filter((v,k)=> k != data.GUILDS.LINKED_ACC_ROLE_ID && k!= data.GUILDS.EVERYONE_ROLE_ID);            
            await interaction.member.roles.remove(removeRoles);
            await sendMessagesOnRankUpdate(interaction, user, `${newRank}`, res.meta?.privateChannelId);

              const getOldRankName = SDotaApi.getMedalImageAttachment(
                `${oldRank}`
              )?.name;
              const getNewRankName = SDotaApi.getMedalImageAttachment(
                `${newRank}`
              )?.name;

              return interaction.reply({
                embeds: [
                  embed
                    .setDescription(
                      `Updated range from ${getOldRankName} to ${getNewRankName}`
                    )
                    .setColor("Green"),
                ],
                ephemeral: true,
              });
          }

          await interaction.reply({
            embeds: [
              embed
                .setDescription("Error updating your current range on the DB")
                .setColor("Red"),
            ],
            ephemeral: true,
          });    
          
      }catch(e){
        return interaction.reply({
          embeds: [embed.setDescription("Error assigning your new role, report it to get help or try again later.").setColor("Red")],
          ephemeral: true,
        });
      }
      }
    }
  },
};

async function addToRoleDependingAndSendMess(
  interaction,
  user,
  accId,
  rank = "00",
  privateChannelId
) {

  

  const embed = new EmbedBuilder().setColor("Green");
  const getRoleInstance = SDotaApi.getMedalImageAttachment(
    `${rank.substring(0, 1)}0`
  );
  const getRoleName = getRoleInstance.name;
  const getMedalRole = data.DOTA_RANKS_ROLES_ID.find(
    (r) => r.name === getRoleName
  );
  const role = interaction.guild.roles.cache.get(
    data.GUILDS.LINKED_ACC_ROLE_ID
  );
  if (!role) {
    console.log("Error: El rol a asignar no existe.");
    return;
  }
  if (!getMedalRole) {
    console.log("Error: El rol a asignar no existe v2.");
    return;
  } 
  const privateChannel = interaction.client.channels.cache.get(
    privateChannelId
  );
  const medalRole = interaction.guild.roles.cache.get(getMedalRole.role_id);
  const roleColorInstance = new Color(medalRole.color);
  const getRoleImage = getRoleInstance.image_url;

  const hasRole = interaction.member.roles.cache.has(role.id);
  const acc_log_channel = interaction.client.channels.cache.get(
    data.CHANNELS.TEXT.ACC_LOG_CHANNEL_ID
  );
  

  const hasMedalRole = interaction.member.roles.cache.has(getMedalRole.role_id);
  const acc_medals_log_channel = interaction.client.channels.cache.get(
    data.CHANNELS.TEXT.ACC_MEDALS_LOG_GUILD_CHANNEL_ID
  );

  if (hasRole) {
    await acc_log_channel.send(
      {embeds: [embed.setDescription(`:arrows_counterclockwise: <@${user.id}> has update his SteamId.`).setColor('DarkGold')]}  
    );
    if(privateChannel){      
      privateChannel.send({embeds: [embed.setDescription(`:bell: Your __SteamId:__ ||${accId}|| has been updated. :arrows_counterclockwise:`).setColor('DarkGold')]});
    }else{
      await interaction.client.users.send(
        user.id,
        {embeds: [embed.setDescription(`:bell: Hello from M2dota Server!\n> Your __SteamId:__ ||${accId}|| has been updated. :arrows_counterclockwise:`).setColor('DarkGold')]}        
      );
    }
    
  } else {
    
    await acc_log_channel.send(
      {embeds: [embed.setDescription(`:link: <@${user.id}> has linked his SteamId.`).setColor('Gold')]}      
    );
    await interaction.member.roles.add(role);
    if(privateChannel){
      privateChannel.send({embeds: [embed.setDescription(`:bell: Your __SteamId:__ ||${accId}|| has been linked. :link:`).setColor('Gold')]});
    }else{
      await interaction.client.users.send(
        user.id,
        {embeds: [embed.setDescription(`:bell: Hello from M2dota Server!\n> Your __SteamId:__ ||${accId}|| has been linked. :link:`).setColor('Gold')]}        
      );
    }
    
  }

  if (!hasMedalRole) {
    const color = roleColorInstance.decimalNumToHexStringWeb();    
    const attachment = await MostCanvas.createMedaltoRoleAttachment(color,getRoleImage,`${user.username}`);
    await interaction.member.roles.add(medalRole);    
    await acc_medals_log_channel.send({
      content: `<@${user.id}> has been added to <@&${medalRole.id}> role.`,
      files: [attachment]
    });
    if(privateChannel){
      privateChannel.send({embeds: [embed.setDescription(`:bell: You have been assigned the role of __${getRoleName}__ correctly.`).setColor('Gold')]});
    }
  }
}

async function sendMessagesOnRankUpdate(interaction, user, rank = "00", privateChannelId) {
  const getRoleInstance = SDotaApi.getMedalImageAttachment(
    `${rank.substring(0, 1)}0`
  );
  const getRoleName = getRoleInstance.name;
  const getMedalRole = data.DOTA_RANKS_ROLES_ID.find(
    (r) => r.name === getRoleName
  );
  const role = interaction.guild.roles.cache.get(
    data.GUILDS.LINKED_ACC_ROLE_ID
  );
  if (!role) {
    console.log("Error: El rol a asignar no existe.");
    return;
  }
  if (!getMedalRole) {
    console.log("Error: El rol a asignar no existe v2.");
    return;
  } 
  const privateChannel = interaction.client.channels.cache.get(
    privateChannelId
  );
  const medalRole = interaction.guild.roles.cache.get(getMedalRole.role_id);
  const roleColorInstance = new Color(medalRole.color);
  const getRoleImage = getRoleInstance.image_url;

  const hasMedalRole = interaction.member.roles.cache.has(getMedalRole.role_id);
  const acc_medals_log_channel = interaction.client.channels.cache.get(
    data.CHANNELS.TEXT.ACC_MEDALS_LOG_GUILD_CHANNEL_ID
  );

  if (!hasMedalRole) {
    const color = roleColorInstance.decimalNumToHexStringWeb();    
    const attachment = await MostCanvas.createMedaltoRoleAttachment(color,getRoleImage,`${user.username}`);
    await interaction.member.roles.add(medalRole);
    await acc_medals_log_channel.send({
      content: `<@${user.id}> has been added to <@&${medalRole.id}> role.`,
      files: [attachment]
    });
    if(privateChannel){
      privateChannel.send({embeds: [embed.setDescription(`:bell: You have been assigned the role of __${getRoleName}__ correctly.`).setColor('Gold')]});
    }
  }
}



