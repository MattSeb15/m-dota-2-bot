const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, CommandInteraction } = require("discord.js");
const config = require("../../config.json");
const SDotaApi = require("../../call-api");
const DiscordUser = require("../../models/discord_user");
const MostCanvas = require("../../app/mostcanvas");





module.exports = {
  data: new SlashCommandBuilder()
    .setName("md2")
    .setDescription("Manage your dota 2 account data!")
    .addSubcommand((sub) =>
      sub
        .setName("profile")
        .setDescription("Replies with your current linked Account Id")
        .addBooleanOption((bol) =>
          bol.setName("share").setDescription("true = public | false = private")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("matches")
        .setDescription("Provides information about x matches")
        .addNumberOption((num) =>
          num
            .setName("games-count")
            .setDescription(
              "Number of games to be returned (default 1 | min 1 | max 5)"
            )
            .setMinValue(1)
            .setMaxValue(5)
        )
        .addBooleanOption((bol) =>
          bol.setName("share").setDescription("true = public | false = private")
        )
    ),

    /**
     * 
     * @param {CommandInteraction} interaction 
     */

  async execute(interaction) {
    const user = interaction.user;
    const { options } = interaction;
    const subCommand = options.getSubcommand();
    
    switch (subCommand) {
      case "profile":
        {

          const embed = new EmbedBuilder().setColor('Green');
          await interaction.deferReply({ephemeral: true});
          const warningNoUserDataString = ":warning: You dont have an Account Id linked. Please type " +
          "`" +
          "/account {id}" +
          "` to link or update an account id to this channel.";
          const errorCreatingString = ":warning: Error creating your profile attachment, report the bug in the help channel or try later.";
          const noprofileErrorString = ":warning: Looks like something went wrong, please check if your account id is correct or try again later."
          
          try {

            let accountInfoChannel = interaction.guild.channels.cache.get(
              config.CHANNELS.TEXT.ACC_INFO_LOG_CHANNEL_ID
            );
            
            if(!accountInfoChannel) return interaction.editReply({
              embeds: [embed.setDescription('ACC_INFO_LOG_CHANNEL_ID | Channel not found or not defined').setColor('Red')],              
              ephemeral: true,
            });
            const successString = `You have shared your profile successfully, check the <#${accountInfoChannel.id}> channel`;
            const isPublic = interaction.options.getBoolean("share");   
                      

            const profileAttachment = await MostCanvas.createProfileAttachment(user.id);

            switch(profileAttachment){
              case -1:
                return interaction.editReply({              
                  ephemeral: true,
                  embeds: [embed.setDescription(errorCreatingString).setColor('Red')]
                });
              case 0:
                return interaction.editReply({              
                  ephemeral: true,
                  embeds: [embed.setDescription(warningNoUserDataString).setColor('Orange')]
                }); 
              case 1:
                return interaction.editReply({              
                  ephemeral: true,
                  embeds: [embed.setDescription(warningNoUserDataString).setColor('Orange')]
                });
              case 2:
                return interaction.editReply({              
                  ephemeral: true,
                  embeds: [embed.setDescription(noprofileErrorString).setColor('Orange')]
                });                          
            }

            if (!isPublic) return interaction.editReply({
              content: 'Profile Info:',
              files: [profileAttachment],
              ephemeral: true,
            });            
            await accountInfoChannel.send({
              content: `<@${user.id}> Has shared his profile`,
              files: [profileAttachment]
            });
            return interaction.editReply({
              embeds: [embed.setDescription(successString)],
              ephemeral: true,
            });

          } catch (e) {
            return interaction.editReply({
              embeds: [embed.setDescription(`:warning: An error has been catch, please try later.\nError: ${e}`,).setColor('Red')],
              ephemeral: true,
            });
          }
        }        
      case "matches": {
        try {
          let matchesInfoChannel = interaction.guild.channels.cache.get(
            config.CHANNELS.TEXT.ACCOUNT_MATCHES_ID
          );
          const gamesCount = interaction.options.getNumber("games-count") ?? 1;
          const isPublic = interaction.options.getBoolean("share") ?? false;
          const user = interaction.user;
          const userData = await DiscordUser.findOne({
            discordId: `${user.id}`,
          });
          await interaction.deferReply({ ephemeral: true });
          if (userData) {
            const matchesData = await SDotaApi.getMatchesData(
              `${userData.accountId}`,
              gamesCount
            );
            const steamProfile = await SDotaApi.getProfile(
              `${userData.accountId}`
            );
            if (!steamProfile) {
              await interaction.editReply({
                content: `Cant get your profile.`,
                ephemeral: true,
              });
              return;
            }
            if (!matchesData) {
              await interaction.editReply({
                content: `CANT FIND MATCH DATA`,
                ephemeral: true,
              });
              return;
            }

            let finalDataString =
              gamesCount === 1
                ? `<@${user.id}> Has shared his last game:\n\n`
                : `<@${user.id}> Has shared his last ${
                    gamesCount ?? 2
                  } games:\n\n`;
            if (matchesData) {
              const matchAttachment = await getMatchesImageAttachment(
                steamProfile,
                userData,
                matchesData
              );
              if (!matchAttachment)
                return interaction.editReply({
                  content: `No match attachment create`,
                  ephemeral: true,
                });
              let embedsList = []; ///eliminar luego

              if (isPublic) {
                await matchesInfoChannel.send({
                  content: finalDataString,
                  files: [matchAttachment],
                });
                await interaction.editReply({
                  content: `Success matches data send`,
                  ephemeral: true,
                });
                return;
              }
              await interaction.editReply({
                files: [matchAttachment],
                ephemeral: true,
              });
              return;
            }
            await interaction.editReply({
              content: `NO MATCHES DATA`,
              ephemeral: true,
            });
            return;
          }
          await interaction.editReply({
            content: `NO USER DATA ON DB`,
            ephemeral: true,
          });
        } catch (e) {
          console.log(e);
          interaction.editReply({
            content: `Error, please try later, report this bug on help.`,
            ephemeral: true,
          });
        }
      }
    }
  },
};

function getMedalImageAttachment(rank = "00") {
  const parseMedalRankInt = parseInt(rank.substring(0, 1));
  const parseStarsInt = parseInt(rank.substring(1)) - 1;
  if (parseStarsInt <= 0) {
    const getMedalData = config.MEDALS_EMBEDS[parseMedalRankInt];
    return getMedalData;
  }
  const getMedalData =
    config.MEDALS_EMBEDS[parseMedalRankInt].stars[
      parseStarsInt > 8 ? 0 : parseStarsInt
    ];
  return getMedalData;
}

function getMedalStarsEmojiString(rank = "", emoji = "") {
  const parseStarsInt = parseInt(rank.substring(1));
  if (parseStarsInt === 0) return "";
  if (parseStarsInt === 1) return `${emoji}`;
  let starString = `${emoji}`;
  for (let i = 0; i < parseStarsInt - 1; i++) {
    starString = starString.concat(` ${emoji}`);
  }
  return starString;
}

function getparseLaneObject(lane = 0, role = 0) {
  if (lane === 1 && role === 0) return config.DOTA_LANES[1]; //1
  if (lane === 2 && role === 0) return config.DOTA_LANES[2]; //2
  if (lane === 3 && role === 0) return config.DOTA_LANES[3]; //3
  if (lane === 3 && role === 1) return config.DOTA_LANES[4]; //4
  if (lane === 1 && role === 2) return config.DOTA_LANES[5]; //5
  return;
}

function getPlayerPartySize(playerId, players = []) {
  const result = players.find((e) => e.steamAccountId == playerId);
  if (!result) return 0;
  if ((!result.partyId && result.partyId !== 0) || result.partyId == undefined)
    return 0;
  const partyFinder = players.filter((e) => e.partyId == result.partyId);
  if (!partyFinder) return 0;
  return partyFinder.length;
}

async function getMatchesImageAttachment(steamProfile, userData, matchesData) {
  try {
    const numberOfMatches = matchesData.length;
    var canvas = MostCanvas.createCanvas(790, numberOfMatches * 60 + 132);
    var ctx = canvas.getContext("2d");
    ///imgs
    var winImg = await MostCanvas.loadImage("./assets/matches/win_lane.png");
    var loseImg = await MostCanvas.loadImage("./assets/matches/lose_lane.png");
    var drawImg = await MostCanvas.loadImage("./assets/matches/draw_lane.png");
    var winStompImg = await MostCanvas.loadImage(
      "./assets/matches/win_stomp_lane.png"
    );
    var loseStompImg = await MostCanvas.loadImage(
      "./assets/matches/lose_stomp_lane.png"
    );
    var winGameImg = await MostCanvas.loadImage(
      "./assets/matches/win_game.png"
    );
    var loseGameImg = await MostCanvas.loadImage(
      "./assets/matches/lose_game.png"
    );
    var plusGradiantImg = await MostCanvas.loadImage(
      "./assets/matches/plus_gradiant.png"
    );
    var lessGradiantImg = await MostCanvas.loadImage(
      "./assets/matches/less_gradiant.png"
    );
    var medalPlaceholderImg = await MostCanvas.loadImage(
      "./assets/imgs/placeholder_medal.png"
    );
    await MostCanvas.loadAndDrawImage(
      ctx,
      "./assets/matches/matchest_template_v4.png",
      0,
      0
    );

    ///tobackground variables
    const playerName = `${steamProfile.steamAccount?.name ?? "Username"}`;

    const lastMatchesString = `${numberOfMatches}`;
    //separation and radius
    const ySeparationContainer = 60;

    const xPlayerName = 780;
    const yPlayerName = 40;

    const xNumberOfMatches = 643;
    const yNumberOfMatches = 73;

    //position
    const initXpositionHeroImg = 12;
    const initYpositionHeroImg = 142;
    let yPositionHeroImage = 0;

    const ixpWL = 145;
    const iypWL = 151;
    let yPositionWL = 0;

    const ixpLane = 93;
    const iyxpLane = 151;
    let yPositionLane = 0;

    const ixpVMA = 274;
    const iypVMA = 160;
    let yPositionVMA = 0;

    const ixpWLLane = 182;
    const iypWLLane = 150;
    const iwWLLane = 41;
    const ihWLLane = 22;
    let yPositionWLLane = 0;

    const ixpImp = 375;
    const iypImp = 162;
    let yPositionImp = 0;

    const ixpImpBar = 393;
    const iypImpBar = 158;
    let yPositionImpBar = 0;

    const ixpPartySize = 627;
    const iypPartySize = 160;
    let yPositionPartySize = 0;

    const ixpMedal = 646;
    const iypMedal = 143;
    const iwMedal = 34;
    const ihMedal = 34;
    let yPositionMedal = 0;

    const ixpMatchTime = 776;
    const iypMatchTime = 154;
    let yPositionMatchTime = 0;

    const ixpMatchDate = 776;
    const iypMatchDate = 170;
    let yPositionMatchDate = 0;

    const ixpIsRanked = 574;
    const iypIsRanked = 153;
    let yPositionIsRanked = 0;

    MostCanvas.drawText(
      ctx,
      playerName,
      xPlayerName,
      yPlayerName,
      400,
      30,
      "#ffffff",
      "end",
      "middle",
      "d2font"
    );
    MostCanvas.drawText(
      ctx,
      lastMatchesString,
      xNumberOfMatches,
      yNumberOfMatches,
      400,
      30,
      "#ffffff",
      "center",
      "middle",
      "d2font"
    );

    for (let i = 0; i < numberOfMatches; i++) {
      const match = matchesData[i];
      const findPlayer = match?.players?.find(
        (val) => val?.steamAccountId == userData.accountId
      );
      if (!findPlayer) return;
      const partySize = getPlayerPartySize(
        findPlayer.steamAccountId,
        match.players
      );
      const isWinner = findPlayer.isVictory;
      const bottomLaneOutcome = match.bottomLaneOutcome;
      const midLaneOutcome = match.midLaneOutcome;
      const topLaneOutcome = match.topLaneOutcome;
      const laneOutcome = getLaneOutcome(
        findPlayer.lane,
        { bottomLaneOutcome, midLaneOutcome, topLaneOutcome },
        findPlayer.isRadiant
      );
      console.log("LANE OUTCOME ###: ", laneOutcome);
      const laneImageOutcome = getLaneOptionImage(
        laneOutcome,
        findPlayer.isRadiant,
        { winImg, loseImg, drawImg, winStompImg, loseStompImg }
      );
      const isRanked = match.lobbyType == 7 ? true : false;

      const impScore = findPlayer?.imp;
      const matchTimeString = `${Math.floor(match.durationSeconds / 60)} mins`;
      const matchDateString = SDotaApi.parseDate(match.startDateTime);
      const v = findPlayer.numKills;
      const m = findPlayer.numDeaths;
      const a = findPlayer.numAssists;

      var imgHero = await SDotaApi.getImgHeroUrlById(`${findPlayer.heroId}`);
      var laneImg = getparseLaneObject(
        findPlayer.lane,
        findPlayer.role
      ).image_url;

      var medalImg =
        SDotaApi.getMedalImageAttachment(`${match.rank}`).image_url ??
        medalPlaceholderImg;
      yPositionHeroImage =
        i === 0
          ? initYpositionHeroImg
          : yPositionHeroImage + ySeparationContainer;

      yPositionWL = i === 0 ? iypWL : yPositionWL + ySeparationContainer;

      yPositionLane = i === 0 ? iyxpLane : yPositionLane + ySeparationContainer;

      yPositionVMA = i === 0 ? iypVMA : yPositionVMA + ySeparationContainer;

      yPositionWLLane =
        i === 0 ? iypWLLane : yPositionWLLane + ySeparationContainer;

      yPositionImp = i === 0 ? iypImp : yPositionImp + ySeparationContainer;

      yPositionImpBar =
        i === 0 ? iypImpBar : yPositionImpBar + ySeparationContainer;

      yPositionPartySize =
        i === 0 ? iypPartySize : yPositionPartySize + ySeparationContainer;

      yPositionMedal =
        i === 0 ? iypMedal : yPositionMedal + ySeparationContainer;

      yPositionMatchTime =
        i === 0 ? iypMatchTime : yPositionMatchTime + ySeparationContainer;

      yPositionMatchDate =
        i === 0 ? iypMatchDate : yPositionMatchDate + ySeparationContainer;

      yPositionIsRanked =
        i === 0 ? iypIsRanked : yPositionIsRanked + ySeparationContainer;

      await MostCanvas.drawRoundedImage(
        ctx,
        imgHero,
        initXpositionHeroImg,
        yPositionHeroImage,
        68,
        40,
        5
      );
      await MostCanvas.loadAndDrawImage(
        ctx,
        laneImg,
        ixpLane,
        yPositionLane,
        22,
        22
      );
      await MostCanvas.drawImage(
        ctx,
        isWinner ? winGameImg : loseGameImg,
        ixpWL,
        yPositionWL,
        21,
        21
      );
      /*   MostCanvas.drawColoredSquareWithLetter(
      ctx,
      21,
      isWinner ? "#2acb4f" : "#ec041f",
      isWinner ? "W" : "L",
      "#000000",
      ixpWL,
      yPositionWL
    ); */
      await MostCanvas.drawImage(
        ctx,
        laneImageOutcome,
        ixpWLLane,
        yPositionWLLane,
        iwWLLane,
        ihWLLane
      );
      MostCanvas.drawVDAText(
        ctx,
        `${v}`,
        `${m}`,
        `${a}`,
        "#FFFFFF",
        12,
        ixpVMA,
        yPositionVMA
      );
      MostCanvas.drawText(
        ctx,
        impScore > 0 ? `+${impScore}` : `${impScore}`,
        ixpImp,
        yPositionImp
      );

      MostCanvas.drawImage(
        ctx,
        impScore > 0 ? plusGradiantImg : lessGradiantImg,
        impScore > 0 ? 441 : 439 - Math.floor(Math.abs(impScore) / 1.5),
        yPositionImpBar,
        Math.floor(Math.abs(impScore) / 1.5),
        8
      );
      if (!isRanked) {
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(ixpIsRanked, yPositionIsRanked, 20, 20);
      }
      MostCanvas.drawText(
        ctx,
        `${partySize}`,
        ixpPartySize,
        yPositionPartySize,
        10,
        12
      );
      if (!medalImg) {
        await MostCanvas.drawImage(
          ctx,
          medalImg,
          ixpMedal,
          yPositionMedal,
          iwMedal,
          ihMedal
        );
      } else {
        await MostCanvas.loadAndDrawImage(
          ctx,
          medalImg,
          ixpMedal,
          yPositionMedal,
          iwMedal,
          ihMedal
        );
      }

      MostCanvas.drawText(
        ctx,
        `${matchTimeString}`,
        ixpMatchTime,
        yPositionMatchTime,
        100,
        12,
        "#ffffff",
        "end"
      );
      MostCanvas.drawText(
        ctx,
        `${matchDateString}`,
        ixpMatchDate,
        yPositionMatchDate,
        100,
        10,
        "#ffffff",
        "end"
      );
    }

    const attachment = new AttachmentBuilder(await canvas.encode("png"), {
      name: `${
        steamProfile?.steamAccount?.name ?? "user"
      }-matches-resquest-img.png`,
    });

    return attachment;
  } catch (e) {
    console.log("attach error:", e);
    return;
  }

  function getLaneOutcome(
    lane = 0,
    { bottomLaneOutcome, midLaneOutcome, topLaneOutcome },
    isRadiant = true
  ) {
    /* RADIANT LANE OUTCOME:
  draw : 0
  radiant won lane : 1
  randiant won stomp lane : 2
  radiant lose lane: 3
  radiant lose stomp lane : 4 */

    /// LANE
    //1 -> SAFE LANE
    //2 -> MID LANE
    //3 -> OFF

    switch (lane) {
      case 1:
        return isRadiant ? bottomLaneOutcome : topLaneOutcome;
      case 2:
        return midLaneOutcome;
      case 3:
        return isRadiant ? topLaneOutcome : bottomLaneOutcome;
    }
  }

  function getLaneOptionImage(
    laneOutcome,
    isRadiant,
    { winImg, loseImg, drawImg, winStompImg, loseStompImg }
  ) {
    if (isRadiant) {
      console.log("RANDIANT PLAYER");

      switch (laneOutcome) {
        case 0:
          return drawImg;
        case 1:
          return winImg;
        case 2:
          return winStompImg;
        case 3:
          return loseImg;
        case 4:
          return loseStompImg;
      }
    } else {
      console.log("DIRE PLAYER");
      switch (laneOutcome) {
        case 0:
          return drawImg;
        case 1:
          return loseImg;
        case 2:
          return loseStompImg;
        case 3:
          return winImg;
        case 4:
          return winStompImg;
      }
    }
  }
}
