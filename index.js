const { Client, GatewayIntentBits, Partials, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, Events, EmbedBuilder } = require('discord.js');
const config = require('./config.json');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, () => {
  console.log(`Bot is online as ${client.user.tag}`);
});

// Gestione del comando pannello-ticket
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;

  if (interaction.isCommand()) {
    const { commandName } = interaction;

    if (commandName === 'pannello-ticket') {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Pannello ticket')
        .setDescription('Seleziona una delle opzioni per creare un ticket in una categoria specifica.')
        .setImage('https://cdn.discordapp.com/attachments/1268006208187400192/1279158851173613692/2Q.png?ex=66d36d03&is=66d21b83&hm=eb9cd1c8708d4285c7a8b57ded172a20465681693e2974c5f98e32f384666cf0&')
        .setFooter({ text: 'Supporto Ticket Bot' });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select-ticket')
          .setPlaceholder('Seleziona una categoria per creare un ticket')
          .addOptions([
            { label: 'DONAZIONI', description: 'Crea un ticket per le donazioni', value: 'DONAZIONI 💰' },
            { label: 'PARTNERSHIP', description: 'Crea un ticket per le partnership', value: 'PARTNERSHIP 🤝' },
            { label: 'CHECK SUB', description: 'Crea un ticket per verificare l\'abbonamento', value: 'CHECK SUB 📅' },
            { label: 'GENERALE', description: 'Crea un ticket per argomenti generali', value: 'GENERALE 🗣️' },
          ])
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'select-ticket') {
      const selectedOption = interaction.values[0];
      const categoryID = config.CATEGORIES[selectedOption];
      if (!categoryID) {
        return interaction.reply({ content: 'Categoria non valida selezionata.', ephemeral: true });
      }

      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${selectedOption.toLowerCase()}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: categoryID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: config.VIEW_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: config.CLOSE_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ],
      });

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Ticket Creazione')
        .setDescription(`Ciao ${interaction.user.username}, sarai presto assistito da uno staff!`)
        .addFields({ name: 'Staff', value: `<@${config.STAFF_ROLE_ID}>` }) // Assicurati di definire STAFF_ROLE_ID in config.json
        .setFooter({ text: 'Supporto Ticket Bot' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close-ticket')
            .setLabel('Chiudi 🛑')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('claim-ticket')
            .setLabel('Reclama 📩')
            .setStyle(ButtonStyle.Primary)
        );

      await ticketChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `Il tuo ticket è stato creato: ${ticketChannel}`, ephemeral: true });
    }
  } else if (interaction.isButton()) {
    if (interaction.customId === 'close-ticket') {
      if (!interaction.member.roles.cache.has(config.CLOSE_ROLE_ID)) {
        return interaction.reply({ content: 'Non hai il permesso per chiudere questo ticket.', ephemeral: true });
      }

      // Recupera i messaggi del canale
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const transcript = messages.map(msg => `${msg.author.tag}: ${msg.content}`).join('\n');

      // Salva il transcript come file .txt
      const filePath = path.join(__dirname, 'transcript.txt');
      fs.writeFileSync(filePath, transcript);

      // Invia il file nel canale dei transcript
      const transcriptChannel = await client.channels.fetch(config.TRANSCRIPT_CHANNEL_ID);
      await transcriptChannel.send({ content: `Transcript per il ticket ${interaction.channel.name}:`, files: [filePath] });

      // Rimuove il file temporaneo
      fs.unlinkSync(filePath);

      // Chiudi il canale ticket
      await interaction.reply('Chiudendo il ticket...');
      setTimeout(() => {
        interaction.channel.delete();
      }, 5000);
    } else if (interaction.customId === 'claim-ticket') {
      // Gestisci la logica per reclamare il ticket se necessario
      await interaction.reply('Ticket reclamato!');
    }
  }
});

// Gestione del benvenuto e dell'assegnazione automatica dei ruoli
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== config.GUILD_ID) return;

  // Messaggio di benvenuto
  const channelId = '1278464811583148135'; // ID del canale di benvenuto
  const channel = await client.channels.fetch(channelId);
  const embed = new EmbedBuilder()
    .setTitle('Benvenuto su TREVISO HUB!')
    .setDescription(`Ciao ${member}, Benvenuto su **Treviso Hub**🌟\n\nGuarda le nostre Partnership\n<#1278473346044002406>\n\nGrazie e buon permanenza🎉\n**||DAL TEAM DI TREVISO HUB||**`)
    .setColor(0x2f3136)
    .setThumbnail(member.user.avatarURL())
    .addFields({ name: 'Treviso Tag', value: '||<@1249676240286253140>||', inline: false });

  if (channel) {
    channel.send({ embeds: [embed] });
  } else {
    console.log(`Canale con ID ${channelId} non trovato.`);
  }

  // Assegna il ruolo automaticamente
  const role = member.guild.roles.cache.get(config.AUTOROLE_ID);
  if (role) {
    try {
      await member.roles.add(role);
      console.log(`Assegnato il ruolo "${role.name}" a ${member.user.tag}`);
    } catch (error) {
      console.error(`Impossibile assegnare il ruolo a ${member.user.tag}:`, error);
    }
  } else {
    console.error('Il ruolo con l\'ID specificato non è stato trovato.');
  }
});

client.login(config.BOT_TOKEN);


