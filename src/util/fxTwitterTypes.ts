export interface FxTweet {
    code: number;
    message: string;
    tweet: Tweet;
  }
  
  export interface Tweet {
    url: string;
    id: string;
    text: string;
    author: Author;
    replies: number;
    retweets: number;
    likes: number;
    color?: any;
    twitter_card: string;
    created_at: string;
    created_timestamp: number;
    possibly_sensitive: boolean;
    views: number;
    is_note_tweet: boolean;
    lang: string;
    replying_to?: any;
    replying_to_status?: any;
    media: Media;
    source: string;
  }
  
  export interface Media {
    all: MediaInfo[];
    videos: MediaInfo[];
  }
  
  export interface MediaInfo {
    url: string;
    thumbnail_url: string;
    duration: number;
    width: number;
    height: number;
    format: string;
    type: string;
  }
  
  export interface Author {
    id: string;
    name: string;
    screen_name: string;
    avatar_url: string;
    avatar_color?: any;
    banner_url: string;
    description: string;
    location: string;
    url: string;
    followers: number;
    following: number;
    joined: string;
    tweets: number;
    likes: number;
    website: Website;
  }
  
  export interface Website {
    url: string;
    display_url: string;
  }