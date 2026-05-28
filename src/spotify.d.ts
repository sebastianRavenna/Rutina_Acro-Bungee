/// <reference types="@types/spotify-web-playback-sdk" />

interface Window {
  Spotify: typeof Spotify;
  onSpotifyWebPlaybackSDKReady: () => void;
}
