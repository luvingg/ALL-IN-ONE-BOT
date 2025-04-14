const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const musicIcons = require('../../UI/icons/musicicons');
const cmdIcons = require('../../UI/icons/commandicons');
const { autoplayCollection } = require('../../mongodb');
const { playlistCollection } = require('../../mongodb');
const SpotifyWebApi = require('spotify-web-api-node');
const { getData } = require('spotify-url-info')(fetch);
const config = require('../../config.js');
const spotifyApi = new SpotifyWebApi({
    clientId: config.spotifyClientId,
    clientSecret: config.spotifyClientSecret,
});
module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Music player commands.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a song or playlist in the voice channel.')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Enter the song name or URL.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nowplaying')
                .setDescription('Get information about the currently playing song.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('loop')
                .setDescription('Toggle looping mode for the current track or the entire queue.')
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('Select loop mode: none, track, or queue.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Disable Loop', value: 'none' },
                            { name: 'Track Loop', value: 'track' },
                            { name: 'Queue Loop', value: 'queue' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pause')
                .setDescription('Pause the currently playing song.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resume')
                .setDescription('Resume the paused song.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shuffle')
                .setDescription('Shuffle the queue.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Skip the current song.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop the music and clear the queue.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('queue')
                .setDescription('View the current music queue.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a specific song from the queue.')
                .addIntegerOption(option =>
                    option.setName('track')
                        .setDescription('Track number to remove.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('createplaylist')
                .setDescription('Create a new playlist.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('visibility')
                        .setDescription('Choose if the playlist is public or private.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Public', value: 'public' },
                            { name: 'Private', value: 'private' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('playplaylist')
                .setDescription('Play a saved playlist.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('viewmyplaylists')
                .setDescription('View your saved playlists.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('viewmyplaylistsongs')
                .setDescription('View songs in your playlist.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('allplaylists')
                .setDescription('View all public playlists.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('deletesong')
                .setDescription('Remove a song from your playlist.')
                .addStringOption(option =>
                    option.setName('playlist')
                        .setDescription('Playlist name.')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('index')
                        .setDescription('Song index to remove.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('deleteplaylist')
                .setDescription('Delete your playlist.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('autoplay')
                .setDescription('Enable or disable autoplay.')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable autoplay.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('addsong')
                .setDescription('Add a song to a playlist.')
                .addStringOption(option =>
                    option.setName('playlist')
                        .setDescription('The playlist name.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('song')
                        .setDescription('Enter song name or URL.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('volume')
                .setDescription('Set the music volume (0-100).')
                .addIntegerOption(option =>
                    option.setName('level')
                        .setDescription('Volume level (0-100).')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            const member = interaction.member;
            const { channel } = member.voice;
            const client = interaction.client;

            // Helper function for checking voice channel
            const checkVoiceChannel = async () => {
                if (!channel) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('❌ You must be in a voice channel to use this command.');
                    
                    const reply = await interaction.editReply({ embeds: [errorEmbed] });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    return false;
                }
        
                const botVoiceChannel = interaction.guild.members.me?.voice.channel;
                
                if (botVoiceChannel && botVoiceChannel.id !== channel.id) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('❌ I\'m already playing music in another voice channel.');
                    
                    const reply = await interaction.editReply({ embeds: [errorEmbed] });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    return false;
                }
                
                // Check permissions
                const permissions = channel.permissionsFor(client.user);
                if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('❌ I need permission to connect & speak in the voice channel.');
                    
                    const reply = await interaction.editReply({ embeds: [errorEmbed] });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    return false;
                }

                return true;
            };

            // Helper function to get or create player
            const getOrCreatePlayer = async () => {
                let player = client.riffy.players.get(guildId);
                
                if (!player) {
                    try {
                        player = await client.riffy.createConnection({
                            guildId,
                            voiceChannel: channel.id,
                            textChannel: interaction.channel.id,
                            deaf: true
                        });
                    } catch (error) {
                        console.error('Error creating player:', error);
                        await interaction.editReply({ content: '❌ Failed to connect to the voice channel.' });
                        return null;
                    }
                }
                
                return player;
            };

            // Helper function to check if player exists
            const checkPlayerExists = async () => {
                const player = client.riffy.players.get(guildId);
                
                if (!player) {
                    const noPlayerEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ No Active Player')
                        .setDescription('There is no active music player in this server.\nUse `/music play` to start playing music.')
                        .setFooter({ text: 'All In One Music', iconURL: musicIcons.alertIcon });
                
                    const reply = await interaction.editReply({ embeds: [noPlayerEmbed] });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    return false;
                }
                
                
                return player;
            };

            // Handle different subcommands
            switch (subcommand) {
                case 'play': {
                    try {
                        if (!await checkVoiceChannel()) return;
                    
                        const query = interaction.options.getString('query');
                        const user = interaction.user;
                        let player = await getOrCreatePlayer();
                        if (!player) return;
                
                        // Handle Spotify links
                        // Handle Spotify links
if (query.includes('spotify.com')) {
    try {
        await interaction.editReply({ content: "🔍 Đang xử lý link Spotify..." });
        
        // Xác thực với Spotify API
        const token = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(token.body.access_token);
        
        // Lấy thông tin cơ bản từ Spotify URL
        let spotifyData;
        try {
            spotifyData = await getData(query);
            console.log(`Detected Spotify ${spotifyData.type}`);
        } catch (dataError) {
            console.error('Error getting Spotify data:', dataError);
            throw new Error(`Failed to parse Spotify URL: ${dataError.message}`);
        }
        
        let trackList = [];
        let thumbnail = null;
        
        // Xử lý theo loại nội dung Spotify
        if (spotifyData.type === 'track') {
            // Xử lý đơn track
            const searchQuery = `${spotifyData.name} - ${spotifyData.artists.map(a => a.name).join(', ')}`;
            trackList.push(searchQuery);
            console.log(`Added track: "${searchQuery}"`);
            
            // Lấy ảnh thumbnail nếu có
            if (spotifyData.album && spotifyData.album.images && spotifyData.album.images.length > 0) {
                thumbnail = spotifyData.album.images[0].url;
            }
            
        } else if (spotifyData.type === 'playlist') {
            // Xử lý playlist
            await interaction.editReply({ content: "🔍 Đang tải danh sách phát Spotify..." });
            
            try {
                // Trích xuất playlist ID
                const playlistId = query.split('/playlist/')[1].split('?')[0].split('/')[0];
                console.log(`Processing playlist ID: ${playlistId}`);
                
                // Lấy thông tin playlist
                const playlist = await spotifyApi.getPlaylist(playlistId);
                console.log(`Playlist found: ${playlist.body.name}, ${playlist.body.tracks.total} tracks`);
                
                // Lấy thumbnail nếu có
                if (playlist.body.images && playlist.body.images.length > 0) {
                    thumbnail = playlist.body.images[0].url;
                }
                
                // Lấy tất cả bài hát từ playlist (xử lý phân trang)
                let offset = 0;
                const limit = 100; // Giới hạn API của Spotify
                let hasMore = true;
                
                while (hasMore) {
                    await interaction.editReply({ 
                        content: `🔍 Đang tải danh sách phát (${trackList.length}/${playlist.body.tracks.total} bài hát)...` 
                    });
                    
                    const data = await spotifyApi.getPlaylistTracks(playlistId, { limit, offset });
                    const fetched = data.body.items
                        .filter(item => item.track) // Lọc bỏ các mục null
                        .map(item => `${item.track.name} - ${item.track.artists.map(a => a.name).join(', ')}`);
                    
                    trackList.push(...fetched);
                    offset += fetched.length;
                    
                    // Kiểm tra xem còn bài hát nữa không
                    hasMore = fetched.length === limit && offset < playlist.body.tracks.total;
                    console.log(`Fetched ${fetched.length} tracks, total so far: ${trackList.length}`);
                }
            } catch (playlistError) {
                console.error('Error processing playlist:', playlistError);
                throw new Error(`Failed to get playlist tracks: ${playlistError.message}`);
            }
            
        } else if (spotifyData.type === 'album') {
            // Xử lý album
            await interaction.editReply({ content: "🔍 Đang tải album Spotify..." });
            
            try {
                // Trích xuất album ID
                const albumId = query.split('/album/')[1].split('?')[0].split('/')[0];
                console.log(`Processing album ID: ${albumId}`);
                
                // Lấy thông tin album
                const album = await spotifyApi.getAlbum(albumId);
                console.log(`Album found: ${album.body.name}, ${album.body.total_tracks} tracks`);
                
                // Lấy thumbnail
                if (album.body.images && album.body.images.length > 0) {
                    thumbnail = album.body.images[0].url;
                }
                
                // Lấy danh sách bài hát từ album (xử lý phân trang)
                let allTracks = [];
                let offset = 0;
                const limit = 50; // Giới hạn API của Spotify
                let hasMore = true;
                
                // Lấy thông tin nghệ sĩ album để dùng khi cần
                const albumArtists = album.body.artists.map(a => a.name).join(', ');
                
                while (hasMore) {
                    const albumTracks = await spotifyApi.getAlbumTracks(albumId, { limit, offset });
                    const tracks = albumTracks.body.items;
                    
                    if (tracks.length === 0) break;
                    
                    // Tạo danh sách bài hát có định dạng "tên bài - nghệ sĩ"
                    const formattedTracks = tracks.map(track => {
                        const trackArtists = track.artists.length > 0 
                            ? track.artists.map(a => a.name).join(', ') 
                            : albumArtists;
                            
                        return `${track.name} - ${trackArtists}`;
                    });
                    
                    allTracks.push(...formattedTracks);
                    offset += tracks.length;
                    
                    // Kiểm tra xem còn bài hát không
                    hasMore = tracks.length === limit && albumTracks.body.next !== null;
                }
                
                trackList = allTracks;
                console.log(`Found ${trackList.length} tracks in album "${album.body.name}"`);
                
            } catch (albumError) {
                console.error('Failed to get album tracks:', albumError);
                
                // Xử lý các lỗi phổ biến
                if (albumError.statusCode === 404 || (albumError.body && albumError.body.error && albumError.body.error.status === 404)) {
                    throw new Error(`Album not found. It may have been removed from Spotify.`);
                } else {
                    throw new Error(`Could not fetch album tracks: ${albumError.message}`);
                }
            }
        } else {
            throw new Error(`Unsupported Spotify content type: ${spotifyData.type}`);
        }

        // Kiểm tra nếu không tìm thấy bài hát nào
        if (trackList.length === 0) {
            await interaction.editReply({ 
                content: "❌ No tracks found in this Spotify link." 
            });
            return;
        }
        
        // Giới hạn số lượng bài hát để tránh quá tải
        const MAX_TRACKS = 100;
        const originalTrackCount = trackList.length;
        if (trackList.length > MAX_TRACKS) {
            console.log(`Limiting tracks from ${trackList.length} to ${MAX_TRACKS}`);
            trackList = trackList.slice(0, MAX_TRACKS);
        }
        
        // Cập nhật trạng thái
        await interaction.editReply({ 
            content: `🎵 Đang thêm ${trackList.length} bài hát vào hàng đợi...` 
        });
        
        // Thêm các bài hát vào hàng đợi
        let added = 0;
        for (let i = 0; i < trackList.length; i++) {
            const trackQuery = trackList[i];
            
            try {
                // Cập nhật tiến độ cho người dùng mỗi 10 bài hát
                if (i > 0 && i % 10 === 0) {
                    await interaction.editReply({ 
                        content: `🎵 Đã thêm ${i}/${trackList.length} bài hát...` 
                    });
                }
                
                // Tìm kiếm và thêm bài hát
                const result = await client.riffy.resolve({ query: trackQuery, requester: user });
                if (result && result.tracks && result.tracks.length > 0) {
                    const resolvedTrack = result.tracks[0];
                    resolvedTrack.requester = {
                        id: user.id,
                        username: user.username,
                        avatarURL: user.displayAvatarURL()
                    };
                    player.queue.add(resolvedTrack);
                    added++;
                } else {
                    console.log(`Could not resolve track: "${trackQuery}"`);
                }
            } catch (resolveError) {
                console.error(`Error resolving track "${trackQuery}":`, resolveError);
                // Tiếp tục với bài hát tiếp theo
            }
        }
        
        // Chuẩn bị thông báo kết quả
        let description = `✅ Added ${added} track(s) from Spotify to the queue.`;
        
        // Thêm thông báo nếu đã giới hạn số lượng bài hát
        if (originalTrackCount > MAX_TRACKS) {
            description += `\n(Limited to ${MAX_TRACKS} out of ${originalTrackCount} tracks)`;
        }
        
        // Tạo embed thông báo thành công
        const embed = new EmbedBuilder()
            .setColor('#1DB954') // Màu xanh lá Spotify
            .setTitle(`🎵 Spotify ${spotifyData.type.charAt(0).toUpperCase() + spotifyData.type.slice(1)} Queued`)
            .setDescription(description)
            .setFooter({ text: `Requested by: ${user.username}`, iconURL: user.displayAvatarURL() });
        
        // Thêm thumbnail nếu có
        if (thumbnail) {
            embed.setThumbnail(thumbnail);
        }
        
        // Gửi thông báo thành công
        const reply = await interaction.editReply({ embeds: [embed] });
        
        // Xóa thông báo sau 5 giây
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        
        // Bắt đầu phát nhạc nếu chưa phát
        if (!player.playing && !player.paused) player.play();
        
    } catch (spotifyError) {
        console.error('Spotify error:', spotifyError);
        
        // Phân tích chi tiết lỗi
        let errorMessage = 'Failed to process Spotify link. Please check your Spotify credentials or try another link.';
        let errorDetail = '';
        
        // Xử lý các loại lỗi khác nhau
        if (spotifyError.statusCode === 404 || (spotifyError.body && spotifyError.body.error && spotifyError.body.error.status === 404)) {
            errorMessage = 'This Spotify content could not be found. It may have been removed or set to private.';
            errorDetail = 'Please check if the link is correct and the content still exists on Spotify.';
        } else if (spotifyError.statusCode === 401 || (spotifyError.body && spotifyError.body.error && spotifyError.body.error.status === 401)) {
            errorMessage = 'Authentication with Spotify failed. Please contact the bot owner.';
            errorDetail = 'The bot needs to refresh its Spotify API credentials.';
        } else if (spotifyError.statusCode === 403 || (spotifyError.body && spotifyError.body.error && spotifyError.body.error.status === 403)) {
            errorMessage = 'This Spotify content is not accessible.';
            errorDetail = 'It might be region-restricted or require premium access.';
        } else if (spotifyError.message) {
            errorDetail = spotifyError.message;
        }
        
        // Tạo embed thông báo lỗi
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Spotify Error')
            .setDescription(errorMessage);
            
        if (errorDetail) {
            errorEmbed.addFields({ name: 'Error Details', value: errorDetail });
        }
        
        errorEmbed.setFooter({ text: 'All In One Music', iconURL: musicIcons.alertIcon });
        
        // Gửi thông báo lỗi
        const reply = await interaction.editReply({ embeds: [errorEmbed] });
        setTimeout(() => reply.delete().catch(() => {}), 7000);
        return;
    }
}


                        // Handle YouTube links
                        else if (query.includes('youtube.com') || query.includes('youtu.be')) {
                            let isPlaylist = query.includes('list=');
                            let isMix = query.includes('list=RD');
                    
                            if (isMix) {
                                const mixEmbed = new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setTitle('❌ Unsupported Content')
                                    .setDescription('YouTube mixes are currently not supported.\nPlease use a different track or playlist.')
                                    .setFooter({ text: 'All In One Music', iconURL: musicIcons.alertIcon });
                            
                                const reply = await interaction.editReply({ embeds: [mixEmbed] });
                                setTimeout(() => reply.delete().catch(() => {}), 3000);
                                return;
                            }
                            
                            const resolve = await client.riffy.resolve({ query, requester: user });
                            if (!resolve || !resolve.tracks || resolve.tracks.length === 0) {
                                const noResultsEmbed = new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setTitle('❌ No Results Found')
                                    .setDescription('We couldn\'t find any tracks matching your query.\nTry modifying your search.')
                                    .setFooter({ text: 'All In One Music', iconURL: musicIcons.alertIcon });
                            
                                const reply = await interaction.editReply({ embeds: [noResultsEmbed] });
                                setTimeout(() => reply.delete().catch(() => {}), 3000);
                                return;
                            }
                            
                            if (isPlaylist) {
                                for (const track of resolve.tracks) {
                                    track.requester = {
                                        id: user.id,
                                        username: user.username,
                                        avatarURL: user.displayAvatarURL()
                                    };
                                    player.queue.add(track);
                                }
                    
                                const embed = new EmbedBuilder()
                                    .setColor('#DC92FF')
                                    .setAuthor({ name: 'Playlist Added', iconURL: musicIcons.correctIcon })
                                    .setFooter({ text: `Requested by: ${user.username}`, iconURL: user.displayAvatarURL() })
                                    .setDescription(`✅ Added  **PlayList** tracks to the queue.`);
                    
                                const reply = await interaction.editReply({ embeds: [embed] });
                                setTimeout(() => reply.delete().catch(() => {}), 3000);
                            } else {
                                const track = resolve.tracks[0];
                                track.requester = {
                                    id: user.id,
                                    username: user.username,
                                    avatarURL: user.displayAvatarURL()
                                };
                                player.queue.add(track);
                    
                                const embed = new EmbedBuilder()
                                    .setColor('#DC92FF')
                                    .setAuthor({ name: 'Track Added', iconURL: musicIcons.correctIcon })
                                    .setFooter({ text: `Requested by: ${user.username}`, iconURL: user.displayAvatarURL() })
                                    .setDescription(`🎵 Added **${track.info.title}** to the queue.`);
                    
                                const reply = await interaction.editReply({ embeds: [embed] });
                                setTimeout(() => reply.delete().catch(() => {}), 3000);
                            }
                    
                            if (!player.playing && !player.paused) player.play();
                        }
                        // Handle regular search queries
                        else {
                            const resolve = await client.riffy.resolve({ query, requester: user });
                            
                            if (!resolve || !resolve.tracks || resolve.tracks.length === 0) {
                                const noResultsEmbed = new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setTitle('❌ No Results Found')
                                    .setDescription('We couldn\'t find any tracks matching your query.\nTry modifying your search.')
                                    .setFooter({ text: 'All In One Music', iconURL: musicIcons.alertIcon });
                            
                                const reply = await interaction.editReply({ embeds: [noResultsEmbed] });
                                setTimeout(() => reply.delete().catch(() => {}), 3000);
                                return;
                            }
                
                            const track = resolve.tracks[0];
                            track.requester = {
                                id: user.id,
                                username: user.username,
                                avatarURL: user.displayAvatarURL()
                            };
                            player.queue.add(track);
                
                            const embed = new EmbedBuilder()
                                .setColor('#DC92FF')
                                .setAuthor({ name: 'Track Added', iconURL: musicIcons.correctIcon })
                                .setFooter({ text: `Requested by: ${user.username}`, iconURL: user.displayAvatarURL() })
                                .setDescription(`🎵 Added **${track.info.title}** to the queue.`);
                
                            const reply = await interaction.editReply({ embeds: [embed] });
                            setTimeout(() => reply.delete().catch(() => {}), 3000);
                
                            if (!player.playing && !player.paused) player.play();
                        }
                    } catch (error) {
                        console.error('Error resolving query:', error);
                    
                        const errorEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Error Occurred')
                            .setDescription('Something went wrong while processing your request.\n\n**Tips:**\n- Try changing the Lavalink in config.\n- Verify the track/playlist URL.')
                            .setFooter({ text: 'All In One Music', iconURL: musicIcons.alertIcon })
                            .setTimestamp();
                    
                        const reply = await interaction.editReply({ embeds: [errorEmbed] });
                    
                        setTimeout(() => {
                            reply.delete().catch(() => {});
                        }, 6000);
                    }
                    
                    break;
                }
                
                case 'nowplaying': {
                    const player = await checkPlayerExists();
                    if (!player) return;
                    
                    const currentTrack = player.current;
                    if (!currentTrack) {
                        const noTrackEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ No Track Playing')
                            .setDescription('There is no track currently playing.\nUse `/music play` to queue a song.')
                            .setFooter({ text: 'All In One Music', iconURL: musicIcons.alertIcon });
                    
                        const reply = await interaction.editReply({ embeds: [noTrackEmbed] });
                        setTimeout(() => reply.delete().catch(() => {}), 3000);
                        return;
                    }
                    
                    
                    const npEmbed = new EmbedBuilder()
                        .setColor('#DC92FF')
                        .setTitle('🎵 Now Playing')
                        .setDescription(`**[${currentTrack.info.title}](${currentTrack.info.uri})**`);
                    
                    if (currentTrack.info.artwork) {
                        npEmbed.setThumbnail(currentTrack.info.artwork);
                    }
                    
                    const reply = await interaction.editReply({ embeds: [npEmbed] });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    break;
                }

                case 'pause': {
                    const player = await checkPlayerExists();
                    if (!player) return;
                    
                    player.pause(true);
                    const reply = await interaction.editReply({ content: '⏸️ The song has been paused.' });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    break;
                }

                case 'resume': {
                    const player = await checkPlayerExists();
                    if (!player) return;
                    
                    player.pause(false);
                    const reply = await interaction.editReply({ content: '▶️ The song has been resumed.' });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    break;
                }

                case 'shuffle': {
                    const player = await checkPlayerExists();
                    if (!player) return;
                    
                    player.queue.shuffle();
                    const reply = await interaction.editReply({ content: '🔀 The queue has been shuffled.' });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    break;
                }

                case 'skip': {
                    const player = await checkPlayerExists();
                    if (!player) return;
                    
                    player.stop();
                    const reply = await interaction.editReply({ content: '⏭️ The song has been skipped.' });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    break;
                }

                case 'stop': {
                    const player = await checkPlayerExists();
                    if (!player) return;
                    
                    player.destroy();
                    const reply = await interaction.editReply({ content: '⏹️ The music has been stopped, and the queue has been cleared.' });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    break;
                }

                case 'queue': {
                    const player = await checkPlayerExists();
                    if (!player) return;
                    
                    const queue = player.queue;
                    if (!queue || queue.length === 0) {
                        await interaction.editReply({ content: '❌ The queue is empty.' });
                        return;
                    }
                    
                    // Format queue with track numbers and song titles
                    const formattedQueue = queue.map((track, i) => `${i + 1}. **${track.info.title}**`).join('\n');
                    
                    const queueEmbed = new EmbedBuilder()
                        .setColor('#DC92FF')
                        .setTitle('🎶 Current Queue')
                        .setDescription(formattedQueue);
                    
                    await interaction.editReply({ embeds: [queueEmbed] });
                    break;
                }

                case 'loop': {
                    const player = await checkPlayerExists();
                    if (!player) return;
                    
                    const mode = interaction.options.getString('mode');
                    
                    try {
                        player.setLoop(mode);
                        const reply = await interaction.editReply({ content: `🔄 Loop mode set to **${mode}**.` });
                        setTimeout(() => reply.delete().catch(() => {}), 3000);
                    } catch (error) {
                        console.error('Error setting loop mode:', error);
                        await interaction.editReply({ content: '❌ Failed to set loop mode.' });
                    }
                    break;
                }

                case 'remove': {
                    const player = await checkPlayerExists();
                    if (!player) return;
                    
                    const trackNumber = interaction.options.getInteger('track');
                    if (trackNumber < 1 || trackNumber > player.queue.length) {
                        await interaction.editReply({ content: '❌ Invalid track number.' });
                        return;
                    }
                    
                    const removedTrack = player.queue[trackNumber - 1];
                    player.queue.remove(trackNumber - 1);
                    
                    const reply = await interaction.editReply({ 
                        content: `🗑️ Removed track #${trackNumber}: **${removedTrack.info.title}** from the queue.` 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    break;
                }

                case 'volume': {
                    const player = await checkPlayerExists();
                    if (!player) return;
                    
                    const volume = interaction.options.getInteger('level');
                    if (volume < 0 || volume > 100) {
                        await interaction.editReply({ content: '❌ Volume must be between 0 and 100.' });
                        return;
                    }
                    
                    player.setVolume(volume);
                    const reply = await interaction.editReply({ content: `🔊 Volume set to **${volume}%**.` });
                    setTimeout(() => reply.delete().catch(() => {}), 3000);
                    break;
                }

                case 'createplaylist': {
                    try {
                        const name = interaction.options.getString('name');
                        const visibility = interaction.options.getString('visibility');

                        const existingPlaylist = await playlistCollection.findOne({ name, owner: userId });
                        if (existingPlaylist) {
                            await interaction.editReply({ content: `❌ A playlist with this name already exists.` });
                            return;
                        }

                        await playlistCollection.insertOne({
                            name,
                            owner: userId,
                            visibility,
                            songs: []
                        });

                        const reply = await interaction.editReply({ content: `✅ Playlist **${name}** created as **${visibility}**.` });
                        setTimeout(() => reply.delete().catch(() => {}), 3000);
                    } catch (error) {
                        console.error('Error creating playlist:', error);
                        await interaction.editReply({ content: '❌ Failed to create playlist. Please try again later.' });
                    }
                    break;
                }

                case 'playplaylist': {
                    if (!await checkVoiceChannel()) return;
                    
                    try {
                        const name = interaction.options.getString('name');
                        const playlist = await playlistCollection.findOne({ name });
                    
                        if (!playlist) {
                            await interaction.editReply({ content: `❌ Playlist **${name}** not found.` });
                            return;
                        }
                    
                        if (playlist.visibility === 'private' && playlist.owner !== userId) {
                            await interaction.editReply({ content: `❌ You do not have permission to play this private playlist.` });
                            return;
                        }
                    
                        if (playlist.songs.length === 0) {
                            await interaction.editReply({ content: `❌ This playlist is empty.` });
                            return;
                        }
                    
                        let player = await getOrCreatePlayer();
                        if (!player) return;
                    
                        // Resolve and add all songs in the playlist
                        let addedTracks = 0;
                        for (const song of playlist.songs) {
                            try {
                                const resolve = await client.riffy.resolve({ query: song, requester: interaction.user });
                    
                                if (resolve.tracks.length > 0) {
                                    const track = resolve.tracks[0];
                                    track.requester = interaction.user;
                                    player.queue.add(track);
                                    addedTracks++;
                                }
                            } catch (error) {
                                console.warn(`Failed to resolve track: ${song}`, error);
                            }
                        }
                    
                        if (addedTracks === 0) {
                            await interaction.editReply({ content: `❌ Could not resolve any valid tracks from playlist **${name}**.` });
                            return;
                        }
                    
                        const reply = await interaction.editReply({ content: `🎵 Now playing playlist **${name}** with **${addedTracks}** songs!` });
                        setTimeout(() => reply.delete().catch(() => {}), 3000);
                        
                        if (!player.playing && !player.paused) {
                            player.play();
                        }
                    } catch (error) {
                        console.error('Error playing playlist:', error);
                        await interaction.editReply({ content: '❌ Failed to play playlist. Please try again later.' });
                    }
                    break;
                }

                case 'viewmyplaylists': {
                    try {
                        const playlists = await playlistCollection.find({ owner: userId }).toArray();
                        if (playlists.length === 0) {
                            await interaction.editReply({ content: `❌ You have no saved playlists.` });
                            return;
                        }

                        const embed = new EmbedBuilder()
                            .setColor('#3498db')
                            .setTitle('🎶 Your Playlists')
                            .setDescription(playlists.map(p => `- **${p.name}** (${p.visibility})`).join('\n'));

                        await interaction.editReply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Error viewing playlists:', error);
                        await interaction.editReply({ content: '❌ Failed to retrieve playlists. Please try again later.' });
                    }
                    break;
                }

                case 'viewmyplaylistsongs': {
                    try {
                        const playlistName = interaction.options.getString('name');
                        const playlist = await playlistCollection.findOne({ name: playlistName });
            
                        if (!playlist) {
                            await interaction.editReply({ content: `❌ Playlist **${playlistName}** not found.` });
                            return;
                        }
            
                        if (playlist.visibility === 'private' && playlist.owner !== userId) {
                            await interaction.editReply({ content: `❌ You do not have permission to view this private playlist.` });
                            return;
                        }
            
                        if (playlist.songs.length === 0) {
                            await interaction.editReply({ content: `❌ This playlist is empty.` });
                            return;
                        }
            
                        const songList = playlist.songs.slice(0, 10).map((song, index) => `**${index + 1}.** ${song}`).join('\n');
            
                        const embed = new EmbedBuilder()
                            .setColor('#3498db')
                            .setTitle(`🎵 Songs in ${playlistName}`)
                            .setDescription(songList)
                            .setFooter({ text: playlist.songs.length > 10 ? `+ ${playlist.songs.length - 10} more songs...` : "End of playlist" });
            
                        await interaction.editReply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Error viewing playlist songs:', error);
                        await interaction.editReply({ content: '❌ Failed to retrieve playlist songs. Please try again later.' });
                    }
                    break;
                }

                case 'allplaylists': {
                    try {
                        const playlists = await playlistCollection.find({ visibility: 'public' }).toArray();
                        if (playlists.length === 0) {
                            await interaction.editReply({ content: `❌ No public playlists available.` });
                            return;
                        }

                        const embed = new EmbedBuilder()
                            .setColor('#2ECC71')
                            .setTitle('🌍 Public Playlists')
                            .setDescription(playlists.map(p => `- **${p.name}** (Owner: <@${p.owner}>)`).join('\n'));

                        await interaction.editReply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Error retrieving public playlists:', error);
                        await interaction.editReply({ content: '❌ Failed to retrieve public playlists. Please try again later.' });
                    }
                    break;
                }

                case 'deletesong': {
                    try {
                        const playlistName = interaction.options.getString('playlist');
                        const songIndex = interaction.options.getInteger('index') - 1; // Convert to 0-based index
                        
                        const playlist = await playlistCollection.findOne({ name: playlistName });
                        
                        if (!playlist) {
                            await interaction.editReply({ content: `❌ Playlist **${playlistName}** not found.` });
                            return;
                        }
                        
                        if (playlist.owner !== userId) {
                            await interaction.editReply({ content: '❌ You can only delete songs from your own playlists.' });
                            return;
                        }
                        
                        if (songIndex < 0 || songIndex >= playlist.songs.length) {
                            await interaction.editReply({ content: '❌ Invalid song index.' });
                            return;
                        }
                        
                        const removedSong = playlist.songs[songIndex];
                        
                        // Remove the song from the playlist
                        playlist.songs.splice(songIndex, 1);
                        
                        await playlistCollection.updateOne(
                            { name: playlistName, owner: userId },
                            { $set: { songs: playlist.songs } }
                        );
                        
                        const reply = await interaction.editReply({ content: `✅ Removed **${removedSong}** from playlist **${playlistName}**.` });
                        setTimeout(() => reply.delete().catch(() => {}), 3000);
                    } catch (error) {
                        console.error('Error deleting song from playlist:', error);
                        await interaction.editReply({ content: '❌ Failed to delete song from playlist. Please try again later.' });
                    }
                    break;
                }

                case 'deleteplaylist': {
                    try {
                        const playlistName = interaction.options.getString('name');
                        
                        const playlist = await playlistCollection.findOne({ name: playlistName });
                        
                        if (!playlist) {
                            await interaction.editReply({ content: `❌ Playlist **${playlistName}** not found.` });
                            return;
                        }
                        
                        if (playlist.owner !== userId) {
                            await interaction.editReply({ content: '❌ You can only delete your own playlists.' });
                            return;
                        }
                        
                        await playlistCollection.deleteOne({ name: playlistName, owner: userId });
                        
                        const reply = await interaction.editReply({ content: `✅ Deleted playlist **${playlistName}**.` });
                        setTimeout(() => reply.delete().catch(() => {}), 3000);
                    } catch (error) {
                        console.error('Error deleting playlist:', error);
                        await interaction.editReply({ content: '❌ Failed to delete playlist. Please try again later.' });
                    }
                    break;
                }

                case 'autoplay': {
                    if (!await checkVoiceChannel()) return;
                    
                    try {
                        const enable = interaction.options.getBoolean('enabled');
                        await autoplayCollection.updateOne(
                            { guildId },
                            { $set: { autoplay: enable } },
                            { upsert: true }
                        );
                    
                        const reply = await interaction.editReply({
                            content: `✅ Autoplay is now **${enable ? 'enabled' : 'disabled'}**.`
                        });
                    
                        setTimeout(() => reply.delete().catch(() => {}), 3000);
                        
                        // Update player if it exists
                        const player = client.riffy.players.get(guildId);
                        if (player) {
                            player.autoplay = enable;
                        }
                    } catch (error) {
                        console.error('Error setting autoplay:', error);
                        await interaction.editReply({ content: '❌ Failed to set autoplay status. Please try again later.' });
                    }
                    break;
                }

                case 'addsong': {
                    try {
                        const playlistName = interaction.options.getString('playlist');
                        const songInput = interaction.options.getString('song'); 
            
                        const playlist = await playlistCollection.findOne({ name: playlistName });
            
                        if (!playlist) {
                            await interaction.editReply({ content: `❌ Playlist **${playlistName}** not found.` });
                            return;
                        }
            
                        if (playlist.owner !== userId && playlist.visibility === 'private') {
                            await interaction.editReply({ content: `❌ You do not have permission to add songs to this private playlist.` });
                            return;
                        }
            
                        // Add song to the playlist
                        await playlistCollection.updateOne(
                            { name: playlistName },
                            { $push: { songs: songInput } }
                        );
            
                        const reply = await interaction.editReply({ content: `✅ Added **"${songInput}"** to playlist **${playlistName}**.` });
                        setTimeout(() => reply.delete().catch(() => {}), 3000);
                    } catch (error) {
                        console.error('Error adding song to playlist:', error);
                        await interaction.editReply({ content: '❌ Failed to add song to playlist. Please try again later.' });
                    }
                    break;
                }

                default:
                    await interaction.editReply({ content: `❌ Unknown subcommand: ${subcommand}` });
                    break;
            }
        } catch (error) {
            // Music command error (silent)
        
            const msg = '❌ An error occurred while executing the command. Please try again later.';
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: msg }).catch(() => {});
            } else {
                await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
            }
        }
        
    }
};
