const { REST, Routes } = require('discord.js');
const config = require('./config.json');

const commands = [
  {
    name: 'pannello-ticket',
    description: 'Mostra il pannello per creare un ticket',
  },
  {
    name: 'chiudi-ticket',
    description: 'Chiude il ticket corrente'
  }
];

const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Inizio della registrazione dei comandi slash...');

    await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), {
      body: commands,
    });

    console.log('Comandi slash registrati con successo.');
  } catch (error) {
    console.error(error);
  }
})();
