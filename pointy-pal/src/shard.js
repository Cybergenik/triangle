import { ShardingManager } from "discord.js";

console.log(process.env.DISCORD_TOKEN);

const { ShardingManager } = require('discord.js');

const shard = new ShardingManager(`${__dirname}/index.js`, {
    token: process.env.TOKEN,
    respawn: true
});

shard.spawn(
    process.env.TOTAL_SHARD_COUNT ? Number(process.env.TOTAL_SHARD_COUNT) : 1
);

shard.on("launch", shard =>
    console.log(`Shard ${shard.id}/${shard.totalShards}`)
);