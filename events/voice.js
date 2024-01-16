const {
  Events,
  VoiceState,
  ChannelType,
  Collection,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");
const config = require("../config.json");

const voiceGenerator = require('../collections.js');
const DiscordUser = require("../models/discord_user");





module.exports = {
  name: Events.VoiceStateUpdate,
  /**
   *
   * @param {VoiceState} oldState
   * @param {VoiceState} newState
   */
  async execute(oldState, newState) {
    
    console.log("#ON VOICE CHANNEL UPDATE EVENT CALLED");
    const { member, guild } = newState;
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;     
    const embed = new EmbedBuilder().setColor("Gold"); 
     
    const joinToCreate =
      config.CHANNELS.VOICE_CHANNELS.JOIN_TO_CREATE_CHANNEL_ID;

      const partyStatusChannel = guild.channels.cache.get(
        config.CHANNELS.TEXT.PARTY_STATUS_CHANNEL_ID
      );
      const partyLogChannel = guild.client.channels.cache.get(
        config.CHANNELS.TEXT.PARTY_ANNOUNCEMENT_CHANNEL_ID
      );
      const joinToCreateChannel = guild.client.channels.cache.get(
        config.CHANNELS.VOICE_CHANNELS.JOIN_TO_CREATE_CHANNEL_ID
      );



    if (
      oldChannel !== newChannel &&
      newChannel &&
      newChannel.id === joinToCreate
    ) {
      console.log("CREATING VOICE CHANNEL");      
      const voiceChannel = await guild.channels.create({
        name: `${member.user.username}'s Party`,
        type: ChannelType.GuildVoice,
        parent: newChannel.parent,
        permissionOverwrites: [
          { id: member.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.UseApplicationCommands] },
          { id: guild.id, deny: [PermissionFlagsBits.Connect] },
        ],
        userLimit: 5,
      });


      voiceGenerator.set(member.id, voiceChannel.id);
      joinToCreateChannel.permissionOverwrites.edit(member, { Connect: false });
      //await newChannel.permissionOverwrites.edit(member, { Connect: false });
      /* setTimeout(
        () => joinToCreateChannel.permissionOverwrites.delete(member),
        30 * 1000
      ); */
      setTimeout(() => member.voice.setChannel(voiceChannel), 500)
      partyStatusChannel.send({
        embeds: [
          embed.setDescription(
            `${member} has create a new party.`
          ),
        ],
      })
      return;
    }
    if(!oldChannel){
      console.log("NON OLD CHANNEL CALLBACK")
      return;
    } 


    const ownedChannel = voiceGenerator.get(member.id); 


    if (
      ownedChannel &&
      oldChannel.id == ownedChannel &&
      (!newChannel || newChannel.id !== ownedChannel)
    ) {

        const members = oldChannel?.members
        .filter((m) => !m.user.bot)
        .map((m) => m.id);        
        
        console.log("MEMBERS #####",members); 
        
       try{

      if (members.length > 0) {
        console.log("MEMBERS LENGHT > 0")        
        let randomID = members[Math.floor(Math.random() * members.length)];
        console.log("RANDOM_ID: ", randomID, members);
        let randomMember = guild.members.cache.get(randomID);
        console.log("RANDOM_MEMBER: ",randomMember)

        randomMember.voice.setChannel(oldChannel).then((v) => {
          oldChannel
            .setName(`${randomMember?.user?.username ?? 'user'}'s Party`)
            .catch((e) => console.log(e));
          oldChannel.permissionOverwrites.edit(randomMember, {
            Connect: true,           
          });
          oldChannel.permissionOverwrites.delete(member);   
          
        });

        joinToCreateChannel.permissionOverwrites.delete(member);
        joinToCreateChannel.permissionOverwrites.edit(randomMember, { Connect: false });
        
        voiceGenerator.set(member.id, null);
        voiceGenerator.set(randomMember.id, oldChannel.id);
        partyStatusChannel.send({
          embeds: [
            embed.setDescription(
              `${member}'s party is now ${randomMember}'s.`
            ).setColor('Orange'),
          ],
        })
        

        const userData = await DiscordUser.findOne({discordId: member.id});
        if(!userData) return;
        userData.messCache.forEach(mess =>  {
          const messId = mess.messageId;
          partyLogChannel.messages.delete(messId);
        })
        await DiscordUser.findOneAndUpdate({discordId: member.id},{$set: { messCache: []}})

      } else {
        console.log("NON MEMBERS deleting channel")
        voiceGenerator.set(member.id, null);
        await oldChannel.delete().catch((e) => console.log(e));
        partyStatusChannel.send({
          embeds: [
            embed.setDescription(
              `${member}'s Party has been automatically deleted.`
            ).setColor("Red"),
          ],
        })
        joinToCreateChannel.permissionOverwrites.delete(member);
        const userData = await DiscordUser.findOne({discordId: member.id});
        if(!userData) return;
        userData.messCache.forEach(mess =>  {
          const messId = mess.messageId;
          if(partyLogChannel.messages.cache.find((v,k)=> k == messId)){
            partyLogChannel.messages.delete(messId);
          }          
        })
        await DiscordUser.findOneAndUpdate({discordId: member.id},{$set: { messCache: []}})
      }
    }catch(e){
      
    }
    }
  },
};
