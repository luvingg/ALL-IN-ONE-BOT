const { ActivityType } = require('discord.js');

module.exports = {
  ownerId: '123456789012345678',
  status: {
    rotateDefault: [
      { name: 'meomeomeo meomeo', type: ActivityType.Watching },
      { name: 'trách thôi đừng móc họ,họ sẽ đau lắm đấy', type: ActivityType.Playing },
      { name: 'để anh dạy em cách yêu', type: ActivityType.Streaming, url: 'https://discord.gg/SM2uTDjxw3' },
      { name: 'meomeomeo meomeo', type: ActivityType.Listening },
    ],
    songStatus: true
  },
  spotifyClientId: "f71a3da30e254962965ca2a89d6f74b9",
  spotifyClientSecret: "199a619d22dd4e55a4a2c1a7a3d70e63",
}
