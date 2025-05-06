import axios from 'axios';
import Content from '../models/content.model.js';

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;


let isInitialized = false;

export const initializeFeed = async () => {
  if (!isInitialized) {
    await refreshFeed();
    isInitialized = true;
  }
};

export const fetchRedditPosts = async () => {
  try {
    const response = await axios.get(
      'https://www.reddit.com/r/programming/top.json?limit=10',
      {
        headers: { 
          'User-Agent': 'Community_Learning_hub/1.0.0 ',
          ...(REDDIT_CLIENT_ID && { 
            Authorization: `Basic ${Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64')}` 
          })
        },
      }
    );

    return response.data.data.children.map((post) => ({
      source: 'reddit',
      sourceId: `reddit_${post.data.id}`,
      title: post.data.title,
      preview: post.data.thumbnail || post.data.selftext.substring(0, 100),
      originalUrl: `https://reddit.com${post.data.permalink}`,
      metadata: {  
        isPremium: true,  
        unlockCost: 10,   
        upvotes: post.data.ups,
        author: post.data.author,
        subreddit: post.data.subreddit
      }
    }));
  } catch (error) {
    console.error('Reddit API Error:', error.message);
    return [];
  }
};

export const refreshFeed = async () => {
  try {
    const redditPosts = await fetchRedditPosts();

    await Promise.all(
      redditPosts.map((post) =>
        Content.updateOne(
          { sourceId: post.sourceId },
          { $setOnInsert: post },
          { upsert: true }
        )
      )
    );

    console.log(`Reddit feed updated: ${redditPosts.length} new posts`);
  } catch (error) {
    console.error('Feed refresh failed:', error.message);
  }
};