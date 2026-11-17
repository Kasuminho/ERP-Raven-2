const { PrismaClient } = require('@prisma/client');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const TARGET_CHANNEL_ID = '1550143905742327878';
const prisma = new PrismaClient();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('DISCORD_BOT_TOKEN not found in .env');
    process.exit(1);
  }

  console.log('Logging in to Discord...');
  await client.login(token);

  const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
  if (!channel || !('send' in channel)) {
    console.error(`Channel ${TARGET_CHANNEL_ID} not found or not a text channel.`);
    process.exit(1);
  }

  console.log(`Connected to channel: #${channel.name} (${channel.id})`);

  // Busca os posts em aberto
  const openPosts = await prisma.itemInterestPost.findMany({
    where: {
      status: 'OPEN',
    },
    include: {
      itemCatalog: true,
      entries: {
        include: { player: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${openPosts.length} open post(s) in database.`);

  const appUrl = (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'https://app.guild-alcatraz.site').replace(/\/$/, '');

  for (const post of openPosts) {
    const item = post.itemCatalog;
    const itemName = item?.namePt || post.title;
    console.log(`Processing drop: [${post.id}] ${itemName}`);

    const closesAtDate = new Date(post.closesAt);
    const closesAtUnix = Math.floor(closesAtDate.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`🎯 DROP ABERTO: ${itemName}`)
      .setURL(`${appUrl}/dashboard/drops`)
      .setColor(0xd97706) // Dourado / Âmbar
      .setDescription(
        `**Novo drop liberado para a guilda AlcatraZ!**\n` +
        `Reaja com 🎯 ou clique no botão abaixo para manifestar seu interesse.\n` +
        `*A Staff avaliará e entregará o item estritamente com base no **Ranking de CP** dos participantes.*`
      )
      .addFields(
        { name: '🗡️ Item', value: `**${itemName}**`, inline: true },
        { name: '⚔️ Modo', value: `**${post.mode || 'PvE'}**`, inline: true },
        { name: '⏳ Encerramento', value: `<t:${closesAtUnix}:R> (<t:${closesAtUnix}:F>)`, inline: false },
        { name: '📋 Critérios / Regras', value: post.criteriaPt || 'Prioridade por Combat Power (CP) e presença confirmada nos bosses.', inline: false }
      )
      .setFooter({
        text: 'AlcatraZ ERP • Distribuição de Drops & CP',
        iconURL: `${appUrl}/favicon.ico`,
      })
      .setTimestamp();

    const imageUrl = item?.image1Url || item?.image2Url;
    if (imageUrl) {
      const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${appUrl}${imageUrl}`;
      embed.setThumbnail(fullImageUrl);
    }

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`interest:toggle:${post.id}`)
        .setLabel('🎯 Tenho Interesse')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel('🌐 Ver no Site')
        .setStyle(ButtonStyle.Link)
        .setURL(`${appUrl}/dashboard/drops`)
    );

    try {
      const message = await channel.send({
        embeds: [embed],
        components: [actionRow],
      });

      await message.react('🎯');

      await prisma.itemInterestPost.update({
        where: { id: post.id },
        data: {
          discordMessageId: message.id,
          discordChannelId: channel.id,
        },
      });

      console.log(`✅ Drop "${itemName}" publicado com sucesso no Discord! Mensagem: ${message.id}`);
    } catch (err) {
      console.error(`❌ Erro ao enviar drop "${itemName}":`, err.message);
    }
  }

  console.log('Finalizado.');
  await prisma.$disconnect();
  await client.destroy();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
